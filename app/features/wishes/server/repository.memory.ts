import type { Wish } from "../schema";
import type { WishPatch, WishRepository } from "./repository";

/** Repositorio en memoria para las pruebas (spec, regla 30). Guarda copias para que nada se cambie desde fuera. */
export class InMemoryWishRepository implements WishRepository {
  private readonly byOwner = new Map<string, Map<string, Wish>>();

  async createIfUnderLimit(uid: string, wish: Wish, max: number): Promise<boolean> {
    const owned = this.ownerWishes(uid);
    if (owned.size >= max) {
      return false;
    }
    owned.set(wish.id, { ...wish });
    return true;
  }

  async listByOwner(uid: string): Promise<Wish[]> {
    return [...this.ownerWishes(uid).values()].map((wish) => ({ ...wish }));
  }

  async update(uid: string, id: string, patch: WishPatch): Promise<Wish | null> {
    const owned = this.ownerWishes(uid);
    const current = owned.get(id);
    if (current === undefined) {
      return null;
    }
    const updated: Wish = { ...current, ...patch };
    owned.set(id, updated);
    return { ...updated };
  }

  async remove(uid: string, id: string): Promise<boolean> {
    return this.ownerWishes(uid).delete(id);
  }

  private ownerWishes(uid: string): Map<string, Wish> {
    const existing = this.byOwner.get(uid);
    if (existing !== undefined) {
      return existing;
    }
    const created = new Map<string, Wish>();
    this.byOwner.set(uid, created);
    return created;
  }
}
