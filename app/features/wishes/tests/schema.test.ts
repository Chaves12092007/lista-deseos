import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  CreateWishInputSchema,
  ListWishesOutputSchema,
  MAX_WISHES_PER_USER,
  NAME_REQUIRED_MESSAGE,
  NAME_TOO_LONG_MESSAGE,
  PRICE_NEGATIVE_MESSAGE,
  PRICE_NOT_INTEGER_MESSAGE,
  PRICE_REQUIRED_MESSAGE,
  PRICE_TOO_BIG_MESSAGE,
  PRIORITY_INVALID_MESSAGE,
  PURCHASED_INVALID_MESSAGE,
  STORE_URL_INVALID_MESSAGE,
  STORE_URL_REQUIRED_MESSAGE,
  STORE_URL_TOO_LONG_MESSAGE,
  UpdateWishInputSchema,
  WishOrderSchema,
  WishSchema,
} from "@/features/wishes/schema";

const VALID = { name: "Audífonos", store_url: "https://tienda.com/a", price_cop: 120000 };
const URL_PREFIX = "https://x.co/";

function urlOfLength(length: number): string {
  return `${URL_PREFIX}${"a".repeat(length - URL_PREFIX.length)}`;
}

function messagesFor<T>(result: z.ZodSafeParseResult<T>, field: string): string[] {
  if (result.success) {
    return [];
  }
  return result.error.issues
    .filter((issue) => issue.path.map((part) => String(part)).join(".") === field)
    .map((issue) => issue.message);
}

describe("Deseo: name (reglas 1 y 2)", () => {
  it.each([
    { length: 1, ok: true },
    { length: 100, ok: true },
    { length: 101, ok: false },
  ])("un nombre de $length caracteres se acepta: $ok", ({ length, ok }) => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, name: "n".repeat(length) }).success).toBe(ok);
  });

  it("recorta los espacios de los extremos", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, name: "  Audífonos  " });
    expect(result.data?.name).toBe("Audífonos");
  });

  it.each(["", "   "])("el nombre %j da «Escribe el nombre del deseo.»", (name) => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, name });
    expect(messagesFor(result, "name")[0]).toBe(NAME_REQUIRED_MESSAGE);
  });

  it("sin nombre da el mismo mensaje de obligatorio", () => {
    const result = CreateWishInputSchema.safeParse({ store_url: VALID.store_url, price_cop: VALID.price_cop });
    expect(messagesFor(result, "name")[0]).toBe(NAME_REQUIRED_MESSAGE);
  });

  it("101 caracteres da el mensaje de máximo", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, name: "n".repeat(101) });
    expect(messagesFor(result, "name")[0]).toBe(NAME_TOO_LONG_MESSAGE);
  });

  it("100 caracteres más espacios en los extremos se acepta (se mide después de recortar)", () => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, name: ` ${"n".repeat(100)} ` }).success).toBe(true);
  });
});

describe("Deseo: store_url (regla 3)", () => {
  it.each(["https://x.co", "http://x.co", "https://www.tienda.com/p?id=1#a"])("%s se acepta", (storeUrl) => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, store_url: storeUrl }).success).toBe(true);
  });

  it.each(["javascript:alert(1)", "ftp://x.co", "data:text/html,x", "file:///etc/passwd", "tienda.com", "https://"])(
    "%s da el mensaje de enlace inválido",
    (storeUrl) => {
      const result = CreateWishInputSchema.safeParse({ ...VALID, store_url: storeUrl });
      expect(messagesFor(result, "store_url")[0]).toBe(STORE_URL_INVALID_MESSAGE);
    },
  );

  it.each(["", "   "])("%j da «Escribe el enlace de la tienda.»", (storeUrl) => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, store_url: storeUrl });
    expect(messagesFor(result, "store_url")[0]).toBe(STORE_URL_REQUIRED_MESSAGE);
  });

  it("se guarda recortado y sin otra normalización", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, store_url: "  https://X.co/A  " });
    expect(result.data?.store_url).toBe("https://X.co/A");
  });

  it("2048 caracteres se acepta y 2049 da el mensaje de máximo", () => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, store_url: urlOfLength(2048) }).success).toBe(true);
    const result = CreateWishInputSchema.safeParse({ ...VALID, store_url: urlOfLength(2049) });
    expect(messagesFor(result, "store_url")[0]).toBe(STORE_URL_TOO_LONG_MESSAGE);
  });
});

describe("Deseo: price_cop (regla 4)", () => {
  it.each([0, 1, 1_000_000_000])("%i se acepta", (price) => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, price_cop: price }).success).toBe(true);
  });

  it("-1 da «no puede ser negativo»", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, price_cop: -1 });
    expect(messagesFor(result, "price_cop")[0]).toBe(PRICE_NEGATIVE_MESSAGE);
  });

  it("1 000 000 001 da el mensaje de máximo", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, price_cop: 1_000_000_001 });
    expect(messagesFor(result, "price_cop")[0]).toBe(PRICE_TOO_BIG_MESSAGE);
  });

  it("un decimal, un texto y null dan «número entero»", () => {
    for (const price of [10.5, "100", null]) {
      const result = CreateWishInputSchema.safeParse({ ...VALID, price_cop: price });
      expect(messagesFor(result, "price_cop")[0]).toBe(PRICE_NOT_INTEGER_MESSAGE);
    }
  });

  it("sin precio da «Escribe el precio.»", () => {
    const result = CreateWishInputSchema.safeParse({ name: VALID.name, store_url: VALID.store_url });
    expect(messagesFor(result, "price_cop")[0]).toBe(PRICE_REQUIRED_MESSAGE);
  });
});

describe("Deseo: priority y purchased (regla 1)", () => {
  it("por defecto la prioridad es media y no está comprado", () => {
    const result = CreateWishInputSchema.safeParse(VALID);
    expect(result.data).toEqual({ ...VALID, priority: "media", purchased: false });
  });

  it.each(["alta", "media", "baja"])("la prioridad %s se acepta", (priority) => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, priority }).success).toBe(true);
  });

  it("una prioridad fuera de la lista da su mensaje", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, priority: "urgente" });
    expect(messagesFor(result, "priority")[0]).toBe(PRIORITY_INVALID_MESSAGE);
  });

  it("purchased que no es booleano da su mensaje", () => {
    const result = CreateWishInputSchema.safeParse({ ...VALID, purchased: "si" });
    expect(messagesFor(result, "purchased")[0]).toBe(PURCHASED_INVALID_MESSAGE);
  });
});

describe("Cuerpos con campos desconocidos (regla 6)", () => {
  it.each(["uid", "id", "created_at", "updated_at", "foo"])("crear con «%s» se rechaza", (key) => {
    expect(CreateWishInputSchema.safeParse({ ...VALID, [key]: "x" }).success).toBe(false);
  });

  it.each(["uid", "id", "created_at", "foo"])("editar con «%s» se rechaza", (key) => {
    expect(UpdateWishInputSchema.safeParse({ price_cop: 5, [key]: "x" }).success).toBe(false);
  });
});

describe("Editar: subconjunto no vacío (regla 23)", () => {
  it("{} se rechaza", () => {
    expect(UpdateWishInputSchema.safeParse({}).success).toBe(false);
  });

  it("un solo campo se acepta y no agrega valores por defecto", () => {
    expect(UpdateWishInputSchema.safeParse({ price_cop: 5 }).data).toEqual({ price_cop: 5 });
    expect(UpdateWishInputSchema.safeParse({ purchased: true }).data).toEqual({ purchased: true });
  });

  it("valida cada campo con las mismas reglas", () => {
    expect(messagesFor(UpdateWishInputSchema.safeParse({ name: "  " }), "name")[0]).toBe(NAME_REQUIRED_MESSAGE);
    expect(messagesFor(UpdateWishInputSchema.safeParse({ price_cop: -1 }), "price_cop")[0]).toBe(
      PRICE_NEGATIVE_MESSAGE,
    );
    expect(UpdateWishInputSchema.safeParse({ priority: "urgente" }).success).toBe(false);
  });

  it("recorta el nombre", () => {
    expect(UpdateWishInputSchema.safeParse({ name: "  a " }).data).toEqual({ name: "a" });
  });
});

describe("Orden de la lista (regla 18)", () => {
  it.each(["prioridad", "precio-asc", "precio-desc"])("%s se respeta", (order) => {
    expect(WishOrderSchema.parse(order)).toBe(order);
  });

  it("ausente, vacío, repetido o desconocido cae en prioridad sin error", () => {
    expect(WishOrderSchema.parse(undefined)).toBe("prioridad");
    expect(WishOrderSchema.parse("")).toBe("prioridad");
    expect(WishOrderSchema.parse("xyz")).toBe("prioridad");
    expect(WishOrderSchema.parse(["precio-asc", "precio-desc"])).toBe("prioridad");
  });
});

describe("Deseo en el cable y lista", () => {
  const WISH = {
    id: "w1",
    ...VALID,
    priority: "alta",
    purchased: false,
    created_at: "2026-11-16T12:00:00.000Z",
    updated_at: "2026-11-16T12:00:00.000Z",
  };

  it("un deseo completo es válido", () => {
    expect(WishSchema.safeParse(WISH).success).toBe(true);
  });

  it("la lista lleva wishes y total_pending_cop", () => {
    expect(ListWishesOutputSchema.safeParse({ wishes: [WISH], total_pending_cop: 120000 }).success).toBe(true);
    expect(ListWishesOutputSchema.safeParse({ wishes: [WISH] }).success).toBe(false);
  });

  it("el tope por persona es 100", () => {
    expect(MAX_WISHES_PER_USER).toBe(100);
  });
});
