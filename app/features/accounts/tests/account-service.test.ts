import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { EMAIL_TAKEN_MESSAGE } from "@/features/accounts/schema";
import { createAccountService } from "@/features/accounts/server/account-service";
import type { SessionPort } from "@/features/accounts/server/auth-port";
import { InMemoryAccountAuth } from "@/features/accounts/server/auth-port.memory";
import { ConflictError, UnauthenticatedError } from "@/shared/server/errors";
import type { Session } from "@/shared/server/session";

type SessionCall = { method: "createSession"; idToken: string } | { method: "getSession" } | { method: "clearSession" };

/** Doble de la sesión de F0: registra llamadas, sesión configurable y fallas inyectables. */
class FakeSessions implements SessionPort {
  readonly calls: SessionCall[] = [];
  session: Session | null = null;
  createFailure: Error | undefined = undefined;
  getFailure: Error | undefined = undefined;
  /** Se ejecuta al borrar la cookie: sirve para mirar qué se había revocado en ese momento. */
  onClear: () => void = () => {};

  async createSession(idToken: string): Promise<void> {
    this.calls.push({ method: "createSession", idToken });
    if (this.createFailure !== undefined) {
      throw this.createFailure;
    }
  }

  async getSession(): Promise<Session | null> {
    this.calls.push({ method: "getSession" });
    if (this.getFailure !== undefined) {
      throw this.getFailure;
    }
    return this.session;
  }

  async clearSession(): Promise<void> {
    this.calls.push({ method: "clearSession" });
    this.onClear();
  }

  countOf(method: SessionCall["method"]): number {
    return this.calls.filter((call) => call.method === method).length;
  }
}

function setup() {
  const auth = new InMemoryAccountAuth();
  const sessions = new FakeSessions();
  const service = createAccountService({ auth, sessions });
  return { auth, sessions, service };
}

const ANA = { email: "ana@x.com", password: "12345678", password_confirmation: "12345678" };
const ANA_SESSION: Session = { uid: "uid-ana", email: "ana@x.com" };

describe("Registrarse (F1)", () => {
  it("con «  Ana@X.com » crea la cuenta ana@x.com y devuelve ese correo", async () => {
    const { auth, service } = setup();
    const output = await service.register({ ...ANA, email: "  Ana@X.com " });
    expect(output).toEqual({ email: "ana@x.com" });
    expect(auth.accounts).toEqual([{ email: "ana@x.com", password: "12345678" }]);
  });

  it("la respuesta solo trae el correo, nunca la contraseña", async () => {
    const { service } = setup();
    const output = await service.register(ANA);
    expect(Object.keys(output)).toEqual(["email"]);
    expect(JSON.stringify(output)).not.toContain("12345678");
  });

  it("la contraseña llega a Firebase tal cual, sin recortar", async () => {
    const { auth, service } = setup();
    await service.register({ ...ANA, password: " 1234567", password_confirmation: " 1234567" });
    expect(auth.accounts[0]?.password).toBe(" 1234567");
  });

  it("con una confirmación distinta lanza un error de validación y no crea la cuenta", async () => {
    const { auth, service } = setup();
    await expect(service.register({ ...ANA, password_confirmation: "87654321" })).rejects.toBeInstanceOf(ZodError);
    expect(auth.accounts).toEqual([]);
  });

  it("con una contraseña de 7 caracteres lanza un error de validación y no crea la cuenta", async () => {
    const { auth, service } = setup();
    const short = { ...ANA, password: "1234567", password_confirmation: "1234567" };
    await expect(service.register(short)).rejects.toBeInstanceOf(ZodError);
    expect(auth.accounts).toEqual([]);
  });

  it("con un correo inválido lanza un error de validación y no crea la cuenta", async () => {
    const { auth, service } = setup();
    await expect(service.register({ ...ANA, email: "ana@" })).rejects.toBeInstanceOf(ZodError);
    expect(auth.accounts).toEqual([]);
  });

  it("registrar dos veces el mismo correo da conflicto con «Ya existe una cuenta con ese correo.»", async () => {
    const { auth, service } = setup();
    await service.register(ANA);
    const second = service.register(ANA);
    await expect(second).rejects.toBeInstanceOf(ConflictError);
    await expect(second).rejects.toThrow(EMAIL_TAKEN_MESSAGE);
    expect(auth.accounts).toHaveLength(1);
  });

  it("el mismo correo con otras mayúsculas y espacios también da conflicto", async () => {
    const { service } = setup();
    await service.register(ANA);
    await expect(service.register({ ...ANA, email: " ANA@X.COM" })).rejects.toBeInstanceOf(ConflictError);
  });

  it("si Firebase falla con otro error, se propaga el mismo error", async () => {
    const { auth, service } = setup();
    const failure = new Error("Firebase caído");
    auth.failCreateWith(failure);
    await expect(service.register(ANA)).rejects.toBe(failure);
  });
});

describe("Ingresar (F2, regla 13)", () => {
  it("con un id_token válido crea la sesión con ese token", async () => {
    const { sessions, service } = setup();
    await service.startSession({ id_token: "token-de-ana" });
    expect(sessions.calls).toEqual([{ method: "createSession", idToken: "token-de-ana" }]);
  });

  it("un id_token de 4096 caracteres llega a crear la sesión", async () => {
    const { sessions, service } = setup();
    const token = "t".repeat(4096);
    await service.startSession({ id_token: token });
    expect(sessions.calls).toEqual([{ method: "createSession", idToken: token }]);
  });

  it.each([
    { name: "vacío", token: "" },
    { name: "de 4097 caracteres", token: "t".repeat(4097) },
  ])("un id_token $name se rechaza sin llamar a Firebase", async ({ token }) => {
    const { sessions, service } = setup();
    await expect(service.startSession({ id_token: token })).rejects.toBeInstanceOf(ZodError);
    expect(sessions.calls).toEqual([]);
  });

  it("si el token es rechazado (401), el error se propaga", async () => {
    const { sessions, service } = setup();
    const failure = new UnauthenticatedError();
    sessions.createFailure = failure;
    await expect(service.startSession({ id_token: "token-viejo" })).rejects.toBe(failure);
  });
});

describe("Cerrar sesión (F2, reglas 16–18)", () => {
  it("con sesión revoca ESE uid y después borra la cookie", async () => {
    const { auth, sessions, service } = setup();
    let revokedWhenCleared: string[] = [];
    sessions.session = ANA_SESSION;
    sessions.onClear = () => {
      revokedWhenCleared = [...auth.revokedUids];
    };
    await service.endSession();
    expect(auth.revokedUids).toEqual(["uid-ana"]);
    expect(revokedWhenCleared).toEqual(["uid-ana"]);
    expect(sessions.countOf("clearSession")).toBe(1);
  });

  it("sin sesión (cookie ausente, vencida o revocada) solo borra la cookie, sin revocar", async () => {
    const { auth, sessions, service } = setup();
    sessions.session = null;
    await service.endSession();
    expect(auth.revokedUids).toEqual([]);
    expect(sessions.countOf("clearSession")).toBe(1);
  });

  it("cerrar sesión dos veces seguidas funciona las dos veces", async () => {
    const { sessions, service } = setup();
    await service.endSession();
    await service.endSession();
    expect(sessions.countOf("clearSession")).toBe(2);
  });

  it("si la revocación falla, el error se propaga y la cookie NO se borra", async () => {
    const { auth, sessions, service } = setup();
    const failure = new Error("revocación caída");
    sessions.session = ANA_SESSION;
    auth.failRevokeWith(failure);
    await expect(service.endSession()).rejects.toBe(failure);
    expect(sessions.countOf("clearSession")).toBe(0);
  });

  it("si leer la sesión falla, el error se propaga y no se revoca ni se borra nada", async () => {
    const { auth, sessions, service } = setup();
    const failure = new Error("entorno roto");
    sessions.getFailure = failure;
    await expect(service.endSession()).rejects.toBe(failure);
    expect(auth.revokedUids).toEqual([]);
    expect(sessions.countOf("clearSession")).toBe(0);
  });
});
