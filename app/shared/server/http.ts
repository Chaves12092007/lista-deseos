import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import type { ErrorBody, ErrorFields } from "@/shared/schema";
import { DomainError, ForbiddenError, INTERNAL_ERROR_MESSAGE, ValidationError } from "./errors";

const VALIDATION_MESSAGE = "Revisa los datos enviados.";
const ROOT_FIELD = "_";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function jsonError(status: number, body: ErrorBody): Response {
  return Response.json(body, { status });
}

/** Ruta del campo unida con `.` → primer mensaje de ese campo; sin ruta → `_` (F0, regla 4). */
function zodFields(error: ZodError): ErrorFields {
  const fields: ErrorFields = {};
  for (const issue of error.issues) {
    let key = issue.path.map((part) => String(part)).join(".");
    if (key === "") {
      key = ROOT_FIELD;
    }
    if (!(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

function domainErrorResponse(error: DomainError): Response {
  const body: ErrorBody = { error: { code: error.code, message: error.message } };
  if (error instanceof ValidationError && error.fields !== undefined && Object.keys(error.fields).length > 0) {
    body.error.fields = error.fields;
  }
  return jsonError(error.status, body);
}

/**
 * Traduce cualquier error lanzado a una respuesta HTTP con la forma del contrato (F0, reglas 1–5).
 * Re-lanza los errores internos de Next (`notFound()`, `redirect()`…) antes de manejar nada.
 */
export function toErrorResponse<T>(error: T): Response {
  unstable_rethrow(error);
  if (error instanceof DomainError) {
    return domainErrorResponse(error);
  }
  if (error instanceof ZodError) {
    return jsonError(400, { error: { code: "VALIDATION", message: VALIDATION_MESSAGE, fields: zodFields(error) } });
  }
  return jsonError(500, { error: { code: "INTERNAL", message: INTERNAL_ERROR_MESSAGE } });
}

/**
 * En métodos que cambian datos, exige que el `Origin` sea el mismo origen (esquema, host y puerto) que la
 * petición (F0, reglas 6 y 7). Lanza `ForbiddenError` si falta, no es una URL o es de otro origen.
 */
export function assertSameOrigin(request: Request): void {
  if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) {
    return;
  }
  const origin = request.headers.get("origin");
  if (origin === null || !URL.canParse(origin)) {
    throw new ForbiddenError();
  }
  if (new URL(origin).origin !== new URL(request.url).origin) {
    throw new ForbiddenError();
  }
}
