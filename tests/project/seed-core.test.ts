import { describe, expect, it } from "vitest";
import { createAccountService } from "@/features/accounts/server/account-service";
import { InMemoryAccountAuth } from "@/features/accounts/server/auth-port.memory";
import { InMemoryWishRepository } from "@/features/wishes/server/repository.memory";
import { createWishService } from "@/features/wishes/server/wish-service";
import { DEMO_EMAIL, SAMPLE_WISHES, seedDemoData } from "../../scripts/seed-core";

const UID = "uid-demo";

function buildDeps() {
  const auth = new InMemoryAccountAuth();
  let counter = 0;
  const wishes = createWishService({
    repository: new InMemoryWishRepository(),
    now: () => Date.UTC(2026, 10, 16),
    newId: () => {
      counter += 1;
      return `wish-${counter}`;
    },
  });
  const accounts = createAccountService({
    auth,
    sessions: { createSession: async () => {}, getSession: async () => null, clearSession: async () => {} },
  });
  return { auth, wishes, deps: { accounts, wishes, findUidByEmail: async () => UID } };
}

describe("seed: datos de ejemplo", () => {
  it("los 5 deseos tienen distintas prioridades y precios y uno está comprado", () => {
    expect(SAMPLE_WISHES).toHaveLength(5);
    expect(new Set(SAMPLE_WISHES.map((wish) => wish.priority)).size).toBe(3);
    expect(new Set(SAMPLE_WISHES.map((wish) => wish.price_cop)).size).toBe(5);
    expect(SAMPLE_WISHES.filter((wish) => wish.purchased === true)).toHaveLength(1);
  });

  it("crea la cuenta y los 5 deseos", async () => {
    const { auth, wishes, deps } = buildDeps();
    const result = await seedDemoData(deps);
    expect(result).toMatchObject({ uid: UID, accountCreated: true, wishesCreated: 5, wishesSkipped: 0 });
    expect(auth.accounts.map((account) => account.email)).toEqual([DEMO_EMAIL]);
    expect((await wishes.list(UID, "prioridad")).wishes).toHaveLength(5);
  });

  it("si se corre dos veces, reutiliza la cuenta y no duplica los deseos", async () => {
    const { auth, wishes, deps } = buildDeps();
    await seedDemoData(deps);
    const second = await seedDemoData(deps);
    expect(second).toMatchObject({ accountCreated: false, wishesCreated: 0, wishesSkipped: 5 });
    expect(auth.accounts).toHaveLength(1);
    expect((await wishes.list(UID, "prioridad")).wishes).toHaveLength(5);
  });

  it("repone solo el deseo que falta", async () => {
    const { wishes, deps } = buildDeps();
    await seedDemoData(deps);
    const first = (await wishes.list(UID, "prioridad")).wishes[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      await wishes.remove(UID, first.id);
    }
    const again = await seedDemoData(deps);
    expect(again).toMatchObject({ wishesCreated: 1, wishesSkipped: 4 });
  });

  it("propaga un error de cuentas que no sea «ya existe»", async () => {
    const { auth, deps } = buildDeps();
    auth.failCreateWith(new Error("Auth caído"));
    await expect(seedDemoData(deps)).rejects.toThrow("Auth caído");
  });
});
