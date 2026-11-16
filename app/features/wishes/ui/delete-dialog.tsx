"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { FormAlert } from "@/shared/ui/form-alert";
import { DANGER_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/shared/ui/styles";
import type { Wish } from "../schema";
import { deleteWish } from "./wish-api";

/**
 * Confirmación de eliminar (F7, spec regla 27): un `<dialog>` modal nativo, con foco atrapado y `Escape`
 * para cerrar. Solo «Eliminar» llama a la ruta. El foco arranca en «Cancelar», la opción segura.
 */

interface DeleteDialogProps {
  wish: Wish;
  /** Se llama al cerrar el diálogo por cualquier camino (cancelar, `Escape` o eliminar). */
  onClose: () => void;
}

interface DeleteState {
  dialogRef: RefObject<HTMLDialogElement | null>;
  cancelRef: RefObject<HTMLButtonElement | null>;
  pending: boolean;
  message: string | null;
  confirm: () => Promise<void>;
}

function confirmLabel(pending: boolean): string {
  if (pending) {
    return "Eliminando…";
  }
  return "Eliminar";
}

/** Abre el diálogo como modal al montarse y lleva el borrado; el JSX queda en `DeleteDialog`. */
function useDeleteDialog({ wish, onClose }: DeleteDialogProps): DeleteState {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null || dialog.open) {
      return;
    }
    dialog.showModal();
    cancelRef.current?.focus();
  }, []);

  async function confirm(): Promise<void> {
    setPending(true);
    setMessage(null);
    const result = await deleteWish(wish.id);
    if (!result.ok) {
      setPending(false);
      setMessage(result.message);
      return;
    }
    router.refresh();
    onClose();
  }

  return { dialogRef, cancelRef, pending, message, confirm };
}

export function DeleteDialog(props: DeleteDialogProps) {
  const { wish, onClose } = props;
  const { dialogRef, cancelRef, pending, message, confirm } = useDeleteDialog(props);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`delete-title-${wish.id}`}
      aria-describedby={`delete-text-${wish.id}`}
      onClose={onClose}
      onCancel={(event) => {
        if (pending) {
          event.preventDefault();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border-2 border-primary-strong bg-surface p-6 text-ink backdrop:bg-primary-deep/60"
    >
      <h2 id={`delete-title-${wish.id}`} className="text-xl font-bold break-words text-primary-strong">
        ¿Eliminar «{wish.name}»?
      </h2>
      <p id={`delete-text-${wish.id}`} className="mt-2">
        No se puede deshacer.
      </p>
      <div className="mt-4">
        <FormAlert message={message} />
      </div>
      <div className="mt-6 flex flex-col gap-3 md:flex-row-reverse">
        <button type="button" disabled={pending} onClick={confirm} className={DANGER_BUTTON_CLASS}>
          {confirmLabel(pending)}
        </button>
        <button type="button" ref={cancelRef} disabled={pending} onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          Cancelar
        </button>
      </div>
    </dialog>
  );
}
