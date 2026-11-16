"use client";

import { useState } from "react";
import type { Priority, Wish } from "../schema";
import { formatCop, storeHost } from "./format";
import { WishActions } from "./wish-actions";
import { WishForm } from "./wish-form";

/** Un deseo de la lista (F5): sus datos, sus acciones y, al editar, el mismo formulario de agregar (regla 34). */

const PRIORITY_LABEL: Record<Priority, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const CARD_CLASS = "h-full rounded-lg border border-line bg-surface p-4 shadow-sm";

function titleClass(purchased: boolean): string {
  if (purchased) {
    return "text-lg font-semibold break-words text-ink-muted line-through";
  }
  return "text-lg font-semibold break-words text-primary-strong";
}

function statusLabel(purchased: boolean): string {
  if (purchased) {
    return "Comprado";
  }
  return "Pendiente";
}

function WishDetails({ wish }: { wish: Wish }) {
  const host = storeHost(wish.store_url);
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <dt className="font-semibold">Tienda</dt>
      <dd className="break-all">
        <a
          href={wish.store_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${host} (se abre en una pestaña nueva)`}
        >
          {host}
        </a>
      </dd>
      <dt className="font-semibold">Precio</dt>
      <dd>{formatCop(wish.price_cop)}</dd>
      <dt className="font-semibold">Prioridad</dt>
      <dd>{PRIORITY_LABEL[wish.priority]}</dd>
      <dt className="font-semibold">Estado</dt>
      <dd>{statusLabel(wish.purchased)}</dd>
    </dl>
  );
}

export function WishItem({ wish }: { wish: Wish }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="md:col-span-2 lg:col-span-3">
        <article aria-labelledby={`edit-title-${wish.id}`} className={CARD_CLASS}>
          <h3 id={`edit-title-${wish.id}`} className="text-lg font-semibold text-primary-strong">
            Editar deseo
          </h3>
          <WishForm
            idPrefix={`edit-${wish.id}`}
            submitLabel="Guardar cambios"
            wish={wish}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </article>
      </li>
    );
  }
  return (
    <li>
      <article aria-labelledby={`wish-title-${wish.id}`} className={CARD_CLASS}>
        <h3 id={`wish-title-${wish.id}`} className={titleClass(wish.purchased)}>
          {wish.name}
        </h3>
        <WishDetails wish={wish} />
        <WishActions wish={wish} onEdit={() => setEditing(true)} />
      </article>
    </li>
  );
}
