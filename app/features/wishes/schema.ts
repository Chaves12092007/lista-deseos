import { z } from "zod";

/**
 * Contrato de Deseos (F4–F9 + F19, docs/specs/f4-f9-f19-mi-lista.md).
 * Las claves del cable van en snake_case (ADR-0005).
 */

export const NAME_MAX_LENGTH = 100;
export const STORE_URL_MAX_LENGTH = 2048;
export const PRICE_MAX = 1_000_000_000;
export const MAX_WISHES_PER_USER = 100;

export const NAME_REQUIRED_MESSAGE = "Escribe el nombre del deseo.";
export const NAME_TOO_LONG_MESSAGE = "El nombre puede tener hasta 100 caracteres.";
export const STORE_URL_REQUIRED_MESSAGE = "Escribe el enlace de la tienda.";
export const STORE_URL_INVALID_MESSAGE = "Escribe un enlace válido que empiece con http:// o https://.";
export const STORE_URL_TOO_LONG_MESSAGE = "El enlace puede tener hasta 2048 caracteres.";
export const PRICE_REQUIRED_MESSAGE = "Escribe el precio.";
export const PRICE_NOT_INTEGER_MESSAGE = "El precio debe ser un número entero de pesos, sin decimales.";
export const PRICE_NEGATIVE_MESSAGE = "El precio no puede ser negativo.";
export const PRICE_TOO_BIG_MESSAGE = "El precio puede ser hasta 1.000.000.000.";
export const PRIORITY_INVALID_MESSAGE = "Elige la prioridad: alta, media o baja.";
export const PURCHASED_INVALID_MESSAGE = "El estado comprado debe ser verdadero o falso.";
export const WISH_NOT_FOUND_MESSAGE = "No encontramos ese deseo.";
export const WISH_LIMIT_MESSAGE = "Llegaste al máximo de 100 deseos. Elimina alguno para agregar otro.";
/** Cuerpo que no es un objeto, trae campos desconocidos o un `PATCH` vacío (regla 6 y 23). */
export const WISH_BODY_INVALID_MESSAGE = "Revisa los datos enviados.";

const PROTOCOLS = new Set(["http:", "https:"]);

/** Regla 3: se puede leer como URL, es `http:` o `https:` y trae host. */
function isHttpUrl(value: string): boolean {
  if (!URL.canParse(value)) {
    return false;
  }
  const url = new URL(value);
  return PROTOCOLS.has(url.protocol) && url.host !== "";
}

/** Ausente → «Escribe el precio.»; cualquier otro tipo (texto, null, NaN) → «número entero». */
function priceTypeMessage(isMissing: boolean): string {
  if (isMissing) {
    return PRICE_REQUIRED_MESSAGE;
  }
  return PRICE_NOT_INTEGER_MESSAGE;
}

const NameSchema = z
  .string({ error: NAME_REQUIRED_MESSAGE })
  .trim()
  .min(1, NAME_REQUIRED_MESSAGE)
  .max(NAME_MAX_LENGTH, NAME_TOO_LONG_MESSAGE);

const StoreUrlSchema = z
  .string({ error: STORE_URL_REQUIRED_MESSAGE })
  .trim()
  .min(1, STORE_URL_REQUIRED_MESSAGE)
  .max(STORE_URL_MAX_LENGTH, STORE_URL_TOO_LONG_MESSAGE)
  .refine(isHttpUrl, STORE_URL_INVALID_MESSAGE);

const PriceSchema = z
  .number({ error: (issue) => priceTypeMessage(issue.input === undefined) })
  .min(0, PRICE_NEGATIVE_MESSAGE)
  .max(PRICE_MAX, PRICE_TOO_BIG_MESSAGE)
  .int(PRICE_NOT_INTEGER_MESSAGE);

export const PrioritySchema = z.enum(["alta", "media", "baja"], { error: PRIORITY_INVALID_MESSAGE });
export type Priority = z.infer<typeof PrioritySchema>;

const PurchasedSchema = z.boolean({ error: PURCHASED_INVALID_MESSAGE });

/** Deseo tal como viaja y se guarda (regla 1). */
export const WishSchema = z.object({
  id: z.string().min(1),
  name: NameSchema,
  store_url: StoreUrlSchema,
  price_cop: PriceSchema,
  priority: PrioritySchema,
  purchased: z.boolean(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
export type Wish = z.infer<typeof WishSchema>;

/** `POST /api/wishes` (reglas 2–6 y 11): sin campos extra; `priority` y `purchased` tienen valor por defecto. */
export const CreateWishInputSchema = z.strictObject(
  {
    name: NameSchema,
    store_url: StoreUrlSchema,
    price_cop: PriceSchema,
    priority: PrioritySchema.default("media"),
    purchased: PurchasedSchema.default(false),
  },
  { error: WISH_BODY_INVALID_MESSAGE },
);
export type CreateWishInput = z.input<typeof CreateWishInputSchema>;
export type CreateWishData = z.output<typeof CreateWishInputSchema>;

/** `PATCH /api/wishes/[id]` (regla 23): subconjunto no vacío, sin valores por defecto. */
export const UpdateWishInputSchema = z
  .strictObject(
    {
      name: NameSchema.optional(),
      store_url: StoreUrlSchema.optional(),
      price_cop: PriceSchema.optional(),
      priority: PrioritySchema.optional(),
      purchased: PurchasedSchema.optional(),
    },
    { error: WISH_BODY_INVALID_MESSAGE },
  )
  .refine((input) => Object.keys(input).length > 0, { error: WISH_BODY_INVALID_MESSAGE });
export type UpdateWishInput = z.input<typeof UpdateWishInputSchema>;
export type UpdateWishData = z.output<typeof UpdateWishInputSchema>;

/** `?orden=` (regla 18): cualquier valor desconocido, vacío o repetido cae en `prioridad`. */
export const WishOrderSchema = z.enum(["prioridad", "precio-asc", "precio-desc"]).catch("prioridad");
export type WishOrder = z.infer<typeof WishOrderSchema>;

/** Lo que arma el servicio para la pantalla (reglas 16 y 19). */
export const ListWishesOutputSchema = z.object({
  wishes: z.array(WishSchema),
  total_pending_cop: z.number().int().min(0),
});
export type ListWishesOutput = z.infer<typeof ListWishesOutputSchema>;
