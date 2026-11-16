/**
 * Traduce los códigos de error de Firebase Auth al ingresar a mensajes para la persona
 * (regla 14 de docs/specs/f1-f2-f18-cuentas.md).
 */

export const LOGIN_INVALID_MESSAGE = "Correo o contraseña incorrectos.";
export const LOGIN_TOO_MANY_MESSAGE = "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
export const LOGIN_FAILED_MESSAGE = "No pudimos iniciar sesión. Intenta de nuevo.";

const INVALID_CREDENTIAL_CODES: ReadonlySet<string> = new Set([
  "auth/invalid-credential",
  "auth/user-not-found",
  "auth/wrong-password",
  "auth/invalid-email",
  "auth/user-disabled",
]);

const TOO_MANY_REQUESTS_CODE = "auth/too-many-requests";

export function loginErrorMessage(code: string): string {
  if (INVALID_CREDENTIAL_CODES.has(code)) {
    return LOGIN_INVALID_MESSAGE;
  }
  if (code === TOO_MANY_REQUESTS_CODE) {
    return LOGIN_TOO_MANY_MESSAGE;
  }
  return LOGIN_FAILED_MESSAGE;
}
