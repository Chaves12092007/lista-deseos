import type { Firestore } from "firebase-admin/firestore";
import { WishSchema } from "../schema";
import type { Wish } from "../schema";
import type { WishPatch, WishRepository } from "./repository";

/**
 * Repositorio de Deseos con Firestore (ADR-0003, spec reglas 28 a 31). Colección `users/{uid}/wishes/{id}`: todo
 * va acotado al dueño. Cada documento leído se valida con Zod; uno corrupto lanza un error (500 genérico).
 * Puro: recibe cómo obtener el cliente y lo pide en cada operación, nunca al crearse.
 */

type FirestoreSource = () => Firestore;

function wishesOf(db: Firestore, uid: string) {
  return db.collection("users").doc(uid).collection("wishes");
}

/** `snapshot.data()` más su id, validado con el esquema. */
function toWish(id: string, data: object | undefined): Wish {
  return WishSchema.parse({ ...data, id });
}

function toDocument(wish: Wish): object {
  return {
    name: wish.name,
    store_url: wish.store_url,
    price_cop: wish.price_cop,
    priority: wish.priority,
    purchased: wish.purchased,
    created_at: wish.created_at,
    updated_at: wish.updated_at,
  };
}

export function createFirestoreWishRepository(getDb: FirestoreSource): WishRepository {
  return {
    /**
     * Dentro de la transacción se leen los ids de la persona (como máximo `max`, así que es barato) y se guarda
     * solo si hay cupo. Firestore reintenta la transacción si otra escribe en la misma colección a la vez.
     */
    async createIfUnderLimit(uid, wish, max) {
      const db = getDb();
      const collection = wishesOf(db, uid);
      return db.runTransaction(async (transaction) => {
        const existing = await transaction.get(collection.select());
        if (existing.size >= max) {
          return false;
        }
        transaction.create(collection.doc(wish.id), toDocument(wish));
        return true;
      });
    },

    async listByOwner(uid) {
      const snapshot = await wishesOf(getDb(), uid).get();
      return snapshot.docs.map((doc) => toWish(doc.id, doc.data()));
    },

    async update(uid, id, patch: WishPatch) {
      const db = getDb();
      const reference = wishesOf(db, uid).doc(id);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          return null;
        }
        transaction.update(reference, { ...patch });
        return toWish(id, { ...snapshot.data(), ...patch });
      });
    },

    async remove(uid, id) {
      const db = getDb();
      const reference = wishesOf(db, uid).doc(id);
      return db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists) {
          return false;
        }
        transaction.delete(reference);
        return true;
      });
    },
  };
}
