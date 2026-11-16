import { ErrorBodySchema } from "@/shared/schema";
import type { ErrorFields } from "@/shared/schema";
import type { CreateWishInput, UpdateWishInput } from "../schema";

/** Cliente de `/api/wishes` para el navegador. Nunca lanza: devuelve el resultado listo para mostrar. */

export const SAVE_FAILED_MESSAGE = "No pudimos guardar el deseo. Intenta de nuevo.";
export const UPDATE_FAILED_MESSAGE = "No pudimos actualizar el deseo. Intenta de nuevo.";
export const DELETE_FAILED_MESSAGE = "No pudimos eliminar el deseo. Intenta de nuevo.";

export type WishRequestResult = { ok: true } | { ok: false; fields: ErrorFields; message: string | null };

interface RequestSpec {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: object;
  successStatus: number;
  failureMessage: string;
}

const WISHES_ENDPOINT = "/api/wishes";
const VALIDATION_STATUS = 400;
const CONFLICT_STATUS = 409;

function failure(fields: ErrorFields, message: string | null): WishRequestResult {
  return { ok: false, fields, message };
}

/** Solo el 400 (campos o cuerpo) y el 409 (tope de 100) traen un texto pensado para la persona. */
async function readFailure(response: Response, fallback: string): Promise<WishRequestResult> {
  if (response.status !== VALIDATION_STATUS && response.status !== CONFLICT_STATUS) {
    return failure({}, fallback);
  }
  const parsed = ErrorBodySchema.safeParse(await response.json());
  if (!parsed.success) {
    return failure({}, fallback);
  }
  const fields = parsed.data.error.fields;
  if (fields !== undefined && Object.keys(fields).length > 0) {
    return failure(fields, null);
  }
  return failure({}, parsed.data.error.message);
}

async function send(spec: RequestSpec): Promise<WishRequestResult> {
  const init: RequestInit = { method: spec.method, headers: { "Content-Type": "application/json" } };
  if (spec.body !== undefined) {
    init.body = JSON.stringify(spec.body);
  }
  try {
    const response = await fetch(spec.url, init);
    if (response.status === spec.successStatus) {
      return { ok: true };
    }
    return await readFailure(response, spec.failureMessage);
  } catch {
    return failure({}, spec.failureMessage);
  }
}

function wishUrl(id: string): string {
  return `${WISHES_ENDPOINT}/${encodeURIComponent(id)}`;
}

/** F4: `POST /api/wishes` → 201. */
export function createWish(input: CreateWishInput): Promise<WishRequestResult> {
  return send({
    url: WISHES_ENDPOINT,
    method: "POST",
    body: input,
    successStatus: 201,
    failureMessage: SAVE_FAILED_MESSAGE,
  });
}

/** F6, F8, F9: `PATCH /api/wishes/[id]` → 200. */
export function updateWish(id: string, patch: UpdateWishInput): Promise<WishRequestResult> {
  return send({
    url: wishUrl(id),
    method: "PATCH",
    body: patch,
    successStatus: 200,
    failureMessage: UPDATE_FAILED_MESSAGE,
  });
}

/** F7: `DELETE /api/wishes/[id]` → 204. */
export function deleteWish(id: string): Promise<WishRequestResult> {
  return send({ url: wishUrl(id), method: "DELETE", successStatus: 204, failureMessage: DELETE_FAILED_MESSAGE });
}
