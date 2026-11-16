import { z } from "zod";

/**
 * Contrato de Cuentas (F1 + F2 + F18, docs/specs/f1-f2-f18-cuentas.md).
 * Las claves del cable van en snake_case (ADR-0005).
 */

export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const ID_TOKEN_MAX_LENGTH = 4096;

export const EMAIL_REQUIRED_MESSAGE = "Escribe tu correo.";
export const EMAIL_INVALID_MESSAGE = "Escribe un correo válido.";
export const EMAIL_TOO_LONG_MESSAGE = "El correo puede tener hasta 254 caracteres.";
export const PASSWORD_TOO_SHORT_MESSAGE = "La contraseña debe tener al menos 8 caracteres.";
export const PASSWORD_TOO_LONG_MESSAGE = "La contraseña puede tener hasta 128 caracteres.";
export const PASSWORD_MISMATCH_MESSAGE = "Las contraseñas no coinciden.";
export const PASSWORD_REQUIRED_MESSAGE = "Escribe tu contraseña.";
export const EMAIL_TAKEN_MESSAGE = "Ya existe una cuenta con ese correo.";
const ID_TOKEN_INVALID_MESSAGE = "Revisa los datos enviados.";

/** Correo: recortado, en minúsculas, no vacío, ≤ 254 y con formato de correo (reglas 3). */
const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, EMAIL_REQUIRED_MESSAGE)
  .max(EMAIL_MAX_LENGTH, EMAIL_TOO_LONG_MESSAGE)
  .pipe(z.email(EMAIL_INVALID_MESSAGE));

/** Contraseña: 8–128 caracteres, sin recortar ni reglas de composición (regla 4). */
const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_TOO_LONG_MESSAGE);

/** `POST /api/accounts` (reglas 2–5). */
export const RegisterAccountInputSchema = z
  .object({
    email: EmailSchema,
    password: PasswordSchema,
    password_confirmation: z.string(),
  })
  .refine((input) => input.password === input.password_confirmation, {
    path: ["password_confirmation"],
    message: PASSWORD_MISMATCH_MESSAGE,
  });
export type RegisterAccountInput = z.input<typeof RegisterAccountInputSchema>;
export type RegisterAccountData = z.output<typeof RegisterAccountInputSchema>;

/** Respuesta 201 de `POST /api/accounts` (regla 7): el correo ya normalizado. */
export const RegisterAccountOutputSchema = z.object({
  email: z.string(),
});
export type RegisterAccountOutput = z.infer<typeof RegisterAccountOutputSchema>;

/** `POST /api/session` (regla 13, pendiente B1 de F0): 1–4096 caracteres. */
export const CreateSessionInputSchema = z.object({
  id_token: z.string().min(1, ID_TOKEN_INVALID_MESSAGE).max(ID_TOKEN_MAX_LENGTH, ID_TOKEN_INVALID_MESSAGE),
});
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

/** Formulario de ingreso (regla 15): solo campos no vacíos. No viaja al servidor. */
export const LoginFormSchema = z.object({
  email: z.string().trim().min(1, EMAIL_REQUIRED_MESSAGE),
  password: z.string().min(1, PASSWORD_REQUIRED_MESSAGE),
});
export type LoginFormInput = z.infer<typeof LoginFormSchema>;
