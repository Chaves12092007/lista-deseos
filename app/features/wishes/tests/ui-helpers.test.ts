import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NAME_REQUIRED_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_NOT_INTEGER_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  PRICE_TOO_BIG_MESSAGE,
  PRIORITY_INVALID_MESSAGE,
  STORE_URL_INVALID_MESSAGE,
  WISH_LIMIT_MESSAGE,
} from "@/features/wishes/schema";
import { formatCop, storeHost } from "@/features/wishes/ui/format";
import {
  DELETE_FAILED_MESSAGE,
  SAVE_FAILED_MESSAGE,
  UPDATE_FAILED_MESSAGE,
  createWish,
  deleteWish,
  updateWish,
} from "@/features/wishes/ui/wish-api";
import { parseWishForm } from "@/features/wishes/ui/wish-form-input";

describe("Formato (reglas 14 y 15)", () => {
  it("el precio usa el Intl.NumberFormat de COP sin decimales", () => {
    const expected = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
    for (const value of [0, 1, 1234567, 1_000_000_000]) {
      expect(formatCop(value)).toBe(expected.format(value));
    }
    expect(formatCop(1234567)).toContain("1.234.567");
  });

  it("el enlace muestra el host de la URL", () => {
    expect(storeHost("https://www.tienda.com/p?id=1")).toBe("www.tienda.com");
    expect(storeHost("http://localhost:3000/x")).toBe("localhost:3000");
  });

  it("si la URL no se puede leer, muestra el texto tal cual", () => {
    expect(storeHost("no es url")).toBe("no es url");
  });
});

describe("Formulario: lectura previa sin red (regla 35)", () => {
  const VALUES = { name: " Audífonos ", store_url: "https://tienda.com/a", price_cop: "120000", priority: "alta" };

  it("convierte el precio a número entero y recorta", () => {
    expect(parseWishForm(VALUES)).toEqual({
      ok: true,
      input: {
        name: "Audífonos",
        store_url: "https://tienda.com/a",
        price_cop: 120000,
        priority: "alta",
        purchased: false,
      },
    });
  });

  it("acepta 0 y los espacios alrededor del precio", () => {
    const result = parseWishForm({ ...VALUES, price_cop: " 0 " });
    expect(result.ok).toBe(true);
  });

  it("precio vacío → «Escribe el precio.»", () => {
    expect(parseWishForm({ ...VALUES, price_cop: "  " })).toEqual({
      ok: false,
      fields: { price_cop: PRICE_REQUIRED_MESSAGE },
    });
  });

  it.each(["abc", "10,5", "1.5", "12 000", "1e3"])("precio %j → «número entero»", (price) => {
    const result = parseWishForm({ ...VALUES, price_cop: price });
    expect(result).toEqual({ ok: false, fields: { price_cop: PRICE_NOT_INTEGER_MESSAGE } });
  });

  it("precio negativo y demasiado grande usan los mensajes del contrato", () => {
    expect(parseWishForm({ ...VALUES, price_cop: "-1" })).toEqual({
      ok: false,
      fields: { price_cop: PRICE_NEGATIVE_MESSAGE },
    });
    expect(parseWishForm({ ...VALUES, price_cop: "1000000001" })).toEqual({
      ok: false,
      fields: { price_cop: PRICE_TOO_BIG_MESSAGE },
    });
  });

  it("devuelve un mensaje por cada campo inválido", () => {
    const result = parseWishForm({ name: "  ", store_url: "tienda.com", price_cop: "5", priority: "urgente" });
    expect(result).toEqual({
      ok: false,
      fields: {
        name: NAME_REQUIRED_MESSAGE,
        store_url: STORE_URL_INVALID_MESSAGE,
        priority: PRIORITY_INVALID_MESSAGE,
      },
    });
  });
});

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function stubFetch(response: Response | Error): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (response instanceof Error) {
      throw response;
    }
    return response;
  });
  return calls;
}

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const INPUT = { name: "Audífonos", store_url: "https://tienda.com/a", price_cop: 120000 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cliente de la API de deseos", () => {
  it("createWish hace POST /api/wishes con el cuerpo JSON y devuelve ok con un 201", async () => {
    const calls = stubFetch(jsonResponse({ id: "w1" }, 201));
    expect(await createWish(INPUT)).toEqual({ ok: true });
    expect(calls[0]?.url).toBe("/api/wishes");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(INPUT);
  });

  it("un 400 con fields devuelve los errores por campo y ningún mensaje general", async () => {
    stubFetch(jsonResponse({ error: { code: "VALIDATION", message: "x", fields: { name: "Mal" } } }, 400));
    expect(await createWish(INPUT)).toEqual({ ok: false, fields: { name: "Mal" }, message: null });
  });

  it("un 409 devuelve el mensaje del servidor", async () => {
    stubFetch(jsonResponse({ error: { code: "CONFLICT", message: WISH_LIMIT_MESSAGE } }, 409));
    expect(await createWish(INPUT)).toEqual({ ok: false, fields: {}, message: WISH_LIMIT_MESSAGE });
  });

  it("un error de red o una respuesta sin forma de error dan el mensaje genérico", async () => {
    stubFetch(new Error("red caída"));
    expect(await createWish(INPUT)).toEqual({ ok: false, fields: {}, message: SAVE_FAILED_MESSAGE });
    vi.unstubAllGlobals();
    stubFetch(new Response("<html>", { status: 502 }));
    expect(await createWish(INPUT)).toEqual({ ok: false, fields: {}, message: SAVE_FAILED_MESSAGE });
  });

  it("updateWish hace PATCH /api/wishes/<id> con solo los campos enviados", async () => {
    const calls = stubFetch(jsonResponse({ id: "w1" }, 200));
    expect(await updateWish("w 1", { purchased: true })).toEqual({ ok: true });
    expect(calls[0]?.url).toBe("/api/wishes/w%201");
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ purchased: true });
  });

  it("updateWish con un fallo da el mensaje de actualizar", async () => {
    stubFetch(new Error("red caída"));
    expect(await updateWish("w1", { purchased: true })).toEqual({
      ok: false,
      fields: {},
      message: UPDATE_FAILED_MESSAGE,
    });
  });

  it("deleteWish hace DELETE y devuelve ok con un 204", async () => {
    const calls = stubFetch(new Response(null, { status: 204 }));
    expect(await deleteWish("w1")).toEqual({ ok: true });
    expect(calls[0]?.url).toBe("/api/wishes/w1");
    expect(calls[0]?.init?.method).toBe("DELETE");
  });

  it("deleteWish con 404 o con error de red da el mensaje de eliminar", async () => {
    stubFetch(jsonResponse({ error: { code: "NOT_FOUND", message: "No encontramos ese deseo." } }, 404));
    expect(await deleteWish("w1")).toEqual({ ok: false, fields: {}, message: DELETE_FAILED_MESSAGE });
    vi.unstubAllGlobals();
    stubFetch(new Error("red caída"));
    expect(await deleteWish("w1")).toEqual({ ok: false, fields: {}, message: DELETE_FAILED_MESSAGE });
  });
});
