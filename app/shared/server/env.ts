/**
 * Validación del entorno de Firebase (F0, reglas 15–27). Pura: recibe el objeto de variables y nunca
 * lee `process.env`. Ningún mensaje ni línea de salida contiene el valor de una variable.
 */

export const SERVER_ENV_VARS = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_AUTH_EMULATOR_HOST",
  "FIRESTORE_EMULATOR_HOST",
] as const;
export const CLIENT_ENV_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_USE_FIREBASE_EMULATORS",
] as const;
/** Orden de la salida de `check:env`. */
export const ENV_VARS = [...SERVER_ENV_VARS, ...CLIENT_ENV_VARS] as const;

export type EnvVarName = (typeof ENV_VARS)[number];
export type EnvStatus = "ok" | "falta" | "inválida" | "no aplica";
export type EnvMode = "emulador" | "producción";
/** Variables de entorno (incluye `NODE_ENV`). */
export type EnvInput = Readonly<Record<string, string | undefined>>;

export interface EnvReport {
  mode: EnvMode;
  statuses: Record<EnvVarName, EnvStatus>;
  errors: string[];
  ok: boolean;
}

/** `privateKey` ya normalizada; `clientEmail` y `privateKey` son `null` en emulador. */
export interface ValidEnv {
  mode: EnvMode;
  projectId: string;
  clientEmail: string | null;
  privateKey: string | null;
}

/** Entorno inválido: nombra las variables con problema, su estado y los errores de coherencia; nunca valores. */
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

const DEMO_PREFIX = "demo-";
const DEV_ONLY_EMULATOR = "En desarrollo solo se usa el emulador de Firebase";
const EMULATOR_FLAG = "NEXT_PUBLIC_USE_FIREBASE_EMULATORS";
const EMULATOR_ON_VERCEL = "El emulador de Firebase no se usa en Vercel (FIREBASE_AUTH_EMULATOR_HOST)";

type EmulatorFlag = "true" | "false" | "invalid";

interface ModeResult {
  statuses: Record<EnvVarName, EnvStatus>;
  errors: string[];
}

/** Valor de la variable; una variable vacía cuenta como sin definir. */
function readVar(vars: EnvInput, name: string): string | undefined {
  const value = vars[name];
  if (value === undefined || value === "") {
    return undefined;
  }
  return value;
}

function presence(vars: EnvInput, name: EnvVarName): EnvStatus {
  if (readVar(vars, name) === undefined) {
    return "falta";
  }
  return "ok";
}

/** Regla 20: solo `"true"` o `"false"`; sin definir equivale a `"false"`. */
function emulatorFlag(vars: EnvInput): EmulatorFlag {
  const value = readVar(vars, EMULATOR_FLAG);
  if (value === undefined || value === "false") {
    return "false";
  }
  if (value === "true") {
    return "true";
  }
  return "invalid";
}

function flagStatus(flag: EmulatorFlag): EnvStatus {
  if (flag === "invalid") {
    return "inválida";
  }
  return "ok";
}

function emulatorProjectStatus(vars: EnvInput): EnvStatus {
  const projectId = readVar(vars, "FIREBASE_PROJECT_ID");
  if (projectId === undefined) {
    return "falta";
  }
  if (!projectId.startsWith(DEMO_PREFIX) || projectId === DEMO_PREFIX) {
    return "inválida";
  }
  return "ok";
}

/** Reglas 18 y 19: si las dos están definidas, el proyecto del navegador debe ser el del servidor. */
function projectMismatchErrors(vars: EnvInput): string[] {
  const serverProject = readVar(vars, "FIREBASE_PROJECT_ID");
  const clientProject = readVar(vars, "NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (serverProject !== undefined && clientProject !== undefined && serverProject !== clientProject) {
    return ["NEXT_PUBLIC_FIREBASE_PROJECT_ID no coincide con FIREBASE_PROJECT_ID"];
  }
  return [];
}

function emulatorErrors(vars: EnvInput, flag: EmulatorFlag): string[] {
  const errors = projectMismatchErrors(vars);
  if (flag === "false") {
    errors.push(`${EMULATOR_FLAG} debe ser "true" en modo emulador`);
  }
  if (readVar(vars, "VERCEL") !== undefined) {
    errors.push(EMULATOR_ON_VERCEL);
  }
  return errors;
}

/** Regla 18. */
function validateEmulator(vars: EnvInput): ModeResult {
  const flag = emulatorFlag(vars);
  const statuses: Record<EnvVarName, EnvStatus> = {
    FIREBASE_PROJECT_ID: emulatorProjectStatus(vars),
    FIREBASE_CLIENT_EMAIL: "no aplica",
    FIREBASE_PRIVATE_KEY: "no aplica",
    FIREBASE_AUTH_EMULATOR_HOST: "ok",
    FIRESTORE_EMULATOR_HOST: presence(vars, "FIRESTORE_EMULATOR_HOST"),
    NEXT_PUBLIC_FIREBASE_API_KEY: presence(vars, "NEXT_PUBLIC_FIREBASE_API_KEY"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "no aplica",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: presence(vars, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    NEXT_PUBLIC_FIREBASE_APP_ID: "no aplica",
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: flagStatus(flag),
  };
  return { statuses, errors: emulatorErrors(vars, flag) };
}

function productionErrors(vars: EnvInput, flag: EmulatorFlag): string[] {
  const errors = projectMismatchErrors(vars);
  if (readVar(vars, "FIRESTORE_EMULATOR_HOST") !== undefined) {
    errors.push("FIRESTORE_EMULATOR_HOST debe quedar sin definir en modo producción");
  }
  if (flag === "true") {
    errors.push(`${EMULATOR_FLAG} no puede ser "true" en modo producción`);
  }
  if (vars.NODE_ENV !== "production") {
    errors.push(DEV_ONLY_EMULATOR);
  }
  return errors;
}

/** Reglas 19 y 21. */
function validateProduction(vars: EnvInput): ModeResult {
  const flag = emulatorFlag(vars);
  const statuses: Record<EnvVarName, EnvStatus> = {
    FIREBASE_PROJECT_ID: presence(vars, "FIREBASE_PROJECT_ID"),
    FIREBASE_CLIENT_EMAIL: presence(vars, "FIREBASE_CLIENT_EMAIL"),
    FIREBASE_PRIVATE_KEY: presence(vars, "FIREBASE_PRIVATE_KEY"),
    FIREBASE_AUTH_EMULATOR_HOST: "no aplica",
    FIRESTORE_EMULATOR_HOST: "no aplica",
    NEXT_PUBLIC_FIREBASE_API_KEY: presence(vars, "NEXT_PUBLIC_FIREBASE_API_KEY"),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: presence(vars, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: presence(vars, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    NEXT_PUBLIC_FIREBASE_APP_ID: presence(vars, "NEXT_PUBLIC_FIREBASE_APP_ID"),
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: flagStatus(flag),
  };
  return { statuses, errors: productionErrors(vars, flag) };
}

function isProblem(status: EnvStatus): boolean {
  return status === "falta" || status === "inválida";
}

/** Valida el entorno según el modo (regla 17: emulador ⇔ `FIREBASE_AUTH_EMULATOR_HOST` no vacía). */
export function validateEnv(vars: EnvInput): EnvReport {
  let mode: EnvMode = "producción";
  let result: ModeResult;
  if (readVar(vars, "FIREBASE_AUTH_EMULATOR_HOST") === undefined) {
    result = validateProduction(vars);
  } else {
    mode = "emulador";
    result = validateEmulator(vars);
  }
  const hasProblems = ENV_VARS.some((name) => isProblem(result.statuses[name]));
  return { mode, statuses: result.statuses, errors: result.errors, ok: !hasProblems && result.errors.length === 0 };
}

/** Regla 22: quita las comillas envolventes (`"…"` o `'…'`) y cambia los `\n` literales por saltos reales. */
export function normalizePrivateKey(raw: string): string {
  let key = raw;
  const first = key.charAt(0);
  if (key.length >= 2 && (first === '"' || first === "'") && key.endsWith(first)) {
    key = key.slice(1, -1);
  }
  return key.replaceAll("\\n", "\n");
}

/** Regla 25: modo, una línea por variable en el orden de `ENV_VARS` y, al final, los errores de coherencia. */
export function formatEnvReport(report: EnvReport): string[] {
  const statusLines = ENV_VARS.map((name) => `${name}: ${report.statuses[name]}`);
  return [`Modo: ${report.mode}`, ...statusLines, ...report.errors];
}

/** Regla 27: código 0 solo si el entorno es válido. */
export function checkEnv(vars: EnvInput): { lines: string[]; exitCode: 0 | 1 } {
  const report = validateEnv(vars);
  let exitCode: 0 | 1 = 1;
  if (report.ok) {
    exitCode = 0;
  }
  return { lines: formatEnvReport(report), exitCode };
}

function envErrorMessage(report: EnvReport): string {
  const problems = ENV_VARS.filter((name) => isProblem(report.statuses[name])).map(
    (name) => `${name}: ${report.statuses[name]}`,
  );
  const details = [...problems, ...report.errors].join("; ");
  return `Entorno de Firebase inválido (modo ${report.mode}). ${details}. Revisa con npm run check:env.`;
}

/** Valor de una variable que la validación ya exigió. */
function requiredVar(vars: EnvInput, name: EnvVarName): string {
  const value = readVar(vars, name);
  if (value === undefined) {
    throw new EnvError(`${name}: falta`);
  }
  return value;
}

/** Regla 23: devuelve el entorno listo para Firebase o lanza `EnvError` si no es válido. */
export function readValidEnv(vars: EnvInput): ValidEnv {
  const report = validateEnv(vars);
  if (!report.ok) {
    throw new EnvError(envErrorMessage(report));
  }
  const projectId = requiredVar(vars, "FIREBASE_PROJECT_ID");
  if (report.mode === "emulador") {
    return { mode: report.mode, projectId, clientEmail: null, privateKey: null };
  }
  return {
    mode: report.mode,
    projectId,
    clientEmail: requiredVar(vars, "FIREBASE_CLIENT_EMAIL"),
    privateKey: normalizePrivateKey(requiredVar(vars, "FIREBASE_PRIVATE_KEY")),
  };
}
