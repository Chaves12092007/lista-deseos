import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EnvInput } from "@/shared/server/env";
import { EMULATOR_ENV, EXPECTED_ENV_ORDER, NORMALIZED_PRIVATE_KEY, PRODUCTION_ENV } from "./env-fixtures";

/** Deja `process.env` exactamente con `env` para las 10 variables y NODE_ENV (las demás quedan vacías). */
function stubProcessEnv(env: EnvInput): void {
  for (const name of [...EXPECTED_ENV_ORDER, "NODE_ENV"]) {
    vi.stubEnv(name, env[name] ?? "");
  }
}

/** Importa módulos frescos: la validación debe ocurrir de nuevo en el primer uso. */
async function freshModules() {
  vi.resetModules();
  const admin = await import("@/shared/server/firebase-admin");
  const env = await import("@/shared/server/env");
  return { admin, env };
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("adminCredentials (regla 28)", () => {
  it("en modo emulador no hay credenciales (se inicializa solo con projectId)", async () => {
    const { admin, env } = await freshModules();
    expect(admin.adminCredentials(env.readValidEnv(EMULATOR_ENV))).toBeNull();
  });

  it("en modo producción devuelve projectId, clientEmail y la clave normalizada", async () => {
    const { admin, env } = await freshModules();
    expect(admin.adminCredentials(env.readValidEnv(PRODUCTION_ENV))).toEqual({
      projectId: "lista-deseos-prod",
      clientEmail: "admin@lista-deseos-prod.iam.example.com",
      privateKey: NORMALIZED_PRIVATE_KEY,
    });
  });
});

describe("Validación del entorno al primer uso de Firebase (regla 23)", () => {
  it("importar el módulo con un entorno inválido no lanza", async () => {
    stubProcessEnv({ NODE_ENV: "development" });
    vi.resetModules();
    await expect(import("@/shared/server/firebase-admin")).resolves.toBeDefined();
  });

  it("el primer getAdminAuth() con un entorno inválido lanza EnvError", async () => {
    stubProcessEnv({ NODE_ENV: "development" });
    const { admin, env } = await freshModules();
    expect(() => admin.getAdminAuth()).toThrow(env.EnvError);
  });

  it("el primer getFirestore() con un entorno inválido lanza EnvError", async () => {
    stubProcessEnv({ NODE_ENV: "development" });
    const { admin, env } = await freshModules();
    expect(() => admin.getFirestore()).toThrow(env.EnvError);
  });
});

describe("Una única instancia de firebase-admin (regla 28)", () => {
  const emulatorProcessEnv: EnvInput = {
    ...EMULATOR_ENV,
    NODE_ENV: "test",
    FIREBASE_PROJECT_ID: "demo-prueba",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-prueba",
    FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  };

  it("con el emulador, dos llamadas a getAdminAuth() devuelven la misma instancia", async () => {
    stubProcessEnv(emulatorProcessEnv);
    const { admin } = await freshModules();
    expect(admin.getAdminAuth()).toBe(admin.getAdminAuth());
  });

  it("con el emulador, dos llamadas a getFirestore() devuelven la misma instancia", async () => {
    stubProcessEnv(emulatorProcessEnv);
    const { admin } = await freshModules();
    expect(admin.getFirestore()).toBe(admin.getFirestore());
  });
});
