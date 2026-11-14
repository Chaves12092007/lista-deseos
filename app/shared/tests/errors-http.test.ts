import { notFound, redirect } from "next/navigation";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErrorBodySchema } from "@/shared/schema";
import {
  ConflictError,
  ForbiddenError,
  INTERNAL_ERROR_MESSAGE,
  NotFoundError,
  UnauthenticatedError,
  ValidationError,
} from "@/shared/server/errors";
import { toErrorResponse } from "@/shared/server/http";

const GENERIC_INTERNAL_MESSAGE = "Ocurrió un error inesperado. Intenta de nuevo.";

/** Lee la respuesta una sola vez: el texto crudo (para buscar fugas) y el JSON (para comparar). */
async function readResponse(response: Response) {
  const text = await response.text();
  const json = z.json().parse(JSON.parse(text));
  const body = ErrorBodySchema.parse(json);
  return { text, json, body };
}

/** Traduce el `ZodError` que produce un esquema con un valor literal inválido. */
function translateZodFailure<T>(schema: z.ZodType<T>, value: string | number | object) {
  const result = schema.safeParse(value);
  expect(result.success).toBe(false);
  return toErrorResponse(result.error);
}

describe("Errores de dominio → HTTP (reglas 1–3)", () => {
  const cases = [
    { name: "ValidationError", error: new ValidationError("Datos inválidos"), status: 400, code: "VALIDATION" },
    { name: "UnauthenticatedError", error: new UnauthenticatedError(), status: 401, code: "UNAUTHENTICATED" },
    { name: "ForbiddenError", error: new ForbiddenError(), status: 403, code: "FORBIDDEN" },
    { name: "NotFoundError", error: new NotFoundError("No existe"), status: 404, code: "NOT_FOUND" },
    { name: "ConflictError", error: new ConflictError("Ya existe"), status: 409, code: "CONFLICT" },
  ];

  it.each(cases)("$name tiene el code $code y el estado $status", ({ error, status, code }) => {
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error).toBeInstanceOf(Error);
  });

  it.each(cases)("$name se traduce a una respuesta $status con code $code", async ({ error, status, code }) => {
    const response = toErrorResponse(error);
    const { body } = await readResponse(response);
    expect(response.status).toBe(status);
    expect(body.error.code).toBe(code);
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("un servicio que lanza NotFoundError(«No existe el deseo») responde 404 con el cuerpo exacto", async () => {
    const response = toErrorResponse(new NotFoundError("No existe el deseo"));
    const { json } = await readResponse(response);
    expect(response.status).toBe(404);
    expect(json).toEqual({ error: { code: "NOT_FOUND", message: "No existe el deseo" } });
  });

  it("UnauthenticatedError y ForbiddenError sin mensaje traen un mensaje por defecto para la persona", () => {
    expect(new UnauthenticatedError().message.length).toBeGreaterThan(0);
    expect(new ForbiddenError().message.length).toBeGreaterThan(0);
  });

  it("un ValidationError con campos responde 400 con esos campos", async () => {
    const error = new ValidationError("Revisa los datos", { price: "El precio debe ser mayor que 0" });
    const response = toErrorResponse(error);
    const { json } = await readResponse(response);
    expect(response.status).toBe(400);
    expect(json).toEqual({
      error: { code: "VALIDATION", message: "Revisa los datos", fields: { price: "El precio debe ser mayor que 0" } },
    });
  });

  it("un ValidationError sin campos no incluye fields", async () => {
    const { body } = await readResponse(toErrorResponse(new ValidationError("Revisa los datos")));
    expect(body.error).not.toHaveProperty("fields");
  });

  it.each(cases.filter((item) => item.status !== 400))("$name ($status) nunca incluye fields", async ({ error }) => {
    const { body } = await readResponse(toErrorResponse(error));
    expect(body.error).not.toHaveProperty("fields");
  });

  it("la respuesta de error se envía como JSON", () => {
    const response = toErrorResponse(new NotFoundError("No existe el deseo"));
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
  });

  it("el mensaje genérico de los 500 es el acordado", () => {
    expect(INTERNAL_ERROR_MESSAGE).toBe(GENERIC_INTERNAL_MESSAGE);
  });
});

describe("Errores inesperados → 500 genérico (reglas 1 y 3)", () => {
  it("un Error(«conexión a db falló») responde 500 genérico y no filtra el mensaje original", async () => {
    const response = toErrorResponse(new Error("conexión a db falló"));
    const { text, json } = await readResponse(response);
    expect(response.status).toBe(500);
    expect(json).toEqual({ error: { code: "INTERNAL", message: GENERIC_INTERNAL_MESSAGE } });
    expect(text).not.toContain("conexión a db falló");
  });

  it("un 500 no incluye el stack del error", async () => {
    const error = new TypeError("lectura de propiedad indefinida");
    const { text } = await readResponse(toErrorResponse(error));
    expect(text).not.toContain("TypeError");
    expect(text).not.toContain("lectura de propiedad indefinida");
    expect(text).not.toContain("at ");
  });

  it("un valor lanzado que no es Error (un texto) responde 500 INTERNAL", async () => {
    const response = toErrorResponse("algo salió mal");
    const { text, json } = await readResponse(response);
    expect(response.status).toBe(500);
    expect(json).toEqual({ error: { code: "INTERNAL", message: GENERIC_INTERNAL_MESSAGE } });
    expect(text).not.toContain("algo salió mal");
  });

  it("un null lanzado responde 500 INTERNAL", async () => {
    const response = toErrorResponse(null);
    const { body } = await readResponse(response);
    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});

describe("ZodError → 400 VALIDATION con fields (regla 4)", () => {
  it("un ZodError en el campo price responde 400 con fields.price", async () => {
    const schema = z.object({ price: z.number({ error: "El precio debe ser un número" }) });
    const response = translateZodFailure(schema, { price: "caro" });
    const { body } = await readResponse(response);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.message.length).toBeGreaterThan(0);
    expect(body.error.fields).toEqual({ price: "El precio debe ser un número" });
  });

  it("con varios campos inválidos, fields trae uno por campo", async () => {
    const schema = z.object({
      title: z.string({ error: "El título es obligatorio" }),
      price: z.number({ error: "El precio debe ser un número" }),
    });
    const { body } = await readResponse(translateZodFailure(schema, { price: "caro" }));
    expect(body.error.fields).toEqual({ title: "El título es obligatorio", price: "El precio debe ser un número" });
  });

  it("una ruta anidada se une con punto", async () => {
    const schema = z.object({ store: z.object({ url: z.string({ error: "La URL es obligatoria" }) }) });
    const { body } = await readResponse(translateZodFailure(schema, { store: {} }));
    expect(body.error.fields).toEqual({ "store.url": "La URL es obligatoria" });
  });

  it("si un campo tiene varios problemas, se usa el primer mensaje", async () => {
    const schema = z.object({
      title: z
        .string()
        .min(3, "Muy corto")
        .regex(/^[a-z]+$/, "Solo letras"),
    });
    const { body } = await readResponse(translateZodFailure(schema, { title: "1" }));
    expect(body.error.fields).toEqual({ title: "Muy corto" });
  });

  it("un error de validación sin campo (en la raíz) usa la clave _", async () => {
    const schema = z.string({ error: "Se esperaba un texto" });
    const response = translateZodFailure(schema, 5);
    const { body } = await readResponse(response);
    expect(response.status).toBe(400);
    expect(body.error.fields).toEqual({ _: "Se esperaba un texto" });
  });
});

describe("Errores de Next se re-lanzan (regla 5)", () => {
  it("un notFound() de Next capturado en un try se re-lanza al pasar por el traductor", () => {
    expect.assertions(1);
    try {
      notFound();
    } catch (error) {
      expect(() => toErrorResponse(error)).toThrow();
    }
  });

  it("un redirect() de Next capturado en un try se re-lanza al pasar por el traductor", () => {
    expect.assertions(1);
    try {
      redirect("/ingresar");
    } catch (error) {
      expect(() => toErrorResponse(error)).toThrow();
    }
  });
});
