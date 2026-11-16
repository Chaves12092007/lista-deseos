import type { Session } from "@/shared/server/session";

/** Cuenta por crear. La contraseña solo viaja hasta Firebase Auth; nunca se guarda ni se registra. */
export interface NewAccount {
  email: string;
  password: string;
}

/** Firebase Auth visto desde Cuentas. */
export interface AccountAuthPort {
  /** Correo ya registrado → lanza ConflictError(EMAIL_TAKEN_MESSAGE). Cualquier otro error se propaga tal cual. */
  createUser(account: NewAccount): Promise<void>;
  /** Revoca los refresh tokens del uid (cierra todas sus sesiones). */
  revokeSessions(uid: string): Promise<void>;
}

/** Sesión de F0 (session-next.ts la cumple por estructura). */
export interface SessionPort {
  createSession(idToken: string): Promise<void>;
  getSession(): Promise<Session | null>;
  clearSession(): Promise<void>;
}
