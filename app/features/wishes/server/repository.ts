import type { UpdateWishData, Wish } from "../schema";

/** Cambios que el servicio entrega al repositorio: los campos editados y la fecha nueva. */
export type WishPatch = UpdateWishData & { updated_at: string };

/**
 * Puerto de persistencia de Deseos (F4–F9). Solo guarda y busca: las reglas viven en el servicio. Todas las
 * operaciones van acotadas al dueño (`uid`), así que un `id` ajeno simplemente no existe para otra persona.
 */
export interface WishRepository {
  /**
   * Guarda el deseo solo si la persona tiene menos de `max`. Contar y guardar son una sola operación atómica.
   * Devuelve `false` (sin guardar nada) si ya alcanzó el tope.
   */
  createIfUnderLimit(uid: string, wish: Wish, max: number): Promise<boolean>;
  listByOwner(uid: string): Promise<Wish[]>;
  /** Aplica el cambio y devuelve el deseo completo; `null` si no existe para ese dueño. */
  update(uid: string, id: string, patch: WishPatch): Promise<Wish | null>;
  /** `true` si lo eliminó; `false` si no existía para ese dueño. */
  remove(uid: string, id: string): Promise<boolean>;
}
