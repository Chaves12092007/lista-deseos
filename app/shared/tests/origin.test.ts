import { describe, expect, it } from "vitest";
import { ForbiddenError } from "@/shared/server/errors";
import { assertSameOrigin } from "@/shared/server/http";

const APP_URL = "https://app.com/api/x";

function buildRequest(method: string, origin?: string, url: string = APP_URL): Request {
  const headers = new Headers();
  if (origin !== undefined) {
    headers.set("Origin", origin);
  }
  return new Request(url, { method, headers });
}

describe("Validación del origen en métodos que cambian datos (regla 6)", () => {
  const changingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  it.each(changingMethods)("un %s sin header Origin se rechaza con 403 FORBIDDEN", (method) => {
    expect(() => assertSameOrigin(buildRequest(method))).toThrow(ForbiddenError);
  });

  it.each(changingMethods)("un %s con Origin https://otro.com y host app.com se rechaza", (method) => {
    expect(() => assertSameOrigin(buildRequest(method, "https://otro.com"))).toThrow(ForbiddenError);
  });

  it.each(changingMethods)("un %s con Origin del mismo host continúa", (method) => {
    expect(() => assertSameOrigin(buildRequest(method, "https://app.com"))).not.toThrow();
  });

  it("el error de origen se traduce como 403 FORBIDDEN", () => {
    expect.assertions(2);
    try {
      assertSameOrigin(buildRequest("POST"));
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      if (error instanceof ForbiddenError) {
        expect(error.status).toBe(403);
      }
    }
  });

  it("un POST desde otro puerto (localhost:3001 contra localhost:3000) se rechaza", () => {
    const request = buildRequest("POST", "http://localhost:3001", "http://localhost:3000/api/x");
    expect(() => assertSameOrigin(request)).toThrow(ForbiddenError);
  });

  it("un POST desde el mismo host y puerto (localhost:3000) continúa", () => {
    const request = buildRequest("POST", "http://localhost:3000", "http://localhost:3000/api/x");
    expect(() => assertSameOrigin(request)).not.toThrow();
  });

  it("un POST con un Origin que no es una URL válida se rechaza", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "no es una url"))).toThrow(ForbiddenError);
  });

  it("un POST con Origin «null» (contexto opaco) se rechaza", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "null"))).toThrow(ForbiddenError);
  });

  it("un POST desde un subdominio del host se rechaza", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "https://malo.app.com"))).toThrow(ForbiddenError);
  });
});

describe("Se compara el origen completo: esquema, host y puerto (regla 6, respuesta 19)", () => {
  it("un POST con Origin http://app.com a una petición https://app.com se rechaza", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "http://app.com"))).toThrow(ForbiddenError);
  });

  it("un POST con el host del Origin en mayúsculas (https://APP.com) continúa", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "https://APP.com"))).not.toThrow();
  });

  it("un POST con el puerto por defecto explícito (https://app.com:443) continúa", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "https://app.com:443"))).not.toThrow();
  });

  it("un POST con Origin https://app.com. (punto final) se rechaza", () => {
    expect(() => assertSameOrigin(buildRequest("POST", "https://app.com."))).toThrow(ForbiddenError);
  });
});

describe("Métodos que solo leen no se revisan (regla 7)", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("un %s sin header Origin continúa", (method) => {
    expect(() => assertSameOrigin(buildRequest(method))).not.toThrow();
  });

  it("un GET con Origin de otro host continúa", () => {
    expect(() => assertSameOrigin(buildRequest("GET", "https://otro.com"))).not.toThrow();
  });
});
