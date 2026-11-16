/**
 * Barrera del seed (`npm run seed`): decide si el entorno es seguro para escribir datos de ejemplo.
 * Pura: recibe el objeto de variables y nunca lee `process.env`. Solo se permite el emulador de Firebase
 * (Auth y Firestore en esta misma máquina) con un proyecto `demo-…`; cualquier otro caso se niega.
 */
import type { EnvInput } from "../app/shared/server/env";

const DEMO_PREFIX = "demo-";
const AUTH_HOST_VAR = "FIREBASE_AUTH_EMULATOR_HOST";
const FIRESTORE_HOST_VAR = "FIRESTORE_EMULATOR_HOST";
const PROJECT_VAR = "FIREBASE_PROJECT_ID";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Valor de la variable; una variable vacía cuenta como sin definir. */
function readVar(vars: EnvInput, name: string): string | undefined {
  const value = vars[name];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

/** Quita el `:puerto` final de `host:puerto`. */
function hostOf(address: string): string {
  const colon = address.lastIndexOf(":");
  if (colon === -1) {
    return address;
  }
  return address.slice(0, colon);
}

/** Problemas de una variable de host del emulador: ausente o fuera de esta máquina. Nunca muestra su valor. */
function emulatorHostProblems(vars: EnvInput, name: string): string[] {
  const address = readVar(vars, name);
  if (address === undefined) {
    return [`Falta ${name}: no estás en modo emulador.`];
  }
  if (!LOOPBACK_HOSTS.has(hostOf(address))) {
    return [`${name} no apunta a esta máquina (127.0.0.1 o localhost): el seed solo escribe en el emulador local.`];
  }
  return [];
}

function projectProblems(vars: EnvInput): string[] {
  const projectId = readVar(vars, PROJECT_VAR);
  if (projectId === undefined) {
    return [`Falta ${PROJECT_VAR}: debe ser un proyecto que empiece con "${DEMO_PREFIX}".`];
  }
  if (!projectId.startsWith(DEMO_PREFIX) || projectId === DEMO_PREFIX) {
    return [`${PROJECT_VAR} debe empezar con "${DEMO_PREFIX}" (por ejemplo, demo-lista-deseos).`];
  }
  return [];
}

/** Lista de motivos por los que el seed se niega a correr; vacía si el entorno es el emulador con un proyecto demo. */
export function seedEnvironmentProblems(vars: EnvInput): string[] {
  return [
    ...emulatorHostProblems(vars, AUTH_HOST_VAR),
    ...emulatorHostProblems(vars, FIRESTORE_HOST_VAR),
    ...projectProblems(vars),
  ];
}
