import { describe, expect, it } from "vitest";
import { EnvError, normalizePrivateKey, readValidEnv, validateEnv } from "@/shared/server/env";
import {
  EMULATOR_ENV,
  NORMALIZED_PRIVATE_KEY,
  PRODUCTION_ENV,
  RAW_PRIVATE_KEY,
  thrownError,
  withEnv,
} from "./env-fixtures";

const DEV_ONLY_EMULATOR = "En desarrollo solo se usa el emulador de Firebase";

describe("Modo emulador (reglas 17, 18 y 20)", () => {
  it("con todas sus variables correctas es válido y FIREBASE_PRIVATE_KEY figura como «no aplica»", () => {
    const report = validateEnv(EMULATOR_ENV);
    expect(report.mode).toBe("emulador");
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.statuses).toEqual({
      FIREBASE_PROJECT_ID: "ok",
      FIREBASE_CLIENT_EMAIL: "no aplica",
      FIREBASE_PRIVATE_KEY: "no aplica",
      FIREBASE_AUTH_EMULATOR_HOST: "ok",
      FIRESTORE_EMULATOR_HOST: "ok",
      NEXT_PUBLIC_FIREBASE_API_KEY: "ok",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "no aplica",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "ok",
      NEXT_PUBLIC_FIREBASE_APP_ID: "no aplica",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "ok",
    });
  });

  it("las credenciales de producción presentes en modo emulador siguen como «no aplica»", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { FIREBASE_PRIVATE_KEY: RAW_PRIVATE_KEY }));
    expect(report.statuses.FIREBASE_PRIVATE_KEY).toBe("no aplica");
    expect(report.ok).toBe(true);
  });

  it("el emulador es válido aunque NODE_ENV sea production", () => {
    expect(validateEnv(withEnv(EMULATOR_ENV, { NODE_ENV: "production" })).ok).toBe(true);
  });

  it("FIREBASE_PROJECT_ID=lista-real es «inválida»", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { FIREBASE_PROJECT_ID: "lista-real" }));
    expect(report.statuses.FIREBASE_PROJECT_ID).toBe("inválida");
    expect(report.ok).toBe(false);
  });

  it("FIREBASE_PROJECT_ID igual a «demo-» (solo el prefijo) es «inválida»", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { FIREBASE_PROJECT_ID: "demo-" }));
    expect(report.statuses.FIREBASE_PROJECT_ID).toBe("inválida");
    expect(report.ok).toBe(false);
  });

  it.each([
    "FIREBASE_PROJECT_ID",
    "FIRESTORE_EMULATOR_HOST",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ] as const)("sin %s queda en «falta» y no es válido", (name) => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { [name]: undefined }));
    expect(report.statuses[name]).toBe("falta");
    expect(report.ok).toBe(false);
  });

  it("una variable vacía cuenta como sin definir", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { FIRESTORE_EMULATOR_HOST: "" }));
    expect(report.statuses.FIRESTORE_EMULATOR_HOST).toBe("falta");
  });

  it("NEXT_PUBLIC_USE_FIREBASE_EMULATORS sin definir da un error de coherencia", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { NEXT_PUBLIC_USE_FIREBASE_EMULATORS: undefined }));
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false da un error de coherencia", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "false" }));
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("NEXT_PUBLIC_FIREBASE_PROJECT_ID distinto de FIREBASE_PROJECT_ID da un error de coherencia", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-otro" }));
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("NEXT_PUBLIC_USE_FIREBASE_EMULATORS=yes es «inválida»", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "yes" }));
    expect(report.statuses.NEXT_PUBLIC_USE_FIREBASE_EMULATORS).toBe("inválida");
    expect(report.ok).toBe(false);
  });
});

describe("Modo producción (reglas 17, 19, 20 y 21)", () => {
  it("con todas sus variables correctas y NODE_ENV=production es válido", () => {
    const report = validateEnv(PRODUCTION_ENV);
    expect(report.mode).toBe("producción");
    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.statuses).toEqual({
      FIREBASE_PROJECT_ID: "ok",
      FIREBASE_CLIENT_EMAIL: "ok",
      FIREBASE_PRIVATE_KEY: "ok",
      FIREBASE_AUTH_EMULATOR_HOST: "no aplica",
      FIRESTORE_EMULATOR_HOST: "no aplica",
      NEXT_PUBLIC_FIREBASE_API_KEY: "ok",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "ok",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "ok",
      NEXT_PUBLIC_FIREBASE_APP_ID: "ok",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "ok",
    });
  });

  it("NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false también es válido", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "false" }));
    expect(report.statuses.NEXT_PUBLIC_USE_FIREBASE_EMULATORS).toBe("ok");
    expect(report.ok).toBe(true);
  });

  it("con NODE_ENV=development falla con «En desarrollo solo se usa el emulador de Firebase»", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { NODE_ENV: "development" }));
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toContain(DEV_ONLY_EMULATOR);
  });

  it("sin NODE_ENV también falla con «En desarrollo solo se usa el emulador de Firebase»", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { NODE_ENV: undefined }));
    expect(report.ok).toBe(false);
    expect(report.errors.join("\n")).toContain(DEV_ONLY_EMULATOR);
  });

  it("sin FIREBASE_PRIVATE_KEY y con NODE_ENV=production, FIREBASE_PRIVATE_KEY queda en «falta»", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { FIREBASE_PRIVATE_KEY: undefined }));
    expect(report.statuses.FIREBASE_PRIVATE_KEY).toBe("falta");
    expect(report.ok).toBe(false);
  });

  it("con FIRESTORE_EMULATOR_HOST definida hay un error de coherencia", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" }));
    expect(report.statuses.FIRESTORE_EMULATOR_HOST).toBe("no aplica");
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true da un error de coherencia", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true" }));
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("NEXT_PUBLIC_USE_FIREBASE_EMULATORS=yes es «inválida»", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "yes" }));
    expect(report.statuses.NEXT_PUBLIC_USE_FIREBASE_EMULATORS).toBe("inválida");
    expect(report.ok).toBe(false);
  });

  it("FIREBASE_AUTH_EMULATOR_HOST definida pero vacía es modo producción", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { FIREBASE_AUTH_EMULATOR_HOST: "" }));
    expect(report.mode).toBe("producción");
  });

  it("sin ninguna variable es modo producción con todas las obligatorias en «falta»", () => {
    const report = validateEnv({ NODE_ENV: "production" });
    expect(report.mode).toBe("producción");
    expect(report.ok).toBe(false);
    expect(report.statuses).toMatchObject({
      FIREBASE_PROJECT_ID: "falta",
      FIREBASE_CLIENT_EMAIL: "falta",
      FIREBASE_PRIVATE_KEY: "falta",
      NEXT_PUBLIC_FIREBASE_API_KEY: "falta",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "falta",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "falta",
      NEXT_PUBLIC_FIREBASE_APP_ID: "falta",
    });
  });

  it("con todas las variables vacías es modo producción con todas las obligatorias en «falta»", () => {
    const empty = {
      NODE_ENV: "production",
      FIREBASE_PROJECT_ID: "",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
      FIREBASE_AUTH_EMULATOR_HOST: "",
      FIRESTORE_EMULATOR_HOST: "",
      NEXT_PUBLIC_FIREBASE_API_KEY: "",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
      NEXT_PUBLIC_FIREBASE_APP_ID: "",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "",
    };
    const report = validateEnv(empty);
    expect(report.mode).toBe("producción");
    expect(report.ok).toBe(false);
    expect(report.statuses).toMatchObject({
      FIREBASE_PROJECT_ID: "falta",
      FIREBASE_CLIENT_EMAIL: "falta",
      FIREBASE_PRIVATE_KEY: "falta",
      NEXT_PUBLIC_FIREBASE_API_KEY: "falta",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "falta",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "falta",
      NEXT_PUBLIC_FIREBASE_APP_ID: "falta",
    });
  });
});

describe("Normalización de FIREBASE_PRIVATE_KEY (regla 22)", () => {
  it("con comillas dobles y \\n literales queda sin comillas y con saltos de línea reales", () => {
    expect(normalizePrivateKey(RAW_PRIVATE_KEY)).toBe(NORMALIZED_PRIVATE_KEY);
  });

  it("con comillas simples también las quita", () => {
    expect(normalizePrivateKey("'LINEA-1\\nLINEA-2'")).toBe("LINEA-1\nLINEA-2");
  });

  it("una clave que ya tiene saltos reales y no tiene comillas queda igual", () => {
    expect(normalizePrivateKey(NORMALIZED_PRIVATE_KEY)).toBe(NORMALIZED_PRIVATE_KEY);
  });
});

describe("readValidEnv (regla 23)", () => {
  it("en emulador devuelve el proyecto y privateKey null", () => {
    expect(readValidEnv(EMULATOR_ENV)).toMatchObject({
      mode: "emulador",
      projectId: "demo-lista-deseos",
      privateKey: null,
    });
  });

  it("en producción devuelve las credenciales con la clave normalizada", () => {
    expect(readValidEnv(PRODUCTION_ENV)).toEqual({
      mode: "producción",
      projectId: "lista-deseos-prod",
      clientEmail: "admin@lista-deseos-prod.iam.example.com",
      privateKey: NORMALIZED_PRIVATE_KEY,
    });
  });

  it("con un entorno inválido lanza EnvError que nombra la variable y su estado, sin su valor", () => {
    const env = withEnv(EMULATOR_ENV, {
      FIREBASE_PROJECT_ID: "VALOR-SECRETO-123",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "VALOR-SECRETO-456",
      FIRESTORE_EMULATOR_HOST: undefined,
    });
    const error = thrownError(() => readValidEnv(env));
    expect(error).toBeInstanceOf(EnvError);
    expect(error.message).toContain("FIREBASE_PROJECT_ID");
    expect(error.message).toContain("inválida");
    expect(error.message).toContain("FIRESTORE_EMULATOR_HOST");
    expect(error.message).toContain("falta");
    expect(error.message).not.toContain("VALOR-SECRETO");
  });

  it("el EnvError de producción fuera de NODE_ENV=production no muestra la clave privada", () => {
    const env = withEnv(PRODUCTION_ENV, { NODE_ENV: "development", FIREBASE_PRIVATE_KEY: "VALOR-SECRETO-789" });
    const error = thrownError(() => readValidEnv(env));
    expect(error).toBeInstanceOf(EnvError);
    expect(error.message).toContain(DEV_ONLY_EMULATOR);
    expect(error.message).not.toContain("VALOR-SECRETO");
  });
});
