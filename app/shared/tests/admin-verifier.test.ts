import { describe, expect, it } from "vitest";
import { createAdminVerifier } from "@/shared/server/admin-verifier";
import { EnvError } from "@/shared/server/env";
import { InvalidCredentialError } from "@/shared/server/session";
import type { SessionVerifier } from "@/shared/server/session";
import { AUTH_TIME, authError, setupAdminVerifier } from "./admin-auth-double";
import { SHAPED_ID_TOKEN, SHAPED_SESSION_COOKIE } from "./jwt-fixtures";

const setup = setupAdminVerifier;

// Los tokens tienen forma de JWT para pasar la revisión previa (hallazgo R1) y llegar al doble del SDK.
const operations = [
  { name: "verifyIdToken", run: (verifier: SessionVerifier) => verifier.verifyIdToken(SHAPED_ID_TOKEN) },
  {
    name: "createSessionCookie",
    run: (verifier: SessionVerifier) => verifier.createSessionCookie(SHAPED_ID_TOKEN, { expiresIn: 432000000 }),
  },
  {
    name: "verifySessionCookie",
    run: (verifier: SessionVerifier) => verifier.verifySessionCookie(SHAPED_SESSION_COOKIE, true),
  },
];

describe("Adaptador de sesión con Firebase Admin: llamadas (regla 30)", () => {
  it("no toca Firebase (getAuth) hasta que se usa una operación", () => {
    const context = setup();
    expect(context.getAuthCalls()).toBe(0);
    expect(context.auth.calls).toEqual([]);
  });

  it.each(operations)("$name obtiene el cliente de Firebase al usarse", async ({ run }) => {
    const context = setup();
    await run(context.verifier);
    expect(context.getAuthCalls()).toBeGreaterThanOrEqual(1);
  });

  it("verifyIdToken pasa el token y devuelve uid, email y auth_time", async () => {
    const context = setup();
    const verified = await context.verifier.verifyIdToken(SHAPED_ID_TOKEN);
    expect(context.auth.calls).toHaveLength(1);
    expect(context.auth.calls[0]).toMatchObject({ method: "verifyIdToken", idToken: SHAPED_ID_TOKEN });
    expect(verified).toMatchObject({ uid: "uid-ana", email: "ana@example.com", auth_time: AUTH_TIME });
  });

  it("createSessionCookie pasa el token y expiresIn tal cual, y devuelve la cookie", async () => {
    const context = setup();
    const cookie = await context.verifier.createSessionCookie(SHAPED_ID_TOKEN, { expiresIn: 432000000 });
    expect(context.auth.calls).toEqual([
      { method: "createSessionCookie", idToken: SHAPED_ID_TOKEN, expiresIn: 432000000 },
    ]);
    expect(cookie).toBe(`cookie-de-${SHAPED_ID_TOKEN}`);
  });

  it("verifySessionCookie pasa la cookie y checkRevoked = true, y devuelve uid y email", async () => {
    const context = setup();
    const verified = await context.verifier.verifySessionCookie(SHAPED_SESSION_COOKIE, true);
    expect(context.auth.calls).toEqual([
      { method: "verifySessionCookie", cookie: SHAPED_SESSION_COOKIE, checkRevoked: true },
    ]);
    expect(verified).toMatchObject({ uid: "uid-ana", email: "ana@example.com" });
  });
});

describe("Adaptador de sesión: credencial rechazada → InvalidCredentialError (regla 11)", () => {
  it.each(operations)("en $name, auth/session-cookie-revoked se vuelve InvalidCredentialError", async ({ run }) => {
    const context = setup();
    context.auth.failWith(authError("session-cookie-revoked"));
    await expect(run(context.verifier)).rejects.toBeInstanceOf(InvalidCredentialError);
  });

  it.each(operations)("en $name, auth/id-token-expired se vuelve InvalidCredentialError", async ({ run }) => {
    const context = setup();
    context.auth.failWith(authError("id-token-expired"));
    await expect(run(context.verifier)).rejects.toBeInstanceOf(InvalidCredentialError);
  });
});

describe("Adaptador de sesión: las demás fallas se propagan tal cual (regla 11, respuesta 18)", () => {
  it.each(operations)("en $name, un FirebaseAuthError auth/internal-error se propaga igual", async ({ run }) => {
    const context = setup();
    const failure = authError("internal-error");
    context.auth.failWith(failure);
    await expect(run(context.verifier)).rejects.toBe(failure);
  });

  it.each(operations)("en $name, un Error común se propaga igual", async ({ run }) => {
    const context = setup();
    const failure = new Error("red caída");
    context.auth.failWith(failure);
    await expect(run(context.verifier)).rejects.toBe(failure);
  });

  it.each(operations)("en $name, un EnvError lanzado por getAuth() se propaga igual", async ({ run }) => {
    const failure = new EnvError("FIREBASE_PROJECT_ID: falta");
    const verifier = createAdminVerifier(() => {
      throw failure;
    });
    // Se envuelve en una función async para aceptar tanto un rechazo como un lanzamiento inmediato.
    await expect((async () => run(verifier))()).rejects.toBe(failure);
  });
});
