import { InvalidCredentialError } from "@/shared/server/session";
import type {
  CookieJar,
  SessionCookieOptions,
  SessionVerifier,
  VerifiedIdToken,
  VerifiedSessionCookie,
} from "@/shared/server/session";

/** Momento fijo de las pruebas: 13 de noviembre de 2026, 12:00 UTC (en ms). Nunca el reloj real. */
export const TEST_NOW = Date.UTC(2026, 10, 13, 12, 0, 0);

/** Reloj inyectable: `now()` devuelve ms; `advance` lo mueve sin esperar. */
export class FakeClock {
  private current: number;

  constructor(start: number = TEST_NOW) {
    this.current = start;
  }

  readonly now = (): number => this.current;

  advance(milliseconds: number): void {
    this.current += milliseconds;
  }
}

/** `auth_time` (segundos epoch) de un token emitido hace `secondsAgo` segundos respecto de `nowMs`. */
export function authTimeSecondsAgo(nowMs: number, secondsAgo: number): number {
  return Math.floor(nowMs / 1000) - secondsAgo;
}

export type VerifierCall =
  | { method: "verifyIdToken"; idToken: string }
  | { method: "createSessionCookie"; idToken: string; expiresIn: number }
  | { method: "verifySessionCookie"; cookie: string; checkRevoked: boolean };

interface StoredSessionCookie {
  claims: VerifiedSessionCookie;
  expiresAt: number;
}

/**
 * Doble en memoria de Firebase Admin Auth.
 * - Un ID token es válido solo si se registró con `addIdToken`; si no, se rechaza (como uno alterado).
 * - `createSessionCookie` devuelve `cookie-de-<idToken>` y la recuerda con su vencimiento.
 * - Una cookie revocada solo se rechaza cuando se pide `checkRevoked = true` (como el SDK real).
 * - Toda credencial rechazada lanza `InvalidCredentialError` (lo que hace el adaptador real con Firebase).
 * - `failWith(error)` simula una falla que no es de la credencial (entorno, red, caída): todo lanza ese error.
 */
export class FakeSessionVerifier implements SessionVerifier {
  readonly calls: VerifierCall[] = [];
  private readonly idTokens = new Map<string, VerifiedIdToken>();
  private readonly sessionCookies = new Map<string, StoredSessionCookie>();
  private readonly revokedCookies = new Set<string>();
  private failure: Error | undefined = undefined;

  constructor(private readonly clock: FakeClock) {}

  addIdToken(idToken: string, claims: VerifiedIdToken): void {
    this.idTokens.set(idToken, claims);
  }

  addSessionCookie(cookie: string, claims: VerifiedSessionCookie, expiresAt: number): void {
    this.sessionCookies.set(cookie, { claims, expiresAt });
  }

  revokeSessionCookie(cookie: string): void {
    this.revokedCookies.add(cookie);
  }

  failWith(error: Error): void {
    this.failure = error;
  }

  callsTo(method: VerifierCall["method"]): VerifierCall[] {
    return this.calls.filter((call) => call.method === method);
  }

  async verifyIdToken(idToken: string): Promise<VerifiedIdToken> {
    this.calls.push({ method: "verifyIdToken", idToken });
    this.throwIfFailing();
    const claims = this.idTokens.get(idToken);
    if (claims === undefined) {
      throw new InvalidCredentialError("auth/argument-error: token rechazado");
    }
    return claims;
  }

  async createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string> {
    this.calls.push({ method: "createSessionCookie", idToken, expiresIn: options.expiresIn });
    this.throwIfFailing();
    const claims = this.idTokens.get(idToken);
    if (claims === undefined) {
      throw new InvalidCredentialError("auth/invalid-id-token");
    }
    const cookie = `cookie-de-${idToken}`;
    const sessionClaims: VerifiedSessionCookie = { uid: claims.uid };
    if (claims.email !== undefined) {
      sessionClaims.email = claims.email;
    }
    this.addSessionCookie(cookie, sessionClaims, this.clock.now() + options.expiresIn);
    return cookie;
  }

  async verifySessionCookie(cookie: string, checkRevoked: boolean): Promise<VerifiedSessionCookie> {
    this.calls.push({ method: "verifySessionCookie", cookie, checkRevoked });
    this.throwIfFailing();
    const stored = this.sessionCookies.get(cookie);
    if (stored === undefined) {
      throw new InvalidCredentialError("auth/argument-error: cookie alterada");
    }
    if (this.clock.now() >= stored.expiresAt) {
      throw new InvalidCredentialError("auth/session-cookie-expired");
    }
    if (checkRevoked && this.revokedCookies.has(cookie)) {
      throw new InvalidCredentialError("auth/session-cookie-revoked");
    }
    return stored.claims;
  }

  private throwIfFailing(): void {
    if (this.failure !== undefined) {
      throw this.failure;
    }
  }
}

export interface StoredCookie {
  value: string;
  options: SessionCookieOptions;
}

/** Doble en memoria del almacén de cookies: guarda nombre, valor y opciones; registra los borrados. */
export class FakeCookieJar implements CookieJar {
  readonly stored = new Map<string, StoredCookie>();
  readonly deleted: string[] = [];

  /** Simula que el navegador ya trae una cookie (sin opciones relevantes). */
  preset(name: string, value: string): void {
    this.stored.set(name, {
      value,
      options: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 432000, secure: false },
    });
  }

  get(name: string): string | undefined {
    return this.stored.get(name)?.value;
  }

  set(name: string, value: string, options: SessionCookieOptions): void {
    this.stored.set(name, { value, options });
  }

  delete(name: string): void {
    this.deleted.push(name);
    this.stored.delete(name);
  }
}
