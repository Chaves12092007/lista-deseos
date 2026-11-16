import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  CreateSessionInputSchema,
  EMAIL_INVALID_MESSAGE,
  EMAIL_REQUIRED_MESSAGE,
  EMAIL_TOO_LONG_MESSAGE,
  LoginFormSchema,
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_REQUIRED_MESSAGE,
  PASSWORD_TOO_LONG_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  RegisterAccountInputSchema,
  RegisterAccountOutputSchema,
} from "@/features/accounts/schema";

/** Correo válido de exactamente `length` caracteres: parte local de 64 + "@" + dominio con etiquetas ≤ 63. */
function emailOfLength(length: number): string {
  const local = "a".repeat(64);
  const fixed = `${local}@${"b".repeat(63)}.${"c".repeat(63)}.`;
  const lastLabelLength = length - fixed.length - ".com".length;
  return `${fixed}${"d".repeat(lastLabelLength)}.com`;
}

function registration(overrides: { email?: string; password?: string; password_confirmation?: string }) {
  const password = overrides.password ?? "12345678";
  return {
    email: overrides.email ?? "ana@x.com",
    password,
    password_confirmation: overrides.password_confirmation ?? password,
  };
}

/** Mensajes de error del campo indicado (ruta unida con «.»). */
function messagesFor<T>(result: z.ZodSafeParseResult<T>, field: string): string[] {
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path.map((part) => String(part)).join(".") === field)
    .map((issue) => issue.message);
}

describe("Registro: contraseña (regla 4)", () => {
  it.each([
    { length: 7, ok: false },
    { length: 8, ok: true },
    { length: 128, ok: true },
    { length: 129, ok: false },
  ])("una contraseña de $length caracteres se acepta: $ok", ({ length, ok }) => {
    const result = RegisterAccountInputSchema.safeParse(registration({ password: "x".repeat(length) }));
    expect(result.success).toBe(ok);
  });

  it("una contraseña de 7 caracteres da el mensaje de mínimo en el campo password", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ password: "1234567" }));
    expect(messagesFor(result, "password")[0]).toBe(PASSWORD_TOO_SHORT_MESSAGE);
  });

  it("una contraseña de 129 caracteres da el mensaje de máximo en el campo password", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ password: "x".repeat(129) }));
    expect(messagesFor(result, "password")[0]).toBe(PASSWORD_TOO_LONG_MESSAGE);
  });

  it("« 1234567» (8 con el espacio) se acepta tal cual, sin recortar", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ password: " 1234567" }));
    expect(result.success).toBe(true);
    expect(result.data?.password).toBe(" 1234567");
  });

  it("no exige reglas de composición: ocho letras iguales sirven", () => {
    expect(RegisterAccountInputSchema.safeParse(registration({ password: "aaaaaaaa" })).success).toBe(true);
  });
});

describe("Registro: correo (regla 3)", () => {
  it("el ayudante arma correos del largo pedido", () => {
    expect(emailOfLength(254)).toHaveLength(254);
    expect(emailOfLength(255)).toHaveLength(255);
  });

  it("un correo de 254 caracteres se acepta", () => {
    expect(RegisterAccountInputSchema.safeParse(registration({ email: emailOfLength(254) })).success).toBe(true);
  });

  it("un correo de 255 caracteres se rechaza con el mensaje de largo", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ email: emailOfLength(255) }));
    expect(result.success).toBe(false);
    expect(messagesFor(result, "email")[0]).toBe(EMAIL_TOO_LONG_MESSAGE);
  });

  it("el largo se mide después de recortar: 254 con espacios alrededor se acepta", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ email: `  ${emailOfLength(254)}  ` }));
    expect(result.success).toBe(true);
  });

  it.each(["", "   "])("un correo vacío o solo con espacios (%j) pide escribir el correo", (email) => {
    const result = RegisterAccountInputSchema.safeParse(registration({ email }));
    expect(result.success).toBe(false);
    expect(messagesFor(result, "email")[0]).toBe(EMAIL_REQUIRED_MESSAGE);
  });

  it("«ana@» pide un correo válido", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ email: "ana@" }));
    expect(result.success).toBe(false);
    expect(messagesFor(result, "email")[0]).toBe(EMAIL_INVALID_MESSAGE);
  });

  it("«  Ana@X.com » se guarda recortado y en minúsculas como «ana@x.com»", () => {
    const result = RegisterAccountInputSchema.safeParse(registration({ email: "  Ana@X.com " }));
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("ana@x.com");
  });
});

describe("Registro: confirmación de contraseña (regla 5)", () => {
  it("una confirmación distinta marca password_confirmation con «Las contraseñas no coinciden.»", () => {
    const result = RegisterAccountInputSchema.safeParse(
      registration({ password: "12345678", password_confirmation: "12345679" }),
    );
    expect(result.success).toBe(false);
    expect(messagesFor(result, "password_confirmation")).toEqual([PASSWORD_MISMATCH_MESSAGE]);
  });

  it("la confirmación se compara exacta: un espacio de más ya no coincide", () => {
    const result = RegisterAccountInputSchema.safeParse(
      registration({ password: "12345678", password_confirmation: "12345678 " }),
    );
    expect(messagesFor(result, "password_confirmation")).toEqual([PASSWORD_MISMATCH_MESSAGE]);
  });

  it("una confirmación igual se acepta", () => {
    expect(RegisterAccountInputSchema.safeParse(registration({})).success).toBe(true);
  });
});

describe("Registro: respuesta (regla 7)", () => {
  it("la respuesta solo lleva el correo", () => {
    expect(RegisterAccountOutputSchema.parse({ email: "ana@x.com" })).toEqual({ email: "ana@x.com" });
  });

  it("la respuesta no deja pasar la contraseña", () => {
    const parsed = RegisterAccountOutputSchema.parse({ email: "ana@x.com", password: "12345678" });
    expect(parsed).not.toHaveProperty("password");
  });
});

describe("Ingreso: id_token (regla 13)", () => {
  it.each([
    { length: 0, ok: false },
    { length: 1, ok: true },
    { length: 4096, ok: true },
    { length: 4097, ok: false },
  ])("un id_token de $length caracteres se acepta: $ok", ({ length, ok }) => {
    expect(CreateSessionInputSchema.safeParse({ id_token: "t".repeat(length) }).success).toBe(ok);
  });

  it("un id_token que no es texto se rechaza en el campo id_token", () => {
    const result = CreateSessionInputSchema.safeParse({ id_token: 1 });
    expect(result.success).toBe(false);
    expect(messagesFor(result, "id_token").length).toBeGreaterThan(0);
  });

  it("sin id_token se rechaza", () => {
    expect(CreateSessionInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("Formulario de ingreso (regla 15)", () => {
  it("con correo y contraseña vacíos pide escribir ambos", () => {
    const result = LoginFormSchema.safeParse({ email: "", password: "" });
    expect(messagesFor(result, "email")[0]).toBe(EMAIL_REQUIRED_MESSAGE);
    expect(messagesFor(result, "password")[0]).toBe(PASSWORD_REQUIRED_MESSAGE);
  });

  it("un correo solo con espacios cuenta como vacío", () => {
    const result = LoginFormSchema.safeParse({ email: "   ", password: "x" });
    expect(messagesFor(result, "email")[0]).toBe(EMAIL_REQUIRED_MESSAGE);
  });

  it("no aplica las reglas de largo ni de formato del registro", () => {
    expect(LoginFormSchema.safeParse({ email: "ana", password: "1" }).success).toBe(true);
  });
});
