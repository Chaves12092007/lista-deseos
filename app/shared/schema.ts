import { z } from "zod";

/**
 * Contrato común (F0, docs/specs/f0-base-del-proyecto.md).
 * Forma del error en el cable: `{ error: { code, message, fields? } }`.
 */

/** Códigos de error que pueden llegar al navegador (regla 1). */
export const ErrorCodeSchema = z.enum([
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/** Campo inválido → mensaje en español. Solo aparece en los 400 (regla 2). */
export const ErrorFieldsSchema = z.record(z.string(), z.string());
export type ErrorFields = z.infer<typeof ErrorFieldsSchema>;

/** Cuerpo de toda respuesta de error (regla 2). `message` va en español y se puede mostrar. */
export const ErrorBodySchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string().min(1),
    fields: ErrorFieldsSchema.optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;
