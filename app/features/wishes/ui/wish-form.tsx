"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { ErrorFields } from "@/shared/schema";
import { FormAlert } from "@/shared/ui/form-alert";
import { readTextField } from "@/shared/ui/form-data";
import { SECONDARY_BUTTON_CLASS } from "@/shared/ui/styles";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";
import type { CreateWishData, Wish } from "../schema";
import { PrioritySelect } from "./priority-select";
import { createWish, updateWish } from "./wish-api";
import type { WishRequestResult } from "./wish-api";
import { parseWishForm, toUpdateInput } from "./wish-form-input";
import type { WishFormValues } from "./wish-form-input";

/**
 * Formulario de agregar y editar un deseo (F4, F6, F19; spec reglas 34 a 36). Sin `wish` agrega; con `wish`
 * edita ese deseo. Los errores salen por campo y uno general arriba del botón.
 */

interface WishFormProps {
  idPrefix: string;
  submitLabel: string;
  wish?: Wish;
  /** Se llama tras guardar con éxito. */
  onDone?: () => void;
  /** Si existe, se muestra el botón «Cancelar». */
  onCancel?: () => void;
}

interface FormState {
  pending: boolean;
  fields: ErrorFields;
  message: string | null;
}

const IDLE: FormState = { pending: false, fields: {}, message: null };
const PENDING: FormState = { pending: true, fields: {}, message: null };

function readValues(form: HTMLFormElement): WishFormValues {
  return {
    name: readTextField(form, "name"),
    store_url: readTextField(form, "store_url"),
    price_cop: readTextField(form, "price_cop"),
    priority: readTextField(form, "priority"),
  };
}

function save(wish: Wish | undefined, input: CreateWishData): Promise<WishRequestResult> {
  if (wish === undefined) {
    return createWish(input);
  }
  return updateWish(wish.id, toUpdateInput(input));
}

function WishFields({ idPrefix, wish, fields }: { idPrefix: string; wish?: Wish; fields: ErrorFields }) {
  return (
    <>
      <TextField
        id={`${idPrefix}-name`}
        name="name"
        label="Nombre"
        type="text"
        autoComplete="off"
        defaultValue={wish?.name}
        error={fields.name}
      />
      <TextField
        id={`${idPrefix}-store-url`}
        name="store_url"
        label="Enlace de la tienda"
        type="text"
        autoComplete="off"
        defaultValue={wish?.store_url}
        error={fields.store_url}
        className="md:col-span-2"
      />
      <TextField
        id={`${idPrefix}-price`}
        name="price_cop"
        label="Precio (COP)"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={wish?.price_cop.toString()}
        error={fields.price_cop}
      />
      <PrioritySelect id={`${idPrefix}-priority`} defaultValue={wish?.priority ?? "media"} error={fields.priority} />
    </>
  );
}

export function WishForm({ idPrefix, submitLabel, wish, onDone, onCancel }: WishFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(IDLE);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = parseWishForm(readValues(form));
    if (!parsed.ok) {
      setState({ pending: false, fields: parsed.fields, message: null });
      return;
    }
    setState(PENDING);
    const result = await save(wish, parsed.input);
    if (!result.ok) {
      setState({ pending: false, fields: result.fields, message: result.message });
      return;
    }
    if (wish === undefined) {
      form.reset();
    }
    setState(IDLE);
    router.refresh();
    onDone?.();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
      <WishFields idPrefix={idPrefix} wish={wish} fields={state.fields} />
      <div className="flex flex-col gap-4 md:col-span-2">
        <FormAlert message={state.message} />
        <div className="flex flex-col gap-3 md:flex-row">
          <SubmitButton pending={state.pending} label={submitLabel} pendingLabel="Guardando…" />
          {onCancel !== undefined && (
            <button type="button" onClick={onCancel} className={`${SECONDARY_BUTTON_CLASS} w-full md:w-auto`}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
