import { describe, expect, it } from "vitest";
import { UnauthenticatedError } from "@/shared/server/errors";
import {
  createSessionManager,
  InvalidCredentialError,
  MAX_TOKEN_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/shared/server/session";
import { authTimeSecondsAgo, FakeClock, FakeCookieJar, FakeSessionVerifier } from "./doubles";

const FIVE_DAYS_SECONDS = 432000;
const ID_TOKEN = "id-token-ana";
const ANA = { uid: "uid-ana", email: "ana@example.com" };

function setup(isProduction: boolean = false) {
  const clock = new FakeClock();
  const verifier = new FakeSessionVerifier(clock);
  const cookies = new FakeCookieJar();
  const manager = createSessionManager({ verifier, cookies, now: clock.now, isProduction });
  return { clock, verifier, cookies, manager };
}

/** Registra en el verificador un ID token de Ana emitido hace `secondsAgo` segundos. */
function issueIdToken(context: ReturnType<typeof setup>, secondsAgo: number): void {
  const authTime = authTimeSecondsAgo(context.clock.now(), secondsAgo);
  context.verifier.addIdToken(ID_TOKEN, { ...ANA, auth_time: authTime });
}

/** Deja en el navegador una cookie de sesión válida (vence en 5 días). */
function presetValidCookie(context: ReturnType<typeof setup>, cookie: string, email?: string): void {
  const claims = { uid: ANA.uid, email };
  context.verifier.addSessionCookie(cookie, claims, context.clock.now() + FIVE_DAYS_SECONDS * 1000);
  context.cookies.preset(SESSION_COOKIE, cookie);
}

describe("Constantes de la sesión", () => {
  it("la cookie se llama session, dura 5 días y el token puede tener hasta 5 minutos", () => {
    expect(SESSION_COOKIE).toBe("session");
    expect(SESSION_MAX_AGE_SECONDS).toBe(FIVE_DAYS_SECONDS);
    expect(MAX_TOKEN_AGE_SECONDS).toBe(300);
  });
});

describe("createSession (reglas 9 y 10)", () => {
  it("con un ID token válido de hace 1 minuto guarda la cookie session con los atributos exactos", async () => {
    const context = setup();
    issueIdToken(context, 60);
    await context.manager.createSession(ID_TOKEN);
    expect(context.cookies.stored.get("session")).toEqual({
      value: `cookie-de-${ID_TOKEN}`,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: FIVE_DAYS_SECONDS, secure: false },
    });
  });

  it("en producción la cookie lleva Secure", async () => {
    const context = setup(true);
    issueIdToken(context, 60);
    await context.manager.createSession(ID_TOKEN);
    expect(context.cookies.stored.get("session")?.options.secure).toBe(true);
  });

  it("fuera de producción la cookie no lleva Secure", async () => {
    const context = setup(false);
    issueIdToken(context, 60);
    await context.manager.createSession(ID_TOKEN);
    expect(context.cookies.stored.get("session")?.options.secure).toBe(false);
  });

  it("pide a Firebase una cookie de sesión de 5 días (expiresIn en ms)", async () => {
    const context = setup();
    issueIdToken(context, 60);
    await context.manager.createSession(ID_TOKEN);
    expect(context.verifier.callsTo("createSessionCookie")).toEqual([
      { method: "createSessionCookie", idToken: ID_TOKEN, expiresIn: 432000000 },
    ]);
  });

  it("verifica el ID token con Firebase Admin", async () => {
    const context = setup();
    issueIdToken(context, 60);
    await context.manager.createSession(ID_TOKEN);
    expect(context.verifier.callsTo("verifyIdToken")).toEqual([{ method: "verifyIdToken", idToken: ID_TOKEN }]);
  });

  it("un token emitido hace exactamente 5 minutos se acepta", async () => {
    const context = setup();
    issueIdToken(context, 300);
    await context.manager.createSession(ID_TOKEN);
    expect(context.cookies.get("session")).toBe(`cookie-de-${ID_TOKEN}`);
  });

  it.each([
    { label: "5 minutos y 1 segundo", secondsAgo: 301 },
    { label: "6 minutos", secondsAgo: 360 },
  ])("un token emitido hace $label se rechaza y no se guarda la cookie", async ({ secondsAgo }) => {
    const context = setup();
    issueIdToken(context, secondsAgo);
    await expect(context.manager.createSession(ID_TOKEN)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(context.cookies.get("session")).toBeUndefined();
  });

  it("un idToken vacío se rechaza sin llamar al verificador", async () => {
    const context = setup();
    await expect(context.manager.createSession("")).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(context.verifier.calls).toEqual([]);
    expect(context.cookies.get("session")).toBeUndefined();
  });

  it("un ID token que el verificador rechaza lanza UnauthenticatedError y no guarda cookie", async () => {
    const context = setup();
    await expect(context.manager.createSession("token-alterado")).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(context.cookies.get("session")).toBeUndefined();
  });

  it("después de crear la sesión, getSession devuelve a la persona del token", async () => {
    const context = setup();
    issueIdToken(context, 60);
    await context.manager.createSession(ID_TOKEN);
    await expect(context.manager.getSession()).resolves.toEqual(ANA);
  });
});

describe("getSession (reglas 11 y 14)", () => {
  it("con una cookie válida devuelve { uid, email } y pide revisar la revocación", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    await expect(context.manager.getSession()).resolves.toEqual(ANA);
    expect(context.verifier.callsTo("verifySessionCookie")).toEqual([
      { method: "verifySessionCookie", cookie: "cookie-valida", checkRevoked: true },
    ]);
  });

  it("si la sesión no trae email, email es null", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-sin-email");
    await expect(context.manager.getSession()).resolves.toEqual({ uid: ANA.uid, email: null });
  });

  it("una cookie revocada devuelve null", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-revocada", ANA.email);
    context.verifier.revokeSessionCookie("cookie-revocada");
    await expect(context.manager.getSession()).resolves.toBeNull();
  });

  it("una cookie vencida devuelve null", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-vieja", ANA.email);
    context.clock.advance(FIVE_DAYS_SECONDS * 1000 + 1000);
    await expect(context.manager.getSession()).resolves.toBeNull();
  });

  it("una cookie alterada devuelve null", async () => {
    const context = setup();
    context.cookies.preset("session", "cookie-inventada");
    await expect(context.manager.getSession()).resolves.toBeNull();
  });

  it("sin cookie devuelve null sin llamar al verificador", async () => {
    const context = setup();
    await expect(context.manager.getSession()).resolves.toBeNull();
    expect(context.verifier.calls).toEqual([]);
  });

  it("una cookie session vacía devuelve null sin llamar al verificador", async () => {
    const context = setup();
    context.cookies.preset("session", "");
    await expect(context.manager.getSession()).resolves.toBeNull();
    expect(context.verifier.calls).toEqual([]);
  });

  it("el uid sale de la cookie verificada y no de otra cookie del navegador", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    context.cookies.preset("uid", "uid-impostor");
    await expect(context.manager.getSession()).resolves.toEqual(ANA);
  });
});

describe("requireSession (regla 12)", () => {
  it("con una cookie válida devuelve la sesión", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    await expect(context.manager.requireSession()).resolves.toEqual(ANA);
  });

  it("sin cookie lanza UnauthenticatedError (401)", async () => {
    const context = setup();
    const failure = context.manager.requireSession();
    await expect(failure).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(failure).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });

  it("con una cookie revocada lanza UnauthenticatedError", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-revocada", ANA.email);
    context.verifier.revokeSessionCookie("cookie-revocada");
    await expect(context.manager.requireSession()).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});

describe("clearSession (regla 13)", () => {
  it("borra la cookie session", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    await context.manager.clearSession();
    expect(context.cookies.deleted).toEqual(["session"]);
    expect(context.cookies.get("session")).toBeUndefined();
  });

  it("después de cerrar la sesión, getSession devuelve null", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    await context.manager.clearSession();
    await expect(context.manager.getSession()).resolves.toBeNull();
  });
});

describe("Marca de credencial rechazada (regla 11)", () => {
  it("session exporta InvalidCredentialError, un Error con el que el verificador marca una credencial rechazada", () => {
    const error = new InvalidCredentialError("cookie alterada");
    expect(error).toBeInstanceOf(InvalidCredentialError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe("Solo una credencial rechazada da null o 401; las demás fallas se propagan (regla 11, respuesta 18)", () => {
  /** Falla que no tiene que ver con la credencial: entorno inválido, red o caída de Firebase. */
  const infrastructureFailure = () => new Error("entorno");

  it("en getSession, una falla del verificador que no es de la cookie se propaga y no da null", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    const failure = infrastructureFailure();
    context.verifier.failWith(failure);
    await expect(context.manager.getSession()).rejects.toBe(failure);
  });

  it("en createSession, una falla del verificador que no es del token se propaga y no es UnauthenticatedError", async () => {
    const context = setup();
    issueIdToken(context, 60);
    const failure = infrastructureFailure();
    context.verifier.failWith(failure);
    const attempt = context.manager.createSession(ID_TOKEN);
    await expect(attempt).rejects.toBe(failure);
    await expect(attempt).rejects.not.toBeInstanceOf(UnauthenticatedError);
    expect(context.cookies.get("session")).toBeUndefined();
  });

  it("en requireSession, una falla del verificador que no es de la cookie se propaga y no es UnauthenticatedError", async () => {
    const context = setup();
    presetValidCookie(context, "cookie-valida", ANA.email);
    const failure = infrastructureFailure();
    context.verifier.failWith(failure);
    const attempt = context.manager.requireSession();
    await expect(attempt).rejects.toBe(failure);
    await expect(attempt).rejects.not.toBeInstanceOf(UnauthenticatedError);
  });
});

describe("auth_time inválido: falla cerrada (regla 9)", () => {
  it.each([
    { label: "NaN", authTime: Number.NaN },
    { label: "Infinity", authTime: Number.POSITIVE_INFINITY },
    { label: "-Infinity", authTime: Number.NEGATIVE_INFINITY },
  ])("un ID token con auth_time $label se rechaza y no se guarda la cookie", async ({ authTime }) => {
    const context = setup();
    context.verifier.addIdToken(ID_TOKEN, { ...ANA, auth_time: authTime });
    await expect(context.manager.createSession(ID_TOKEN)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(context.cookies.get("session")).toBeUndefined();
  });
});
