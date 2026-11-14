import { UnauthenticatedError } from "./errors";

/**
 * Sesión con la cookie de Firebase (F0, reglas 8–14 y 30). Lógica pura: Firebase y las cookies llegan
 * por puertos (`SessionVerifier`, `CookieJar`); el pegamento con Next está en `session-next.ts`.
 */

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 432000; // 5 días
export const MAX_TOKEN_AGE_SECONDS = 300; // 5 min

const EXPIRED_TOKEN_MESSAGE = "Tu ingreso venció. Vuelve a iniciar sesión.";

/**
 * Marca de credencial rechazada (token o cookie inválidos, vencidos o revocados). El verificador la lanza solo
 * en ese caso; es lo único que se convierte en `null`/401. Cualquier otra falla se propaga (regla 11).
 */
export class InvalidCredentialError extends Error {
  constructor(message: string = "Credencial rechazada") {
    super(message);
    this.name = "InvalidCredentialError";
  }
}

export interface Session {
  uid: string;
  email: string | null;
}

/** `auth_time` en segundos (epoch). */
export interface VerifiedIdToken {
  uid: string;
  email?: string;
  auth_time: number;
}

export interface VerifiedSessionCookie {
  uid: string;
  email?: string;
}

/** Puerto de Firebase Admin Auth. Cada método lanza si rechaza el token o la cookie. */
export interface SessionVerifier {
  verifyIdToken(idToken: string): Promise<VerifiedIdToken>;
  /** `expiresIn` en ms. */
  createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string>;
  verifySessionCookie(cookie: string, checkRevoked: boolean): Promise<VerifiedSessionCookie>;
}

export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
}

export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, options: SessionCookieOptions): void;
  delete(name: string): void;
}

/** `now` devuelve ms. */
export interface SessionDeps {
  verifier: SessionVerifier;
  cookies: CookieJar;
  now: () => number;
  isProduction: boolean;
}

export interface SessionManager {
  createSession(idToken: string): Promise<void>;
  getSession(): Promise<Session | null>;
  requireSession(): Promise<Session>;
  clearSession(): Promise<void>;
}

/** Atributos de la cookie `session` (regla 10); `maxAge` en segundos. */
export function sessionCookieOptions(
  isProduction: boolean,
  maxAge: number = SESSION_MAX_AGE_SECONDS,
): SessionCookieOptions {
  return { httpOnly: true, sameSite: "lax", path: "/", maxAge, secure: isProduction };
}

/** Una credencial rechazada pasa a `UnauthenticatedError`; cualquier otra falla se devuelve tal cual. */
function toUnauthenticated<T>(error: T): T | UnauthenticatedError {
  if (error instanceof InvalidCredentialError) {
    return new UnauthenticatedError();
  }
  return error;
}

/** Ejecuta una verificación de Firebase; solo una credencial rechazada se convierte en `UnauthenticatedError`. */
async function orUnauthenticated<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw toUnauthenticated(error);
  }
}

/** Cookie rechazada → `null`; cualquier otra falla se relanza (regla 11). */
function nullIfRejected<T>(error: T): null {
  if (error instanceof InvalidCredentialError) {
    return null;
  }
  throw error;
}

async function readSession(deps: SessionDeps): Promise<Session | null> {
  const cookie = deps.cookies.get(SESSION_COOKIE);
  if (cookie === undefined || cookie === "") {
    return null;
  }
  try {
    const claims = await deps.verifier.verifySessionCookie(cookie, true);
    return { uid: claims.uid, email: claims.email ?? null };
  } catch (error) {
    return nullIfRejected(error);
  }
}

/** Falla cerrada: solo se acepta un `auth_time` finito emitido hace ≤ 5 min (regla 9). */
function isFreshToken(authTimeSeconds: number, nowMs: number): boolean {
  if (!Number.isFinite(authTimeSeconds)) {
    return false;
  }
  return nowMs - authTimeSeconds * 1000 <= MAX_TOKEN_AGE_SECONDS * 1000;
}

async function startSession(deps: SessionDeps, idToken: string): Promise<void> {
  if (idToken === "") {
    throw new UnauthenticatedError();
  }
  const token = await orUnauthenticated(() => deps.verifier.verifyIdToken(idToken));
  if (!isFreshToken(token.auth_time, deps.now())) {
    throw new UnauthenticatedError(EXPIRED_TOKEN_MESSAGE);
  }
  const expiresIn = SESSION_MAX_AGE_SECONDS * 1000;
  const cookie = await orUnauthenticated(() => deps.verifier.createSessionCookie(idToken, { expiresIn }));
  deps.cookies.set(SESSION_COOKIE, cookie, sessionCookieOptions(deps.isProduction));
}

export function createSessionManager(deps: SessionDeps): SessionManager {
  return {
    createSession: (idToken) => startSession(deps, idToken),
    getSession: () => readSession(deps),
    async requireSession() {
      const session = await readSession(deps);
      if (session === null) {
        throw new UnauthenticatedError();
      }
      return session;
    },
    async clearSession() {
      deps.cookies.delete(SESSION_COOKIE);
    },
  };
}
