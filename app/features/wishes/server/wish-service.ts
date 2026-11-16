import { ConflictError, NotFoundError } from "@/shared/server/errors";
import {
  CreateWishInputSchema,
  MAX_WISHES_PER_USER,
  UpdateWishInputSchema,
  WISH_LIMIT_MESSAGE,
  WISH_NOT_FOUND_MESSAGE,
} from "../schema";
import type { CreateWishInput, ListWishesOutput, UpdateWishInput, Wish, WishOrder } from "../schema";
import type { WishRepository } from "./repository";

/**
 * Reglas de Deseos (F4–F9, docs/specs/f4-f9-f19-mi-lista.md). El dueño (`uid`) llega siempre desde la sesión;
 * el repositorio solo guarda y busca.
 */

export interface WishServiceDeps {
  repository: WishRepository;
  /** Reloj en ms. */
  now: () => number;
  newId: () => string;
}

export interface WishService {
  create(uid: string, input: CreateWishInput): Promise<Wish>;
  list(uid: string, order: WishOrder): Promise<ListWishesOutput>;
  update(uid: string, id: string, input: UpdateWishInput): Promise<Wish>;
  remove(uid: string, id: string): Promise<void>;
}

/** Ids que puede haber generado el servidor: 1–128 caracteres, empiezan con letra o dígito (regla 8). */
const WISH_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const PRIORITY_RANK: Record<Wish["priority"], number> = { alta: 0, media: 1, baja: 2 };

function compareNumbers(left: number, right: number): number {
  return left - right;
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/** Desempate de la regla 19: el más antiguo primero y, si empatan, por `id`. */
function compareByAge(left: Wish, right: Wish): number {
  return compareText(left.created_at, right.created_at) || compareText(left.id, right.id);
}

function compareByOrder(order: WishOrder, left: Wish, right: Wish): number {
  if (order === "precio-asc") {
    return compareNumbers(left.price_cop, right.price_cop) || compareByAge(left, right);
  }
  if (order === "precio-desc") {
    return compareNumbers(right.price_cop, left.price_cop) || compareByAge(left, right);
  }
  return compareNumbers(PRIORITY_RANK[left.priority], PRIORITY_RANK[right.priority]) || compareByAge(left, right);
}

/** Pendientes primero y comprados al final; cada bloque con el criterio pedido (reglas 19 y 20). */
function sortWishes(wishes: Wish[], order: WishOrder): Wish[] {
  const sorter = (left: Wish, right: Wish): number => compareByOrder(order, left, right);
  const pending = wishes.filter((wish) => !wish.purchased).sort(sorter);
  const purchased = wishes.filter((wish) => wish.purchased).sort(sorter);
  return [...pending, ...purchased];
}

function totalPending(wishes: Wish[]): number {
  return wishes.filter((wish) => !wish.purchased).reduce((sum, wish) => sum + wish.price_cop, 0);
}

function assertWishId(id: string): void {
  if (!WISH_ID_PATTERN.test(id)) {
    throw new NotFoundError(WISH_NOT_FOUND_MESSAGE);
  }
}

export function createWishService(deps: WishServiceDeps): WishService {
  const timestamp = (): string => new Date(deps.now()).toISOString();

  return {
    /** Reglas 5–11: valida de nuevo, completa los valores por defecto y guarda dentro del tope atómico. */
    async create(uid, input) {
      const data = CreateWishInputSchema.parse(input);
      const at = timestamp();
      const wish: Wish = { ...data, id: deps.newId(), created_at: at, updated_at: at };
      const saved = await deps.repository.createIfUnderLimit(uid, wish, MAX_WISHES_PER_USER);
      if (!saved) {
        throw new ConflictError(WISH_LIMIT_MESSAGE);
      }
      return wish;
    },

    /** Reglas 16, 19 y 20: la lista ordenada y el total de pendientes salen del servicio. */
    async list(uid, order) {
      const wishes = await deps.repository.listByOwner(uid);
      return { wishes: sortWishes(wishes, order), total_pending_cop: totalPending(wishes) };
    },

    /** Reglas 8 y 23 a 25: un id mal formado, inexistente o ajeno es el mismo 404. */
    async update(uid, id, input) {
      assertWishId(id);
      const data = UpdateWishInputSchema.parse(input);
      const updated = await deps.repository.update(uid, id, { ...data, updated_at: timestamp() });
      if (updated === null) {
        throw new NotFoundError(WISH_NOT_FOUND_MESSAGE);
      }
      return updated;
    },

    /** Reglas 8 y 26. */
    async remove(uid, id) {
      assertWishId(id);
      const removed = await deps.repository.remove(uid, id);
      if (!removed) {
        throw new NotFoundError(WISH_NOT_FOUND_MESSAGE);
      }
    },
  };
}
