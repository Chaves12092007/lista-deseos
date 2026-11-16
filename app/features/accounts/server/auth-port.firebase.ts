import { FirebaseAuthError } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
import { EMAIL_TAKEN_MESSAGE } from "@/features/accounts/schema";
import { ConflictError } from "@/shared/server/errors";
import type { AccountAuthPort } from "./auth-port";

/**
 * Adaptador de Cuentas con Firebase Admin Auth (F1 regla 6, F2 regla 16). Puro: recibe cómo obtener el cliente
 * y lo pide en cada operación, nunca al crearse.
 */

/** Las dos operaciones de Firebase Admin Auth que usa Cuentas. */
export type AdminAccountAuth = Pick<Auth, "createUser" | "revokeRefreshTokens">;

const EMAIL_EXISTS_CODE = "auth/email-already-exists";

/** Correo ya registrado → `ConflictError`; cualquier otro error se relanza como el mismo objeto. */
function translateCreateError<T>(error: T): never {
  if (error instanceof FirebaseAuthError && error.code === EMAIL_EXISTS_CODE) {
    throw new ConflictError(EMAIL_TAKEN_MESSAGE);
  }
  throw error;
}

export function createFirebaseAccountAuth(getAuth: () => AdminAccountAuth): AccountAuthPort {
  return {
    async createUser(account) {
      try {
        await getAuth().createUser({ email: account.email, password: account.password });
      } catch (error) {
        translateCreateError(error);
      }
    },
    async revokeSessions(uid) {
      await getAuth().revokeRefreshTokens(uid);
    },
  };
}
