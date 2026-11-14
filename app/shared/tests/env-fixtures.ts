import type { EnvInput, EnvVarName } from "@/shared/server/env";

/** Las 10 variables en el orden de las reglas 15 y 16 (orden de la salida de `check:env`). */
export const EXPECTED_ENV_ORDER: EnvVarName[] = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIRESTORE_EMULATOR_HOST",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_USE_FIREBASE_EMULATORS",
];

/** Entorno de emulador correcto (regla 18). */
export const EMULATOR_ENV: EnvInput = {
  NODE_ENV: "development",
  FIREBASE_PROJECT_ID: "demo-lista-deseos",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-lista-deseos",
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
};

/** Clave de prueba (no es una clave real) entre comillas y con `\n` literales, como llega de un .env. */
export const RAW_PRIVATE_KEY = '"LLAVE-FALSA-LINEA-1\\nLLAVE-FALSA-LINEA-2\\n"';
export const NORMALIZED_PRIVATE_KEY = "LLAVE-FALSA-LINEA-1\nLLAVE-FALSA-LINEA-2\n";

/** Entorno de producción correcto (regla 19). Valores inventados. */
export const PRODUCTION_ENV: EnvInput = {
  NODE_ENV: "production",
  FIREBASE_PROJECT_ID: "lista-deseos-prod",
  FIREBASE_CLIENT_EMAIL: "admin@lista-deseos-prod.iam.example.com",
  FIREBASE_PRIVATE_KEY: RAW_PRIVATE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: "clave-publica-de-prueba",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "lista-deseos-prod.example.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "lista-deseos-prod",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
};

/** Copia de un entorno con cambios; `undefined` quita la variable. */
export function withEnv(base: EnvInput, changes: Record<string, string | undefined>): EnvInput {
  const result: Record<string, string | undefined> = { ...base };
  for (const [name, value] of Object.entries(changes)) {
    if (value === undefined) {
      delete result[name];
    } else {
      result[name] = value;
    }
  }
  return result;
}

/** Ejecuta `action` y devuelve el error que lanza; falla si no lanza o si no es un `Error`. */
export function thrownError(action: () => void): Error {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw new Error("Se lanzó algo que no es un Error");
  }
  throw new Error("Se esperaba que lanzara un error");
}
