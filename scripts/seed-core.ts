/**
 * Lógica del seed (`npm run seed`): crea (o reutiliza) la cuenta demo y le agrega los deseos de ejemplo que
 * le falten. Solo habla con el servicio de cuentas y el de deseos, nunca directo con Firestore.
 */
import type { AccountService } from "../app/features/accounts/server/account-service";
import type { CreateWishInput } from "../app/features/wishes/schema";
import type { WishService } from "../app/features/wishes/server/wish-service";
import { ConflictError } from "../app/shared/server/errors";

export const DEMO_EMAIL = "demo@lista-deseos.test";
export const DEMO_PASSWORD = "demo-12345";

/** Cinco deseos con distintas prioridades y precios (en pesos); uno ya comprado. Las tiendas son de mentira. */
export const SAMPLE_WISHES: readonly CreateWishInput[] = [
  {
    name: "Audífonos con cancelación de ruido",
    store_url: "https://tienda.example/audifonos",
    price_cop: 849_900,
    priority: "alta",
  },
  { name: "Teclado mecánico", store_url: "https://tienda.example/teclado", price_cop: 329_000, priority: "media" },
  { name: "Mochila para portátil", store_url: "https://tienda.example/mochila", price_cop: 159_900, priority: "baja" },
  {
    name: "Monitor de 27 pulgadas",
    store_url: "https://tienda.example/monitor",
    price_cop: 1_249_000,
    priority: "alta",
  },
  {
    name: "Libro: Clean Code",
    store_url: "https://tienda.example/clean-code",
    price_cop: 89_000,
    priority: "media",
    purchased: true,
  },
];

export interface SeedDeps {
  accounts: Pick<AccountService, "register">;
  /** Devuelve el `uid` de la cuenta con ese correo. */
  findUidByEmail(email: string): Promise<string>;
  wishes: Pick<WishService, "list" | "create">;
}

export interface SeedResult {
  uid: string;
  accountCreated: boolean;
  wishesCreated: number;
  wishesSkipped: number;
}

/** Crea la cuenta demo; si ya existe (409) la reutiliza. Devuelve `true` si la acaba de crear. */
async function ensureDemoAccount(accounts: SeedDeps["accounts"]): Promise<boolean> {
  try {
    await accounts.register({ email: DEMO_EMAIL, password: DEMO_PASSWORD, password_confirmation: DEMO_PASSWORD });
    return true;
  } catch (error) {
    if (error instanceof ConflictError) {
      return false;
    }
    throw error;
  }
}

/** Idempotente: un deseo de ejemplo que ya existe (mismo nombre) no se vuelve a crear. */
export async function seedDemoData(deps: SeedDeps): Promise<SeedResult> {
  const accountCreated = await ensureDemoAccount(deps.accounts);
  const uid = await deps.findUidByEmail(DEMO_EMAIL);
  const existing = await deps.wishes.list(uid, "prioridad");
  const existingNames = new Set(existing.wishes.map((wish) => wish.name));
  const missing = SAMPLE_WISHES.filter((wish) => !existingNames.has(wish.name));
  for (const wish of missing) {
    await deps.wishes.create(uid, wish);
  }
  return { uid, accountCreated, wishesCreated: missing.length, wishesSkipped: SAMPLE_WISHES.length - missing.length };
}
