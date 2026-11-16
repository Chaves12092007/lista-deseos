"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DANGER_OUTLINE_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/shared/ui/styles";
import type { Wish } from "../schema";
import { DeleteDialog } from "./delete-dialog";
import { updateWish } from "./wish-api";

/** Botones de un deseo: Editar, marcar o desmarcar comprado (F8) y Eliminar con confirmación (F7). */

interface WishActionsProps {
  wish: Wish;
  onEdit: () => void;
}

function toggleLabel(wish: Wish, pending: boolean): string {
  if (pending) {
    return "Guardando…";
  }
  if (wish.purchased) {
    return "Marcar como pendiente";
  }
  return "Marcar como comprado";
}

export function WishActions({ wish, onEdit }: WishActionsProps) {
  const router = useRouter();
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleToggle(): Promise<void> {
    setPending(true);
    setMessage(null);
    const result = await updateWish(wish.id, { purchased: !wish.purchased });
    setPending(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  function handleDialogClose(): void {
    setConfirming(false);
    deleteButtonRef.current?.focus();
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
        <button type="button" onClick={onEdit} aria-label={`Editar ${wish.name}`} className={SECONDARY_BUTTON_CLASS}>
          Editar
        </button>
        <button type="button" onClick={handleToggle} disabled={pending} className={SECONDARY_BUTTON_CLASS}>
          {toggleLabel(wish, pending)}
        </button>
        <button
          type="button"
          ref={deleteButtonRef}
          onClick={() => setConfirming(true)}
          aria-label={`Eliminar ${wish.name}`}
          className={DANGER_OUTLINE_BUTTON_CLASS}
        >
          Eliminar
        </button>
      </div>
      {message !== null && (
        <p role="alert" className="mt-3 rounded-md border-2 border-danger bg-surface p-3 text-danger">
          {message}
        </p>
      )}
      {confirming && <DeleteDialog wish={wish} onClose={handleDialogClose} />}
    </>
  );
}
