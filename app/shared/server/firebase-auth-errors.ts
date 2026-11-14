import { FirebaseAuthError } from "firebase-admin/auth";

/**
 * Clasificación de errores de Firebase Admin Auth (F0, regla 11, respuesta 18). Puro.
 * Solo estos códigos significan «la credencial de la persona no sirve»; cualquier otro es una falla del
 * servidor (configuración, red, Firebase caído) y debe propagarse en vez de tratarse como «sin sesión».
 */
const REJECTED_CREDENTIAL_CODES: ReadonlySet<string> = new Set([
  "auth/argument-error",
  "auth/invalid-id-token",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/session-cookie-expired",
  "auth/session-cookie-revoked",
  "auth/user-disabled",
  "auth/user-not-found",
]);

export function isRejectedCredential<T>(error: T): boolean {
  return error instanceof FirebaseAuthError && REJECTED_CREDENTIAL_CODES.has(error.code);
}
