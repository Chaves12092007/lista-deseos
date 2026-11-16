import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createAdminVerifier } from "./admin-verifier";
import { getAdminAuth } from "./firebase-admin";
import { createSessionManager, sessionCookieOptions } from "./session";
import type { CookieJar, Session, SessionManager } from "./session";

/**
 * Pegamento de la sesión con Next y Firebase Admin (F0, reglas 8–14). Las reglas viven en `session.ts` y la
 * traducción de errores de Firebase en `admin-verifier.ts`. Sin cookie no se toca Firebase.
 */

const verifier = createAdminVerifier(getAdminAuth);

async function sessionManager(): Promise<SessionManager> {
  // Marca la lectura como de tiempo de petición: el SDK de Firebase usa Date.now() al verificar (Cache Components).
  await connection();
  const store = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  const jar: CookieJar = {
    get: (name) => store.get(name)?.value,
    set: (name, value, options) => {
      store.set(name, value, options);
    },
    // Borrar = misma cookie vacía con `Max-Age=0` y los mismos atributos (regla 13).
    delete: (name) => {
      store.set(name, "", sessionCookieOptions(isProduction, 0));
    },
  };
  return createSessionManager({ verifier, cookies: jar, now: Date.now, isProduction });
}

export async function createSession(idToken: string): Promise<void> {
  const manager = await sessionManager();
  await manager.createSession(idToken);
}

export async function getSession(): Promise<Session | null> {
  const manager = await sessionManager();
  return manager.getSession();
}

export async function requireSession(): Promise<Session> {
  const manager = await sessionManager();
  return manager.requireSession();
}

export async function clearSession(): Promise<void> {
  const manager = await sessionManager();
  await manager.clearSession();
}
