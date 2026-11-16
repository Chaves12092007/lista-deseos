import type { ErrorFields } from "@/shared/schema";
import { fieldErrorsFromIssues } from "@/shared/ui/form-data";
import { CreateWishInputSchema, PRICE_NOT_INTEGER_MESSAGE, PRICE_REQUIRED_MESSAGE } from "../schema";
import type { CreateWishData, UpdateWishInput } from "../schema";

/** Lectura del formulario sin red (spec, regla 35): el servidor vuelve a validar todo. */

export interface WishFormValues {
  name: string;
  store_url: string;
  price_cop: string;
  priority: string;
}

export type WishFormResult = { ok: true; input: CreateWishData } | { ok: false; fields: ErrorFields };

type PriceResult = { ok: true; value: number } | { ok: false; message: string };

/** Enteros con signo opcional; los negativos y los muy grandes los rechaza el contrato con su mensaje. */
const INTEGER_PATTERN = /^-?\d+$/;

function readPrice(text: string): PriceResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: false, message: PRICE_REQUIRED_MESSAGE };
  }
  if (!INTEGER_PATTERN.test(trimmed)) {
    return { ok: false, message: PRICE_NOT_INTEGER_MESSAGE };
  }
  return { ok: true, value: Number(trimmed) };
}

export function parseWishForm(values: WishFormValues): WishFormResult {
  const price = readPrice(values.price_cop);
  let priceValue = 0;
  if (price.ok) {
    priceValue = price.value;
  }
  const parsed = CreateWishInputSchema.safeParse({ ...values, price_cop: priceValue });
  let fields: ErrorFields = {};
  if (!parsed.success) {
    fields = fieldErrorsFromIssues(parsed.error.issues);
  }
  if (!price.ok) {
    fields = { ...fields, price_cop: price.message };
  }
  if (parsed.success && price.ok) {
    return { ok: true, input: parsed.data };
  }
  return { ok: false, fields };
}

/** Al editar solo se envían los cuatro campos del formulario: nunca `purchased` (se cambia con su botón). */
export function toUpdateInput(data: CreateWishData): UpdateWishInput {
  return { name: data.name, store_url: data.store_url, price_cop: data.price_cop, priority: data.priority };
}
