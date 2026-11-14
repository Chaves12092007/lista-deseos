import { describe, expect, it } from "vitest";
import { checkEnv, ENV_VARS, formatEnvReport, validateEnv } from "@/shared/server/env";
import type { EnvInput } from "@/shared/server/env";
import { EMULATOR_ENV, EXPECTED_ENV_ORDER, PRODUCTION_ENV, withEnv } from "./env-fixtures";

const STATUS_LINE = /^([A-Z_]+): (ok|falta|inválida|no aplica)$/;
const MIN_FRAGMENT = 6;

/** Valores largos y distintivos (no parecen texto de la salida) para detectar cualquier fuga. */
const DISTINCTIVE_EMULATOR_ENV: EnvInput = {
  NODE_ENV: "development",
  FIREBASE_PROJECT_ID: "Hq3Zt8Rk1Wm6Pj4Xs",
  FIREBASE_CLIENT_EMAIL: "Yw5Nc2Bv9Lq7Dk3Ge",
  FIREBASE_PRIVATE_KEY: '"Pz8Tm4Xr1Qv6Kw2Jn\\nSb5Hy9Lc3Fd7Gt"',
  FIREBASE_AUTH_EMULATOR_HOST: "Zq9Xk2Lw7Vb4Mr8Ty",
  FIRESTORE_EMULATOR_HOST: "Bv7Nq2Xc5Lz9Wp3Hk",
  NEXT_PUBLIC_FIREBASE_API_KEY: "Kp4Wd8Tz1Qx6Ys3Rm",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "Cx6Jv2Nm8Rq4Wz1Tb",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "Fj2Rm9Vx5Hc3Kq7Ln",
  NEXT_PUBLIC_FIREBASE_APP_ID: "Dn4Gw8Kt2Ys6Pb9Xv",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "Gt6Lw1Zq8Nb4Jx2Rc",
};

const DISTINCTIVE_PRODUCTION_ENV: EnvInput = withEnv(DISTINCTIVE_EMULATOR_ENV, {
  FIREBASE_AUTH_EMULATOR_HOST: "",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
});

/** Todos los fragmentos de `MIN_FRAGMENT` o más caracteres de cada valor de las 10 variables y de `VERCEL`. */
function valueFragments(env: EnvInput): string[] {
  const fragments: string[] = [];
  for (const name of [...EXPECTED_ENV_ORDER, "VERCEL"]) {
    const value = env[name] ?? "";
    for (let start = 0; start + MIN_FRAGMENT <= value.length; start += 1) {
      fragments.push(value.slice(start, start + MIN_FRAGMENT));
    }
  }
  return fragments;
}

/** Fragmentos de valores que aparecen en alguna línea (debe quedar vacío). */
function leakedFragments(lines: string[], env: EnvInput): string[] {
  const output = lines.join("\n");
  return valueFragments(env).filter((fragment) => output.includes(fragment));
}

describe("Formato de la salida de check:env (regla 25)", () => {
  it("la primera línea es «Modo: emulador» en modo emulador", () => {
    expect(checkEnv(EMULATOR_ENV).lines[0]).toBe("Modo: emulador");
  });

  it("la primera línea es «Modo: producción» en modo producción", () => {
    expect(checkEnv(PRODUCTION_ENV).lines[0]).toBe("Modo: producción");
  });

  it("ENV_VARS sigue el orden de las reglas 15 y 16", () => {
    expect([...ENV_VARS]).toEqual(EXPECTED_ENV_ORDER);
  });

  it.each([
    { label: "emulador válido", env: EMULATOR_ENV },
    { label: "producción válida", env: PRODUCTION_ENV },
    { label: "emulador inválido", env: DISTINCTIVE_EMULATOR_ENV },
    { label: "todo vacío", env: {} },
  ])("($label) hay exactamente una línea NOMBRE: <estado> por variable, en orden", ({ env }) => {
    const statusLines = checkEnv(env).lines.slice(1, 1 + EXPECTED_ENV_ORDER.length);
    const names = statusLines.map((line) => STATUS_LINE.exec(line)?.[1]);
    expect(names).toEqual(EXPECTED_ENV_ORDER);
  });

  it("las líneas de estado coinciden con el informe de la validación", () => {
    const report = validateEnv(EMULATOR_ENV);
    const expected = EXPECTED_ENV_ORDER.map((name) => `${name}: ${report.statuses[name]}`);
    expect(formatEnvReport(report).slice(1, 11)).toEqual(expected);
  });

  it("los errores de coherencia van al final, después de las 10 variables", () => {
    const env = withEnv(EMULATOR_ENV, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-otro" });
    const report = validateEnv(env);
    const lines = formatEnvReport(report);
    expect(report.errors.length).toBeGreaterThan(0);
    expect(lines.slice(11)).toEqual(report.errors);
    expect(checkEnv(env).lines).toEqual(lines);
  });

  it("sin errores de coherencia la salida tiene exactamente 11 líneas", () => {
    expect(checkEnv(EMULATOR_ENV).lines).toHaveLength(11);
  });
});

describe("Código de salida de check:env (regla 27)", () => {
  it("un entorno de emulador válido termina con código 0", () => {
    expect(checkEnv(EMULATOR_ENV).exitCode).toBe(0);
  });

  it("un entorno de producción válido termina con código 0", () => {
    expect(checkEnv(PRODUCTION_ENV).exitCode).toBe(0);
  });

  it("una variable obligatoria en «falta» termina con código 1", () => {
    expect(checkEnv(withEnv(EMULATOR_ENV, { FIRESTORE_EMULATOR_HOST: undefined })).exitCode).toBe(1);
  });

  it("un error de coherencia sin variables en falta termina con código 1", () => {
    const env = withEnv(EMULATOR_ENV, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-otro" });
    expect(checkEnv(env).exitCode).toBe(1);
  });

  it("producción fuera de NODE_ENV=production termina con código 1", () => {
    expect(checkEnv(withEnv(PRODUCTION_ENV, { NODE_ENV: "development" })).exitCode).toBe(1);
  });
});

describe("La salida nunca contiene valores (regla 26)", () => {
  it("un entorno de emulador inválido termina con código 1 y no muestra ningún valor ni fragmento", () => {
    const { lines, exitCode } = checkEnv(DISTINCTIVE_EMULATOR_ENV);
    expect(exitCode).toBe(1);
    expect(leakedFragments(lines, DISTINCTIVE_EMULATOR_ENV)).toEqual([]);
  });

  it("un entorno de producción inválido termina con código 1 y no muestra ningún valor ni fragmento", () => {
    const { lines, exitCode } = checkEnv(DISTINCTIVE_PRODUCTION_ENV);
    expect(lines[0]).toBe("Modo: producción");
    expect(exitCode).toBe(1);
    expect(leakedFragments(lines, DISTINCTIVE_PRODUCTION_ENV)).toEqual([]);
  });

  it("un entorno válido tampoco muestra valores", () => {
    const { lines } = checkEnv(PRODUCTION_ENV);
    expect(leakedFragments(lines, PRODUCTION_ENV)).toEqual([]);
  });
});

describe("Los errores de coherencia nuevos tampoco muestran valores (reglas 18, 19 y 26)", () => {
  it("emulador en Vercel con proyectos distintos: código 1 y ningún valor en la salida", () => {
    const env = withEnv(EMULATOR_ENV, {
      VERCEL: "Vq8Rk3Ld6Nw1Zt5Hy",
      FIREBASE_PROJECT_ID: "demo-Xw4Jp7Hs2Lm9",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-Tb3Qc8Wn5Kd1",
    });
    const { lines, exitCode } = checkEnv(env);
    expect(exitCode).toBe(1);
    expect(lines.length).toBeGreaterThan(11);
    expect(leakedFragments(lines, env)).toEqual([]);
  });

  it("producción con proyectos distintos: código 1 y ningún valor en la salida", () => {
    const env = withEnv(PRODUCTION_ENV, {
      FIREBASE_PROJECT_ID: "Mz6Yr2Gk9Pv4Ws",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "Jh1Nd7Bx3Qf8Lc",
    });
    const { lines, exitCode } = checkEnv(env);
    expect(exitCode).toBe(1);
    expect(lines.length).toBeGreaterThan(11);
    expect(leakedFragments(lines, env)).toEqual([]);
  });
});
