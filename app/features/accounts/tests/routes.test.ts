import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as registerRoute } from "@/api/accounts/route";
import { DELETE as endSessionRoute, POST as startSessionRoute } from "@/api/session/route";
import type { AccountService } from "@/features/accounts/server/account-service";
import {
  EMAIL_TAKEN_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  RegisterAccountOutputSchema,
} from "@/features/accounts/schema";
import { ErrorBodySchema } from "@/shared/schema";
import { ConflictError, INTERNAL_ERROR_MESSAGE, UnauthenticatedError } from "@/shared/server/errors";

const service = vi.hoisted(() => ({
  register: vi.fn<AccountService["register"]>(),
  startSession: vi.fn<AccountService["startSession"]>(),
  endSession: vi.fn<AccountService["endSession"]>(),
}));

// vi.mock se eleva antes de los imports: las rutas reciben este servicio falso desde el contenedor.
vi.mock("@/features/container", () => ({ getAccountService: () => service }));

const ORIGIN = "http://localhost:3000";
const ANA = { email: "  Ana@X.com ", password: "12345678", password_confirmation: "12345678" };

interface RequestOptions {
  body?: string;
  origin?: string | null;
}

function buildRequest(path: string, method: string, options: RequestOptions): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.origin !== null) {
    headers.set("Origin", options.origin ?? ORIGIN);
  }
  return new Request(`${ORIGIN}${path}`, { method, headers, body: options.body });
}

function postAccounts(body: string, origin?: string | null): Promise<Response> {
  return registerRoute(buildRequest("/api/accounts", "POST", { body, origin }));
}

function postSession(body: string, origin?: string | null): Promise<Response> {
  return startSessionRoute(buildRequest("/api/session", "POST", { body, origin }));
}

function deleteSession(origin?: string | null): Promise<Response> {
  return endSessionRoute(buildRequest("/api/session", "DELETE", { origin }));
}

async function readError(response: Response) {
  const text = await response.text();
  const body = ErrorBodySchema.parse(JSON.parse(text));
  return { text, body };
}

beforeEach(() => {
  service.register.mockReset();
  service.startSession.mockReset();
  service.endSession.mockReset();
  service.register.mockResolvedValue({ email: "ana@x.com" });
  service.startSession.mockResolvedValue(undefined);
  service.endSession.mockResolvedValue(undefined);
});

describe("Origen de las peticiones (F0, regla 6)", () => {
  it("POST /api/accounts sin Origin responde 403 y no llama al servicio", async () => {
    const response = await postAccounts(JSON.stringify(ANA), null);
    expect(response.status).toBe(403);
    expect((await readError(response)).body.error.code).toBe("FORBIDDEN");
    expect(service.register).not.toHaveBeenCalled();
  });

  it("POST /api/session sin Origin responde 403 y no llama al servicio", async () => {
    const response = await postSession(JSON.stringify({ id_token: "token" }), null);
    expect(response.status).toBe(403);
    expect(service.startSession).not.toHaveBeenCalled();
  });

  it("DELETE /api/session sin Origin responde 403 y no llama al servicio", async () => {
    const response = await deleteSession(null);
    expect(response.status).toBe(403);
    expect(service.endSession).not.toHaveBeenCalled();
  });

  it("POST /api/accounts desde otro origen responde 403", async () => {
    const response = await postAccounts(JSON.stringify(ANA), "https://malo.example");
    expect(response.status).toBe(403);
    expect(service.register).not.toHaveBeenCalled();
  });
});

describe("POST /api/accounts (F1)", () => {
  it("un registro correcto responde 201 con el correo normalizado", async () => {
    const response = await postAccounts(JSON.stringify(ANA));
    expect(response.status).toBe(201);
    expect(RegisterAccountOutputSchema.strict().parse(await response.json())).toEqual({ email: "ana@x.com" });
    expect(service.register).toHaveBeenCalledTimes(1);
  });

  it("la respuesta 201 no contiene la contraseña", async () => {
    const response = await postAccounts(JSON.stringify(ANA));
    expect(await response.text()).not.toContain("12345678");
  });

  it("con confirmación distinta responde 400 VALIDATION con fields.password_confirmation y no llama al servicio", async () => {
    const response = await postAccounts(JSON.stringify({ ...ANA, password_confirmation: "87654321" }));
    const { body } = await readError(response);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.fields?.password_confirmation).toBe(PASSWORD_MISMATCH_MESSAGE);
    expect(service.register).not.toHaveBeenCalled();
  });

  it("con contraseña de 7 caracteres responde 400 con fields.password y no llama al servicio", async () => {
    const response = await postAccounts(
      JSON.stringify({ ...ANA, password: "1234567", password_confirmation: "1234567" }),
    );
    const { body } = await readError(response);
    expect(response.status).toBe(400);
    expect(body.error.fields).toHaveProperty("password");
    expect(service.register).not.toHaveBeenCalled();
  });

  it("un cuerpo que no es JSON responde 400 VALIDATION sin fields y no llama al servicio", async () => {
    const response = await postAccounts("{ esto no es json");
    const { body } = await readError(response);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error).not.toHaveProperty("fields");
    expect(service.register).not.toHaveBeenCalled();
  });

  it("un correo ya registrado responde 409 «Ya existe una cuenta con ese correo.»", async () => {
    service.register.mockRejectedValue(new ConflictError(EMAIL_TAKEN_MESSAGE));
    const response = await postAccounts(JSON.stringify(ANA));
    const { body } = await readError(response);
    expect(response.status).toBe(409);
    expect(body.error).toEqual({ code: "CONFLICT", message: EMAIL_TAKEN_MESSAGE });
  });

  it("otro error del servicio responde 500 genérico y no filtra la contraseña", async () => {
    service.register.mockRejectedValue(new Error("boom con 12345678"));
    const response = await postAccounts(JSON.stringify(ANA));
    const { text, body } = await readError(response);
    expect(response.status).toBe(500);
    expect(body.error).toEqual({ code: "INTERNAL", message: INTERNAL_ERROR_MESSAGE });
    expect(text).not.toContain("12345678");
    expect(text).not.toContain("boom");
  });
});

describe("POST /api/session (F2, regla 13)", () => {
  it("un id_token válido responde 204 sin cuerpo y lo pasa al servicio", async () => {
    const response = await postSession(JSON.stringify({ id_token: "token-de-ana" }));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(service.startSession).toHaveBeenCalledWith({ id_token: "token-de-ana" });
  });

  it("un id_token de 4096 caracteres llega al servicio", async () => {
    const token = "t".repeat(4096);
    const response = await postSession(JSON.stringify({ id_token: token }));
    expect(response.status).toBe(204);
    expect(service.startSession).toHaveBeenCalledWith({ id_token: token });
  });

  it.each([
    { name: "de 4097 caracteres", token: "t".repeat(4097) },
    { name: "vacío", token: "" },
  ])("un id_token $name responde 400 VALIDATION sin llamar al servicio", async ({ token }) => {
    const response = await postSession(JSON.stringify({ id_token: token }));
    const { body } = await readError(response);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.fields).toHaveProperty("id_token");
    expect(service.startSession).not.toHaveBeenCalled();
  });

  it("un cuerpo que no es JSON responde 400 VALIDATION sin llamar al servicio", async () => {
    const response = await postSession("no-json");
    const { body } = await readError(response);
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(service.startSession).not.toHaveBeenCalled();
  });

  it("un token rechazado o viejo responde 401", async () => {
    service.startSession.mockRejectedValue(new UnauthenticatedError());
    const response = await postSession(JSON.stringify({ id_token: "token-viejo" }));
    const { body } = await readError(response);
    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("DELETE /api/session (F2, reglas 16–18)", () => {
  it("cerrar sesión responde 204 sin cuerpo y llama al servicio", async () => {
    const response = await deleteSession();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(service.endSession).toHaveBeenCalledTimes(1);
  });

  it("cerrar sesión dos veces seguidas responde 204 las dos veces", async () => {
    expect((await deleteSession()).status).toBe(204);
    expect((await deleteSession()).status).toBe(204);
  });

  it("si la revocación falla responde 500 genérico", async () => {
    service.endSession.mockRejectedValue(new Error("revocación caída"));
    const response = await deleteSession();
    const { text, body } = await readError(response);
    expect(response.status).toBe(500);
    expect(body.error).toEqual({ code: "INTERNAL", message: INTERNAL_ERROR_MESSAGE });
    expect(text).not.toContain("revocación caída");
  });
});
