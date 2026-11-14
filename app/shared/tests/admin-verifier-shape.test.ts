import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { describe, expect, it } from "vitest";
import { createAdminVerifier, hasJwtShape } from "@/shared/server/admin-verifier";
import { createSessionManager, InvalidCredentialError } from "@/shared/server/session";
import type { SessionVerifier } from "@/shared/server/session";
import { setupAdminVerifier } from "./admin-auth-double";
import { FakeClock, FakeCookieJar } from "./doubles";
import { base64url, jwtFrom, MALFORMED_TOKENS } from "./jwt-fixtures";

const HEADER = JSON.stringify({ alg: "RS256", typ: "JWT" });
const R1_APP_NAME = "r1";

/** Verificador sobre el SDK real de Firebase Admin, sin red: la app se reutiliza si ya existe. */
function realSdkVerifier(): SessionVerifier {
  return createAdminVerifier(() => {
    const existing = getApps().find((app) => app.name === R1_APP_NAME);
    if (existing !== undefined) {
      return getAuth(existing);
    }
    return getAuth(initializeApp({ projectId: "demo-prueba-r1" }, R1_APP_NAME));
  });
}

describe("hasJwtShape: forma de JWT antes de llamar al SDK (regla 11, hallazgo R1)", () => {
  it("un JWT con cabecera, payload de objeto y firma en base64url tiene forma válida", () => {
    expect(hasJwtShape(jwtFrom(HEADER, JSON.stringify({ sub: "u1" }), "x"))).toBe(true);
  });

  it.each([
    { label: "texto vacío", token: "" },
    { label: "una sola parte", token: "abc" },
    { label: "dos partes", token: "a.b" },
    { label: "cuatro partes", token: `${jwtFrom(HEADER, JSON.stringify({ sub: "u1" }))}.${base64url("extra")}` },
    { label: "una parte vacía", token: "a..c" },
    { label: "caracteres que no son base64url", token: "a+b.c.d" },
    { label: "payload que no es JSON", token: jwtFrom(HEADER, "no-json") },
    { label: "payload null", token: jwtFrom(HEADER, "null") },
    { label: "payload que es una lista", token: jwtFrom(HEADER, "[1]") },
    { label: "payload que es un texto JSON", token: jwtFrom(HEADER, '"texto"') },
    { label: "cabecera que no es un objeto", token: jwtFrom('"cabecera"', JSON.stringify({ sub: "u1" })) },
  ])("$label no tiene forma de JWT", ({ token }) => {
    expect(hasJwtShape(token)).toBe(false);
  });
});

const operations = [
  { name: "verifyIdToken", run: (verifier: SessionVerifier, token: string) => verifier.verifyIdToken(token) },
  {
    name: "createSessionCookie",
    run: (verifier: SessionVerifier, token: string) => verifier.createSessionCookie(token, { expiresIn: 432000000 }),
  },
  {
    name: "verifySessionCookie",
    run: (verifier: SessionVerifier, token: string) => verifier.verifySessionCookie(token, true),
  },
];

const operationsByToken = operations.flatMap((operation) =>
  MALFORMED_TOKENS.map((malformed) => ({ ...operation, label: malformed.label, token: malformed.token })),
);

describe("El verificador rechaza la forma inválida sin tocar el SDK (hallazgo R1)", () => {
  it.each(operationsByToken)(
    "en $name, un token con $label lanza InvalidCredentialError sin pedir el cliente de Firebase",
    async ({ run, token }) => {
      const context = setupAdminVerifier();
      await expect((async () => run(context.verifier, token))()).rejects.toBeInstanceOf(InvalidCredentialError);
      expect(context.getAuthCalls()).toBe(0);
      expect(context.auth.calls).toEqual([]);
    },
  );
});

describe("Regresión R1 contra el SDK real de Firebase Admin (sin red)", () => {
  it.each(MALFORMED_TOKENS)("verifySessionCookie con $label rechaza con InvalidCredentialError", async ({ token }) => {
    await expect(realSdkVerifier().verifySessionCookie(token, true)).rejects.toBeInstanceOf(InvalidCredentialError);
  });

  it.each(MALFORMED_TOKENS)("verifyIdToken con $label rechaza con InvalidCredentialError", async ({ token }) => {
    await expect(realSdkVerifier().verifyIdToken(token)).rejects.toBeInstanceOf(InvalidCredentialError);
  });

  it.each(MALFORMED_TOKENS)("getSession con una cookie de $label devuelve null (no un 500)", async ({ token }) => {
    const clock = new FakeClock();
    const cookies = new FakeCookieJar();
    cookies.preset("session", token);
    const manager = createSessionManager({ verifier: realSdkVerifier(), cookies, now: clock.now, isProduction: false });
    await expect(manager.getSession()).resolves.toBeNull();
  });
});
