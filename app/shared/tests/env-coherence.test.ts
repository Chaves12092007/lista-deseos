import { describe, expect, it } from "vitest";
import { validateEnv } from "@/shared/server/env";
import { EMULATOR_ENV, PRODUCTION_ENV, withEnv } from "./env-fixtures";

describe("El emulador nunca se usa en Vercel (regla 18, respuesta 20)", () => {
  it("el modo emulador con VERCEL=1 da un error de coherencia y no es válido", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { VERCEL: "1" }));
    expect(report.mode).toBe("emulador");
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("el modo emulador con VERCEL vacía es válido", () => {
    const report = validateEnv(withEnv(EMULATOR_ENV, { VERCEL: "" }));
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("el modo producción con VERCEL=1 es válido", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { VERCEL: "1" }));
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });
});

describe("El proyecto del navegador coincide con el del servidor también en producción (regla 19, respuesta 21)", () => {
  it("producción completa con NEXT_PUBLIC_FIREBASE_PROJECT_ID distinto da un error de coherencia", () => {
    const report = validateEnv(withEnv(PRODUCTION_ENV, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "otro-proyecto" }));
    expect(report.mode).toBe("producción");
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.ok).toBe(false);
  });

  it("producción completa con el mismo id de proyecto es válida", () => {
    const report = validateEnv(
      withEnv(PRODUCTION_ENV, {
        FIREBASE_PROJECT_ID: "lista-deseos-prod",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "lista-deseos-prod",
      }),
    );
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
