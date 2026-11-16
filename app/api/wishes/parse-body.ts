import type { z } from "zod";
import { ValidationError } from "@/shared/server/errors";
import { rejectInvalidJson } from "@/shared/server/http";

/** Mismo texto que el 400 por JSON roto (`rejectInvalidJson`). */
const GENERAL_MESSAGE = "Revisa los datos enviados.";

/**
 * Lee y valida el cuerpo JSON con el esquema. Un fallo por campo sale como `ZodError` (la ruta lo traduce a
 * `fields`); un fallo del cuerpo entero (no es un objeto, trae campos desconocidos o un `PATCH` vacío) sale como
 * 400 con mensaje general y sin `fields` (spec, reglas 6 y 23).
 */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const result = schema.safeParse(await request.json().catch(rejectInvalidJson));
  if (result.success) {
    return result.data;
  }
  if (result.error.issues.every((issue) => issue.path.length === 0)) {
    throw new ValidationError(GENERAL_MESSAGE);
  }
  throw result.error;
}
