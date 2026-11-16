import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminVerifier, hasJwtShape } from "@/shared/server/admin-verifier";
import { InvalidCredentialError } from "@/shared/server/session";
import type { SessionVerifier } from "@/shared/server/session";
import { base64url } from "./jwt-fixtures";

/**
 * Regresión: con el Emulator Suite, `POST /api/session` respondía 401 siempre. El Auth Emulator emite tokens sin
 * firmar (`alg: "none"`) con la tercera parte VACÍA (`cabecera.payload.`), y `hasJwtShape` exigía tres partes no
 * vacías: el token se rechazaba antes de llegar al SDK. Los tokens de aquí tienen la forma real del emulador.
 *
 * En modo emulador el SDK real siempre consulta al emulador (`getUser`) después de validar el token, así que sin
 * red lo comprobable es que el token LLEGA a esa consulta (pasó la forma, el contenido y la firma vacía).
 */

const PROJECT_ID = "demo-prueba-emulador";
const NOW_SECONDS = Math.floor(Date.now() / 1000);
const AUTH_TIME = NOW_SECONDS - 60; // segundos epoch, como los emite Firebase
const NETWORK_BLOCKED = "Red prohibida en pruebas";

/** Token como lo emite el Auth Emulator: cabecera `alg: none`, payload y firma vacía. */
function emulatorToken(claims: Record<string, string | number | boolean | object>): string {
  return `${base64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}.`;
}

const ID_TOKEN_CLAIMS = {
  iss: `https://securetoken.google.com/${PROJECT_ID}`,
  aud: PROJECT_ID,
  sub: "uid-ana",
  user_id: "uid-ana",
  email: "ana@example.com",
  email_verified: false,
  auth_time: AUTH_TIME,
  iat: AUTH_TIME,
  exp: AUTH_TIME + 3600,
  firebase: { identities: { email: ["ana@example.com"] }, sign_in_provider: "password" },
};

const SESSION_COOKIE_CLAIMS = {
  ...ID_TOKEN_CLAIMS,
  iss: `https://session.firebase.google.com/${PROJECT_ID}`,
  exp: AUTH_TIME + 432000,
};

const EMULATOR_ID_TOKEN = emulatorToken(ID_TOKEN_CLAIMS);
const EMULATOR_SESSION_COOKIE = emulatorToken(SESSION_COOKIE_CLAIMS);

/** Verificador sobre el SDK real (sin red). El SDK fija el modo al crear la app: una app por modo. */
function realSdkVerifier(appName: string): SessionVerifier {
  return createAdminVerifier(() => {
    const existing = getApps().find((app) => app.name === appName);
    if (existing !== undefined) {
      return getAuth(existing);
    }
    return getAuth(initializeApp({ projectId: PROJECT_ID }, appName));
  });
}

/** El SDK intentó consultar al emulador: el token pasó nuestra forma y la validación del SDK. */
async function expectReachedEmulatorLookup<T>(operation: Promise<T>): Promise<void> {
  const outcome = await operation.then(
    () => "aceptado",
    <E>(error: E) => {
      expect(error).not.toBeInstanceOf(InvalidCredentialError);
      return String(error);
    },
  );
  expect(outcome).toContain(NETWORK_BLOCKED);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Tokens del Auth Emulator: forma (regresión del 401 en POST /api/session)", () => {
  it("un ID token del emulador (firma vacía) tiene forma de JWT", () => {
    expect(hasJwtShape(EMULATOR_ID_TOKEN)).toBe(true);
  });

  it("una cookie de sesión del emulador (firma vacía) tiene forma de JWT", () => {
    expect(hasJwtShape(EMULATOR_SESSION_COOKIE)).toBe(true);
  });

  it("una firma que no es base64url sigue sin forma de JWT", () => {
    expect(hasJwtShape(`${EMULATOR_ID_TOKEN}a+b`)).toBe(false);
  });
});

describe("Tokens del Auth Emulator contra el SDK real en modo emulador", () => {
  it("verifyIdToken entrega el token al SDK y el SDK lo valida (llega a consultar el emulador)", async () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    await expectReachedEmulatorLookup(realSdkVerifier("emulador-id").verifyIdToken(EMULATOR_ID_TOKEN));
  });

  it("verifySessionCookie entrega la cookie al SDK y el SDK la valida (llega a consultar el emulador)", async () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    await expectReachedEmulatorLookup(
      realSdkVerifier("emulador-cookie").verifySessionCookie(EMULATOR_SESSION_COOKIE, true),
    );
  });
});

describe("Tokens sin firmar en producción: se rechazan como credencial, sin red y sin 500", () => {
  it("verifyIdToken con un token sin firmar lanza InvalidCredentialError (→ 401)", async () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
    await expect(realSdkVerifier("produccion-id").verifyIdToken(EMULATOR_ID_TOKEN)).rejects.toBeInstanceOf(
      InvalidCredentialError,
    );
  });

  it("verifySessionCookie con una cookie sin firmar lanza InvalidCredentialError (→ null)", async () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
    await expect(
      realSdkVerifier("produccion-cookie").verifySessionCookie(EMULATOR_SESSION_COOKIE, true),
    ).rejects.toBeInstanceOf(InvalidCredentialError);
  });
});
