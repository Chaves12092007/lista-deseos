import type { ErrorCode, ErrorFields } from "@/shared/schema";

/** Mensaje de todo 500: nunca expone detalles internos (F0, regla 3). */
export const INTERNAL_ERROR_MESSAGE = "Ocurrió un error inesperado. Intenta de nuevo.";

/** Error de negocio con `code` y estado HTTP fijos (F0, regla 1). Su `message` se le puede mostrar a la persona. */
export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Datos inválidos (400). `fields` mapea cada campo inválido a su mensaje en español. */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION";
  readonly status = 400;
  readonly fields?: ErrorFields;

  constructor(message: string, fields?: ErrorFields) {
    super(message);
    if (fields !== undefined) {
      this.fields = fields;
    }
  }
}

/** Sin sesión válida (401). */
export class UnauthenticatedError extends DomainError {
  readonly code = "UNAUTHENTICATED";
  readonly status = 401;

  constructor(message: string = "Inicia sesión para continuar.") {
    super(message);
  }
}

/** Sin permiso para la acción (403). */
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly status = 403;

  constructor(message: string = "No tienes permiso para hacer esto.") {
    super(message);
  }
}

/** El recurso no existe (404). */
export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly status = 404;
}

/** El recurso entra en conflicto con el estado actual (409). */
export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
  readonly status = 409;
}
