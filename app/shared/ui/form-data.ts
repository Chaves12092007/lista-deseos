import type { ErrorFields } from "@/shared/schema";

/** Utilidades de formularios del navegador, sin dependencias de ninguna feature. */

/** Valor de texto de un campo del formulario; vacío si no existe o es un archivo. */
export function readTextField(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  if (typeof value === "string") {
    return value;
  }
  return "";
}

interface FieldIssue {
  path: PropertyKey[];
  message: string;
}

/** Primer mensaje de cada campo a partir de los problemas de Zod (misma forma que `fields` del cable). */
export function fieldErrorsFromIssues(issues: readonly FieldIssue[]): ErrorFields {
  const fields: ErrorFields = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && fields[field] === undefined) {
      fields[field] = issue.message;
    }
  }
  return fields;
}
