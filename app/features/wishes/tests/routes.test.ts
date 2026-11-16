import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createRoute } from "@/api/wishes/route";
import { DELETE as deleteRoute, PATCH as updateRoute } from "@/api/wishes/[id]/route";
import { WISH_LIMIT_MESSAGE, WISH_NOT_FOUND_MESSAGE, WishSchema } from "@/features/wishes/schema";
import type { WishService } from "@/features/wishes/server/wish-service";
import { ErrorBodySchema } from "@/shared/schema";
import { ConflictError, INTERNAL_ERROR_MESSAGE, NotFoundError, UnauthenticatedError } from "@/shared/server/errors";

const service = vi.hoisted(() => ({
  create: vi.fn<WishService["create"]>(),
  list: vi.fn<WishService["list"]>(),
  update: vi.fn<WishService["update"]>(),
  remove: vi.fn<WishService["remove"]>(),
}));
const requireSession = vi.hoisted(() => vi.fn<() => Promise<{ uid: string; email: string | null }>>());

vi.mock("@/features/container", () => ({ getWishService: () => service }));
vi.mock("@/shared/server/session-next", () => ({ requireSession }));

const ORIGIN = "http://localhost:3000";
const UID = "uid-ana";
const VALID = { name: "Audífonos", store_url: "https://tienda.com/a", price_cop: 120000 };
const SAVED = {
  id: "w1",
  ...VALID,
  priority: "media",
  purchased: false,
  created_at: "2026-11-16T12:00:00.000Z",
  updated_at: "2026-11-16T12:00:00.000Z",
};

function request(path: string, method: string, body?: string, origin?: string | null): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (origin !== null) {
    headers.set("Origin", origin ?? ORIGIN);
  }
  return new Request(`${ORIGIN}${path}`, { method, headers, body });
}

function post(body: string, origin?: string | null): Promise<Response> {
  return createRoute(request("/api/wishes", "POST", body, origin));
}

function patch(id: string, body: string, origin?: string | null): Promise<Response> {
  return updateRoute(request(`/api/wishes/${id}`, "PATCH", body, origin), { params: Promise.resolve({ id }) });
}

function remove(id: string, origin?: string | null): Promise<Response> {
  return deleteRoute(request(`/api/wishes/${id}`, "DELETE", undefined, origin), { params: Promise.resolve({ id }) });
}

async function readError(response: Response) {
  const text = await response.text();
  return { text, body: ErrorBodySchema.parse(JSON.parse(text)) };
}

beforeEach(() => {
  for (const mock of [service.create, service.list, service.update, service.remove, requireSession]) {
    mock.mockReset();
  }
  requireSession.mockResolvedValue({ uid: UID, email: "ana@x.com" });
  service.create.mockResolvedValue(WishSchema.parse(SAVED));
  service.update.mockResolvedValue(WishSchema.parse(SAVED));
  service.remove.mockResolvedValue(undefined);
});

describe("Origen y sesión (reglas 7 y 44)", () => {
  it("sin Origin las tres rutas responden 403 y no llaman al servicio", async () => {
    const responses = [
      await post(JSON.stringify(VALID), null),
      await patch("w1", "{}", null),
      await remove("w1", null),
    ];
    expect(responses.map((response) => response.status)).toEqual([403, 403, 403]);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });

  it("desde otro origen responde 403", async () => {
    expect((await post(JSON.stringify(VALID), "https://malo.example")).status).toBe(403);
  });

  it("sin sesión las tres rutas responden 401 y no llaman al servicio", async () => {
    requireSession.mockRejectedValue(new UnauthenticatedError());
    const responses = [await post(JSON.stringify(VALID)), await patch("w1", '{"price_cop":1}'), await remove("w1")];
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401]);
    expect((await readError(responses[0] ?? new Response())).body.error.code).toBe("UNAUTHENTICATED");
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
});

describe("POST /api/wishes (F4)", () => {
  it("responde 201 con el deseo y llama al servicio con el uid de la sesión y los datos ya validados", async () => {
    const response = await post(JSON.stringify({ ...VALID, name: "  Audífonos  " }));
    expect(response.status).toBe(201);
    expect(WishSchema.parse(await response.json())).toEqual(SAVED);
    expect(service.create).toHaveBeenCalledWith(UID, { ...VALID, priority: "media", purchased: false });
  });

  it("un JSON roto responde 400 y no llama al servicio", async () => {
    const response = await post("{roto");
    expect(response.status).toBe(400);
    expect((await readError(response)).body.error.code).toBe("VALIDATION");
    expect(service.create).not.toHaveBeenCalled();
  });

  it("un campo inválido responde 400 con fields por campo", async () => {
    const response = await post(JSON.stringify({ ...VALID, name: "  ", price_cop: -1 }));
    const { body } = await readError(response);
    expect(response.status).toBe(400);
    expect(Object.keys(body.error.fields ?? {}).sort()).toEqual(["name", "price_cop"]);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("el dueño nunca viene del cuerpo: uid, id o campos extra dan 400 sin fields", async () => {
    for (const extra of [{ uid: "otro" }, { id: "w9" }, { foo: 1 }]) {
      const response = await post(JSON.stringify({ ...VALID, ...extra }));
      const { body } = await readError(response);
      expect(response.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION");
      expect(body.error.fields).toBeUndefined();
    }
    expect(service.create).not.toHaveBeenCalled();
  });

  it("el deseo 101 responde 409 con el mensaje del tope", async () => {
    service.create.mockRejectedValue(new ConflictError(WISH_LIMIT_MESSAGE));
    const response = await post(JSON.stringify(VALID));
    const { body } = await readError(response);
    expect(response.status).toBe(409);
    expect(body.error).toMatchObject({ code: "CONFLICT", message: WISH_LIMIT_MESSAGE });
  });

  it("un error inesperado responde 500 genérico sin filtrar detalles", async () => {
    service.create.mockRejectedValue(new Error("boom: secreto de Firestore"));
    const response = await post(JSON.stringify(VALID));
    const { text, body } = await readError(response);
    expect(response.status).toBe(500);
    expect(body.error.message).toBe(INTERNAL_ERROR_MESSAGE);
    expect(text).not.toContain("secreto");
  });
});

describe("PATCH /api/wishes/[id] (F6, F8, F9)", () => {
  it("responde 200 con el deseo y pasa uid, id y solo los campos enviados", async () => {
    const response = await patch("w1", JSON.stringify({ purchased: true }));
    expect(response.status).toBe(200);
    expect(WishSchema.parse(await response.json())).toEqual(SAVED);
    expect(service.update).toHaveBeenCalledWith(UID, "w1", { purchased: true });
  });

  it("{} y los campos desconocidos responden 400 sin fields y no llaman al servicio", async () => {
    for (const body of [{}, { price_cop: 5, uid: "otro" }, { created_at: "x" }]) {
      const response = await patch("w1", JSON.stringify(body));
      const parsed = await readError(response);
      expect(response.status).toBe(400);
      expect(parsed.body.error.fields).toBeUndefined();
    }
    expect(service.update).not.toHaveBeenCalled();
  });

  it("un campo inválido responde 400 con fields", async () => {
    const response = await patch("w1", JSON.stringify({ priority: "urgente" }));
    expect((await readError(response)).body.error.fields).toHaveProperty("priority");
  });

  it("un id ajeno o inexistente responde 404 con el mensaje fijo", async () => {
    service.update.mockRejectedValue(new NotFoundError(WISH_NOT_FOUND_MESSAGE));
    const response = await patch("w9", JSON.stringify({ name: "x" }));
    const { body } = await readError(response);
    expect(response.status).toBe(404);
    expect(body.error).toMatchObject({ code: "NOT_FOUND", message: WISH_NOT_FOUND_MESSAGE });
  });

  it("un JSON roto responde 400", async () => {
    expect((await patch("w1", "{roto")).status).toBe(400);
  });
});

describe("DELETE /api/wishes/[id] (F7)", () => {
  it("responde 204 sin cuerpo y llama al servicio con uid e id", async () => {
    const response = await remove("w1");
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(service.remove).toHaveBeenCalledWith(UID, "w1");
  });

  it("un id ajeno o inexistente responde 404", async () => {
    service.remove.mockRejectedValue(new NotFoundError(WISH_NOT_FOUND_MESSAGE));
    const response = await remove("w9");
    expect(response.status).toBe(404);
    expect((await readError(response)).body.error.message).toBe(WISH_NOT_FOUND_MESSAGE);
  });
});
