import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import type { App, AppOptions } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Auth } from "firebase-admin/auth";
import { getFirestore as getAppFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import { readValidEnv } from "./env";
import type { ValidEnv } from "./env";

/**
 * Clientes de Firebase Admin (F0, reglas 23 y 28). Importar este módulo no valida nada: el entorno se
 * valida en el primer uso y todas las llamadas comparten una única app con nombre propio.
 */

const APP_NAME = "lista-deseos";

let cachedApp: App | undefined;

/** Credenciales de producción; `null` en emulador (la app se inicializa solo con `projectId`). */
export function adminCredentials(env: ValidEnv): { projectId: string; clientEmail: string; privateKey: string } | null {
  if (env.mode === "emulador" || env.clientEmail === null || env.privateKey === null) {
    return null;
  }
  return { projectId: env.projectId, clientEmail: env.clientEmail, privateKey: env.privateKey };
}

function appOptions(env: ValidEnv): AppOptions {
  const credentials = adminCredentials(env);
  if (credentials === null) {
    return { projectId: env.projectId };
  }
  return { projectId: credentials.projectId, credential: cert(credentials) };
}

function getAdminApp(): App {
  if (cachedApp !== undefined) {
    return cachedApp;
  }
  const env = readValidEnv(process.env);
  const existing = getApps().find((app) => app.name === APP_NAME);
  cachedApp = existing ?? initializeApp(appOptions(env), APP_NAME);
  return cachedApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getFirestore(): Firestore {
  return getAppFirestore(getAdminApp());
}
