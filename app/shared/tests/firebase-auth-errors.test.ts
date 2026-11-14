import { FirebaseAuthError } from "firebase-admin/auth";
import { describe, expect, it } from "vitest";
import { isRejectedCredential } from "@/shared/server/firebase-auth-errors";

/** `FirebaseAuthError` agrega el prefijo `auth/` al código: se construye con el código sin prefijo. */
function authError(codeWithoutPrefix: string): FirebaseAuthError {
  return new FirebaseAuthError({ code: codeWithoutPrefix, message: "Credencial de prueba" });
}

const REJECTED_CREDENTIAL_CODES = [
  "argument-error",
  "invalid-id-token",
  "id-token-expired",
  "id-token-revoked",
  "session-cookie-expired",
  "session-cookie-revoked",
  "user-disabled",
  "user-not-found",
];

describe("Clasificación de errores de Firebase Auth (regla 11, respuesta 18)", () => {
  it("el doble de FirebaseAuthError queda con el código completo auth/…", () => {
    expect(authError("id-token-expired").code).toBe("auth/id-token-expired");
  });

  it.each(REJECTED_CREDENTIAL_CODES)("un FirebaseAuthError auth/%s es una credencial rechazada", (code) => {
    expect(isRejectedCredential(authError(code))).toBe(true);
  });

  it("auth/invalid-session-cookie-duration es un error del servidor, no una credencial rechazada", () => {
    expect(isRejectedCredential(authError("invalid-session-cookie-duration"))).toBe(false);
  });

  it("un FirebaseAuthError interno (auth/internal-error) no es una credencial rechazada", () => {
    expect(isRejectedCredential(authError("internal-error"))).toBe(false);
  });

  it("un Error común no es una credencial rechazada", () => {
    expect(isRejectedCredential(new Error("auth/id-token-expired"))).toBe(false);
  });

  it("un texto no es una credencial rechazada", () => {
    expect(isRejectedCredential("auth/id-token-expired")).toBe(false);
  });

  it("null no es una credencial rechazada", () => {
    expect(isRejectedCredential(null)).toBe(false);
  });

  it("un objeto plano con un código de credencial rechazada no cuenta si no es FirebaseAuthError", () => {
    expect(isRejectedCredential({ code: "auth/id-token-expired" })).toBe(false);
  });
});
