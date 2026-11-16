import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { MAX_WISHES_PER_USER, WISH_LIMIT_MESSAGE, WISH_NOT_FOUND_MESSAGE } from "@/features/wishes/schema";
import type { CreateWishInput, WishOrder } from "@/features/wishes/schema";
import { InMemoryWishRepository } from "@/features/wishes/server/repository.memory";
import { createWishService } from "@/features/wishes/server/wish-service";
import type { WishService } from "@/features/wishes/server/wish-service";
import { ConflictError, NotFoundError } from "@/shared/server/errors";
import { FakeClock, TEST_NOW } from "@/shared/tests/doubles";

const ANA = "uid-ana";
const BETO = "uid-beto";
const SECOND = 1000;

function setup() {
  const clock = new FakeClock();
  const repository = new InMemoryWishRepository();
  let counter = 0;
  const service = createWishService({
    repository,
    now: clock.now,
    newId: () => {
      counter += 1;
      return `w${counter}`;
    },
  });
  return { clock, repository, service };
}

function wish(overrides: Partial<CreateWishInput> = {}): CreateWishInput {
  return { name: "Audífonos", store_url: "https://tienda.com/a", price_cop: 120000, ...overrides };
}

async function names(service: WishService, uid: string, order: WishOrder = "prioridad"): Promise<string[]> {
  const list = await service.list(uid, order);
  return list.wishes.map((item) => item.name);
}

async function fillUp(service: WishService, uid: string, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await service.create(uid, wish({ name: `deseo ${index}` }));
  }
}

describe("Crear (reglas 7, 9 y 11)", () => {
  it("guarda el deseo con valores por defecto, id y fechas del servidor", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish({ name: "  Audífonos  " }));
    const now = new Date(TEST_NOW).toISOString();
    expect(created).toEqual({
      id: "w1",
      name: "Audífonos",
      store_url: "https://tienda.com/a",
      price_cop: 120000,
      priority: "media",
      purchased: false,
      created_at: now,
      updated_at: now,
    });
  });

  it("respeta la prioridad y el estado enviados", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish({ priority: "alta", purchased: true }));
    expect(created.priority).toBe("alta");
    expect(created.purchased).toBe(true);
  });

  it("rechaza datos inválidos con ZodError y no guarda nada", async () => {
    const { service } = setup();
    await expect(service.create(ANA, wish({ name: "   " }))).rejects.toBeInstanceOf(ZodError);
    await expect(service.create(ANA, wish({ price_cop: -1 }))).rejects.toBeInstanceOf(ZodError);
    await expect(service.create(ANA, wish({ price_cop: 10.5 }))).rejects.toBeInstanceOf(ZodError);
    expect((await service.list(ANA, "prioridad")).wishes).toEqual([]);
  });

  it("permite deseos repetidos (regla 5): dos deseos distintos", async () => {
    const { service } = setup();
    const first = await service.create(ANA, wish());
    const second = await service.create(ANA, wish());
    expect(first.id).not.toBe(second.id);
    expect(await names(service, ANA)).toHaveLength(2);
  });
});

describe("Tope de 100 por persona (regla 9)", () => {
  it("con 99 deseos se puede crear el 100 y el 101 da ConflictError", async () => {
    const { service } = setup();
    await fillUp(service, ANA, MAX_WISHES_PER_USER - 1);
    await service.create(ANA, wish({ name: "el 100" }));
    await expect(service.create(ANA, wish({ name: "el 101" }))).rejects.toThrow(new ConflictError(WISH_LIMIT_MESSAGE));
    expect((await service.list(ANA, "prioridad")).wishes).toHaveLength(MAX_WISHES_PER_USER);
  });

  it("eliminar uno libera un cupo", async () => {
    const { service } = setup();
    await fillUp(service, ANA, MAX_WISHES_PER_USER);
    await service.remove(ANA, "w1");
    await expect(service.create(ANA, wish())).resolves.toMatchObject({ name: "Audífonos" });
  });

  it("el tope es por persona", async () => {
    const { service } = setup();
    await fillUp(service, ANA, MAX_WISHES_PER_USER);
    await expect(service.create(BETO, wish())).resolves.toMatchObject({ name: "Audífonos" });
  });

  it("con 99 deseos y varias peticiones a la vez, solo una entra", async () => {
    const { service } = setup();
    await fillUp(service, ANA, MAX_WISHES_PER_USER - 1);
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => service.create(ANA, wish())));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((result) => result.status === "rejected");
    expect(rejected).toHaveLength(9);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(ConflictError);
    }
    expect((await service.list(ANA, "prioridad")).wishes).toHaveLength(MAX_WISHES_PER_USER);
  });
});

describe("Ver la lista y el total (reglas 16, 19 y 20)", () => {
  it("sin deseos: lista vacía y total 0", async () => {
    const { service } = setup();
    expect(await service.list(ANA, "prioridad")).toEqual({ wishes: [], total_pending_cop: 0 });
  });

  it("el total suma solo los pendientes", async () => {
    const { service } = setup();
    await service.create(ANA, wish({ price_cop: 10000 }));
    await service.create(ANA, wish({ price_cop: 20000 }));
    await service.create(ANA, wish({ price_cop: 0 }));
    await service.create(ANA, wish({ price_cop: 500000, purchased: true }));
    expect((await service.list(ANA, "prioridad")).total_pending_cop).toBe(30000);
  });

  it("si todo está comprado, el total es 0", async () => {
    const { service } = setup();
    await service.create(ANA, wish({ price_cop: 500000, purchased: true }));
    expect((await service.list(ANA, "precio-asc")).total_pending_cop).toBe(0);
  });

  it("cada persona ve solo sus deseos", async () => {
    const { service } = setup();
    await service.create(ANA, wish({ name: "de Ana" }));
    await service.create(BETO, wish({ name: "de Beto" }));
    expect(await names(service, ANA)).toEqual(["de Ana"]);
    expect(await names(service, BETO)).toEqual(["de Beto"]);
  });
});

describe("Orden (reglas 18 a 20)", () => {
  it("prioridad: alta, media, baja y, en empate, el más antiguo primero", async () => {
    const { service, clock } = setup();
    const entries: [string, CreateWishInput["priority"]][] = [
      ["baja", "baja"],
      ["alta antigua", "alta"],
      ["media", "media"],
      ["alta nueva", "alta"],
    ];
    for (const [name, priority] of entries) {
      await service.create(ANA, wish({ name, priority }));
      clock.advance(SECOND);
    }
    expect(await names(service, ANA, "prioridad")).toEqual(["alta antigua", "alta nueva", "media", "baja"]);
  });

  it("precio-asc y precio-desc, con desempate por antigüedad", async () => {
    const { service, clock } = setup();
    const prices: [string, number][] = [
      ["treinta", 30],
      ["diez antiguo", 10],
      ["veinte", 20],
      ["diez nuevo", 10],
    ];
    for (const [name, price] of prices) {
      await service.create(ANA, wish({ name, price_cop: price }));
      clock.advance(SECOND);
    }
    expect(await names(service, ANA, "precio-asc")).toEqual(["diez antiguo", "diez nuevo", "veinte", "treinta"]);
    expect(await names(service, ANA, "precio-desc")).toEqual(["treinta", "veinte", "diez antiguo", "diez nuevo"]);
  });

  it("con la misma fecha desempata por id", async () => {
    const { service } = setup();
    await service.create(ANA, wish({ name: "primero", price_cop: 5 }));
    await service.create(ANA, wish({ name: "segundo", price_cop: 5 }));
    expect(await names(service, ANA, "precio-asc")).toEqual(["primero", "segundo"]);
  });

  it.each<WishOrder>(["prioridad", "precio-asc", "precio-desc"])(
    "con %s los comprados van siempre al final",
    async (order) => {
      const { service } = setup();
      await service.create(
        ANA,
        wish({ name: "comprado caro y urgente", priority: "alta", price_cop: 999, purchased: true }),
      );
      await service.create(ANA, wish({ name: "pendiente barato y baja", priority: "baja", price_cop: 1 }));
      expect(await names(service, ANA, order)).toEqual(["pendiente barato y baja", "comprado caro y urgente"]);
    },
  );

  it("dentro del bloque de comprados se usa el mismo criterio", async () => {
    const { service } = setup();
    await service.create(ANA, wish({ name: "comprado 9", price_cop: 9, purchased: true }));
    await service.create(ANA, wish({ name: "comprado 3", price_cop: 3, purchased: true }));
    expect(await names(service, ANA, "precio-asc")).toEqual(["comprado 3", "comprado 9"]);
  });
});

describe("Editar y marcar comprado (reglas 23 a 25)", () => {
  it("cambia solo los campos enviados y renueva updated_at", async () => {
    const { service, clock } = setup();
    const created = await service.create(ANA, wish());
    clock.advance(SECOND);
    const updated = await service.update(ANA, created.id, { price_cop: 5 });
    expect(updated).toEqual({ ...created, price_cop: 5, updated_at: new Date(TEST_NOW + SECOND).toISOString() });
    expect(updated.created_at).toBe(created.created_at);
  });

  it("recorta el nombre al editar", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish());
    expect((await service.update(ANA, created.id, { name: "  Nuevo  " })).name).toBe("Nuevo");
  });

  it("rechaza {} y datos inválidos con ZodError", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish());
    await expect(service.update(ANA, created.id, {})).rejects.toBeInstanceOf(ZodError);
    await expect(service.update(ANA, created.id, { name: "  " })).rejects.toBeInstanceOf(ZodError);
    await expect(service.update(ANA, created.id, { price_cop: 1_000_000_001 })).rejects.toBeInstanceOf(ZodError);
  });

  it("marcar comprado es idempotente y mueve el precio fuera del total", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish({ price_cop: 100 }));
    await service.update(ANA, created.id, { purchased: true });
    const again = await service.update(ANA, created.id, { purchased: true });
    expect(again.purchased).toBe(true);
    expect((await service.list(ANA, "prioridad")).total_pending_cop).toBe(0);
  });

  it("desmarcar devuelve el precio al total", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish({ price_cop: 100, purchased: true }));
    await service.update(ANA, created.id, { purchased: false });
    expect((await service.list(ANA, "prioridad")).total_pending_cop).toBe(100);
  });

  it("editar no cuenta contra el tope", async () => {
    const { service } = setup();
    await fillUp(service, ANA, MAX_WISHES_PER_USER);
    await expect(service.update(ANA, "w1", { name: "editado" })).resolves.toMatchObject({ name: "editado" });
  });
});

describe("Eliminar (regla 26)", () => {
  it("elimina el deseo y una segunda vez da NotFoundError", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish());
    await service.remove(ANA, created.id);
    expect(await names(service, ANA)).toEqual([]);
    await expect(service.remove(ANA, created.id)).rejects.toThrow(new NotFoundError(WISH_NOT_FOUND_MESSAGE));
  });
});

describe("Dueño y ids (reglas 7 y 8)", () => {
  it("otra persona recibe el mismo 404 que con un id inexistente y el deseo no cambia", async () => {
    const { service } = setup();
    const created = await service.create(ANA, wish());
    const notFound = new NotFoundError(WISH_NOT_FOUND_MESSAGE);
    await expect(service.update(BETO, created.id, { name: "robado" })).rejects.toThrow(notFound);
    await expect(service.remove(BETO, created.id)).rejects.toThrow(notFound);
    await expect(service.update(ANA, "no-existe", { name: "x" })).rejects.toThrow(notFound);
    expect(await names(service, ANA)).toEqual(["Audífonos"]);
  });

  it.each(["", "a".repeat(129), "a/b", "..", "__reservado__", " "])("el id %j da NotFoundError", async (id) => {
    const { service } = setup();
    await service.create(ANA, wish());
    await expect(service.update(ANA, id, { name: "x" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(ANA, id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("un id de 128 caracteres bien formado pero inexistente también da NotFoundError", async () => {
    const { service } = setup();
    await expect(service.remove(ANA, "a".repeat(128))).rejects.toBeInstanceOf(NotFoundError);
  });
});
