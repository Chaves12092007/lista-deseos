import { describe, expect, it } from "vitest";
import {
  LOGIN_FAILED_MESSAGE,
  LOGIN_INVALID_MESSAGE,
  LOGIN_TOO_MANY_MESSAGE,
  loginErrorMessage,
} from "@/features/accounts/ui/login-error-message";

describe("Mensajes de error al ingresar (regla 14)", () => {
  it("los textos son los acordados en la spec", () => {
    expect(LOGIN_INVALID_MESSAGE).toBe("Correo o contraseña incorrectos.");
    expect(LOGIN_TOO_MANY_MESSAGE).toBe("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
    expect(LOGIN_FAILED_MESSAGE).toBe("No pudimos iniciar sesión. Intenta de nuevo.");
  });

  it.each([
    "auth/invalid-credential",
    "auth/user-not-found",
    "auth/wrong-password",
    "auth/invalid-email",
    "auth/user-disabled",
  ])("%s dice «Correo o contraseña incorrectos.»", (code) => {
    expect(loginErrorMessage(code)).toBe(LOGIN_INVALID_MESSAGE);
  });

  it("auth/too-many-requests pide esperar unos minutos", () => {
    expect(loginErrorMessage("auth/too-many-requests")).toBe(LOGIN_TOO_MANY_MESSAGE);
  });

  it.each(["auth/network-request-failed", "auth/internal-error", "desconocido", ""])(
    "cualquier otro código (%j) da el mensaje genérico",
    (code) => {
      expect(loginErrorMessage(code)).toBe(LOGIN_FAILED_MESSAGE);
    },
  );
});
