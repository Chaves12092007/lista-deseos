import { FirebaseAuthError } from "firebase-admin/auth";
import type { Auth, DecodedIdToken } from "firebase-admin/auth";
import { createAdminVerifier } from "@/shared/server/admin-verifier";
import { TEST_NOW } from "./doubles";

/** Mismo contrato que `AdminAuthPort` de la interfaz: solo las tres operaciones de Firebase Admin Auth. */
type AdminAuthPortDouble = Pick<Auth, "verifyIdToken" | "createSessionCookie" | "verifySessionCookie">;

export type AdminCall =
  | { method: "verifyIdToken"; idToken: string; checkRevoked: boolean | undefined }
  | { method: "createSessionCookie"; idToken: string; expiresIn: number }
  | { method: "verifySessionCookie"; cookie: string; checkRevoked: boolean | undefined };

export const AUTH_TIME = Math.floor(TEST_NOW / 1000) - 60;

/** Token decodificado de prueba que cumple el tipo del SDK (sin `as`). */
const DECODED_ANA: DecodedIdToken = {
  aud: "demo-lista-deseos",
  auth_time: AUTH_TIME,
  email: "ana@example.com",
  exp: AUTH_TIME + 3600,
  firebase: { identities: {}, sign_in_provider: "password" },
  iat: AUTH_TIME,
  iss: "https://securetoken.google.com/demo-lista-deseos",
  sub: "uid-ana",
  uid: "uid-ana",
};

/** Doble en memoria de Firebase Admin Auth: registra llamadas; `failWith` hace que todas lancen ese error. */
export class FakeAdminAuth implements AdminAuthPortDouble {
  readonly calls: AdminCall[] = [];
  private failure: Error | undefined = undefined;

  failWith(error: Error): void {
    this.failure = error;
  }

  async verifyIdToken(idToken: string, checkRevoked?: boolean): Promise<DecodedIdToken> {
    this.calls.push({ method: "verifyIdToken", idToken, checkRevoked });
    this.throwIfFailing();
    return DECODED_ANA;
  }

  async createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string> {
    this.calls.push({ method: "createSessionCookie", idToken, expiresIn: options.expiresIn });
    this.throwIfFailing();
    return `cookie-de-${idToken}`;
  }

  async verifySessionCookie(cookie: string, checkRevoked?: boolean): Promise<DecodedIdToken> {
    this.calls.push({ method: "verifySessionCookie", cookie, checkRevoked });
    this.throwIfFailing();
    return DECODED_ANA;
  }

  private throwIfFailing(): void {
    if (this.failure !== undefined) {
      throw this.failure;
    }
  }
}

/** `FirebaseAuthError` agrega el prefijo `auth/`: se construye con el código sin prefijo. */
export function authError(codeWithoutPrefix: string): FirebaseAuthError {
  return new FirebaseAuthError({ code: codeWithoutPrefix, message: "Error de prueba" });
}

/** Verificador sobre el doble, contando cuántas veces se pide el cliente de Firebase. */
export function setupAdminVerifier() {
  const auth = new FakeAdminAuth();
  let getAuthCalls = 0;
  const verifier = createAdminVerifier(() => {
    getAuthCalls += 1;
    return auth;
  });
  return { auth, verifier, getAuthCalls: () => getAuthCalls };
}
