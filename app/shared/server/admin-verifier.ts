import type { Auth } from "firebase-admin/auth";
import { z } from "zod";
import { isRejectedCredential } from "./firebase-auth-errors";
import { InvalidCredentialError } from "./session";
import type { SessionVerifier } from "./session";

/**
 * Adaptador de la sesión con Firebase Admin Auth (F0, reglas 11 y 30). Puro: recibe cómo obtener el cliente.
 * `getAuth()` se llama en cada operación, nunca al crear el verificador (sin operación no se toca Firebase).
 */

/** Las tres operaciones de Firebase Admin Auth que usa la sesión. */
export type AdminAuthPort = Pick<Auth, "verifyIdToken" | "createSessionCookie" | "verifySessionCookie">;

/**
 * Ejecuta una llamada al Admin SDK: credencial rechazada → `InvalidCredentialError`; cualquier otra falla
 * (entorno inválido, red, Firebase caído) se relanza como el mismo objeto.
 */
async function guardCredential<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (isRejectedCredential(error)) {
      throw new InvalidCredentialError();
    }
    throw error;
  }
}

const BASE64URL_PART = /^[A-Za-z0-9_-]+$/;
const JsonObjectSchema = z.record(z.string(), z.json());

/** La parte decodificada es JSON y además un objeto plano (no `null`, lista, texto ni número). */
function decodesToJsonObject(part: string): boolean {
  const text = Buffer.from(part, "base64url").toString("utf8");
  try {
    return JsonObjectSchema.safeParse(JSON.parse(text)).success;
  } catch {
    return false;
  }
}

/**
 * Forma de JWT (regla 11, hallazgo R1): 3 partes; cabecera y payload base64url no vacías que decodifican a un
 * objeto JSON. Con otra forma el SDK lanza `SyntaxError`/`TypeError` en vez de `FirebaseAuthError`.
 * La firma puede estar vacía: el Auth Emulator emite tokens sin firmar (`alg: "none"`, `cabecera.payload.`).
 * En producción el SDK los rechaza con `FirebaseAuthError` (credencial rechazada), así que no abre nada.
 */
export function hasJwtShape(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [header = "", payload = "", signature = ""] = parts;
  if (!BASE64URL_PART.test(header) || !BASE64URL_PART.test(payload)) {
    return false;
  }
  if (signature !== "" && !BASE64URL_PART.test(signature)) {
    return false;
  }
  return decodesToJsonObject(header) && decodesToJsonObject(payload);
}

/** Sin forma de JWT → `InvalidCredentialError` sin tocar Firebase; si no, la llamada protegida. */
async function verifyShaped<T>(token: string, call: () => Promise<T>): Promise<T> {
  if (!hasJwtShape(token)) {
    throw new InvalidCredentialError();
  }
  return guardCredential(call);
}

export function createAdminVerifier(getAuth: () => AdminAuthPort): SessionVerifier {
  return {
    verifyIdToken: (idToken) => verifyShaped(idToken, () => getAuth().verifyIdToken(idToken)),
    createSessionCookie: (idToken, options) =>
      verifyShaped(idToken, () => getAuth().createSessionCookie(idToken, options)),
    verifySessionCookie: (cookie, checkRevoked) =>
      verifyShaped(cookie, () => getAuth().verifySessionCookie(cookie, checkRevoked)),
  };
}
