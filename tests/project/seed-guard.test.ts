import { describe, expect, it } from "vitest";
import type { EnvInput } from "@/shared/server/env";
import { seedEnvironmentProblems } from "../../scripts/seed-guard";

const EMULATOR_ENV: EnvInput = {
  FIREBASE_PROJECT_ID: "demo-lista-deseos",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
};

function withEnv(changes: EnvInput): EnvInput {
  return { ...EMULATOR_ENV, ...changes };
}

describe("seed: solo corre contra el emulador", () => {
  it("acepta el emulador local con un proyecto demo-", () => {
    expect(seedEnvironmentProblems(EMULATOR_ENV)).toEqual([]);
    expect(seedEnvironmentProblems(withEnv({ FIRESTORE_EMULATOR_HOST: "localhost:8080" }))).toEqual([]);
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_AUTH_EMULATOR_HOST: "[::1]:9099" }))).toEqual([]);
  });

  it("se niega sin el host del emulador de Auth", () => {
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_AUTH_EMULATOR_HOST: undefined }))).toHaveLength(1);
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_AUTH_EMULATOR_HOST: "" }))).toHaveLength(1);
  });

  it("se niega sin el host del emulador de Firestore", () => {
    const problems = seedEnvironmentProblems(withEnv({ FIRESTORE_EMULATOR_HOST: undefined }));
    expect(problems).toHaveLength(1);
    expect(problems.join(" ")).toContain("FIRESTORE_EMULATOR_HOST");
  });

  it("se niega con un proyecto que no empieza con demo-", () => {
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_PROJECT_ID: "lista-deseos-prod" }))).toHaveLength(1);
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_PROJECT_ID: "demo-" }))).toHaveLength(1);
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_PROJECT_ID: undefined }))).toHaveLength(1);
  });

  it("se niega si un host del emulador no es de esta máquina", () => {
    expect(seedEnvironmentProblems(withEnv({ FIRESTORE_EMULATOR_HOST: "10.0.0.5:8080" }))).toHaveLength(1);
    expect(seedEnvironmentProblems(withEnv({ FIREBASE_AUTH_EMULATOR_HOST: "firebase.example.com:9099" }))).toHaveLength(
      1,
    );
  });

  it("con producción (sin emuladores y proyecto real) reúne todos los motivos", () => {
    const problems = seedEnvironmentProblems({ FIREBASE_PROJECT_ID: "mi-proyecto-real", NODE_ENV: "production" });
    expect(problems).toHaveLength(3);
  });

  it("nunca muestra el valor de las variables", () => {
    const secret = "mi-proyecto-secreto-xyz";
    const problems = seedEnvironmentProblems({ FIREBASE_PROJECT_ID: secret, FIRESTORE_EMULATOR_HOST: "8.8.8.8:1" });
    expect(problems.join("\n")).not.toContain(secret);
    expect(problems.join("\n")).not.toContain("8.8.8.8");
  });
});
