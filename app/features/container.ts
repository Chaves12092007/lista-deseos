import "server-only";
import { createAccountService } from "./accounts/server/account-service";
import type { AccountService } from "./accounts/server/account-service";
import { createFirebaseAccountAuth } from "./accounts/server/auth-port.firebase";
import { createFirestoreWishRepository } from "./wishes/server/repository.firestore";
import { createWishService } from "./wishes/server/wish-service";
import type { WishService } from "./wishes/server/wish-service";
import { getAdminAuth, getFirestore } from "@/shared/server/firebase-admin";
import { clearSession, createSession, getSession } from "@/shared/server/session-next";

/**
 * Raíz de composición: el único lugar que conecta las features con sus adaptadores reales. Construir los
 * servicios no toca Firebase: los adaptadores piden el cliente en cada operación.
 */

export function getAccountService(): AccountService {
  return createAccountService({
    auth: createFirebaseAccountAuth(getAdminAuth),
    sessions: { createSession, getSession, clearSession },
  });
}

export function getWishService(): WishService {
  return createWishService({
    repository: createFirestoreWishRepository(getFirestore),
    now: Date.now,
    newId: () => crypto.randomUUID(),
  });
}
