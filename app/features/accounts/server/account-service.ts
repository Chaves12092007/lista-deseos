import { CreateSessionInputSchema, RegisterAccountInputSchema } from "@/features/accounts/schema";
import type { CreateSessionInput, RegisterAccountInput, RegisterAccountOutput } from "@/features/accounts/schema";
import type { AccountAuthPort, SessionPort } from "./auth-port";

/**
 * Reglas de Cuentas (F1 y F2, docs/specs/f1-f2-f18-cuentas.md). Firebase Auth y la cookie de sesión llegan
 * por puertos; el `uid` que se revoca sale siempre de la sesión, nunca del navegador.
 */

export interface AccountServiceDeps {
  auth: AccountAuthPort;
  sessions: SessionPort;
}

export interface AccountService {
  register(input: RegisterAccountInput): Promise<RegisterAccountOutput>;
  startSession(input: CreateSessionInput): Promise<void>;
  endSession(): Promise<void>;
}

export function createAccountService(deps: AccountServiceDeps): AccountService {
  return {
    /** Reglas 2–7: valida de nuevo, crea la cuenta con el correo normalizado y devuelve solo el correo. */
    async register(input) {
      const data = RegisterAccountInputSchema.parse(input);
      await deps.auth.createUser({ email: data.email, password: data.password });
      return { email: data.email };
    },

    /** Regla 13: `id_token` de 1 a 4096 caracteres antes de tocar Firebase. */
    async startSession(input) {
      const data = CreateSessionInputSchema.parse(input);
      await deps.sessions.createSession(data.id_token);
    },

    /** Reglas 16–18: revoca primero; si revocar falla, la cookie se queda para poder reintentar. */
    async endSession() {
      const session = await deps.sessions.getSession();
      if (session !== null) {
        await deps.auth.revokeSessions(session.uid);
      }
      await deps.sessions.clearSession();
    },
  };
}
