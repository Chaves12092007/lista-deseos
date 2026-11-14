import { getApps, initializeApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";

/**
 * Cliente de Firebase del navegador, solo Authentication (F0, regla 29).
 * Las variables se leen con acceso literal porque Next solo inlinea `process.env.NEXT_PUBLIC_*` así.
 */

const APP_NAME = "lista-deseos";
const AUTH_EMULATOR_URL = "http://127.0.0.1:9099";

let clientAuth: Auth | undefined;

function clientApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing !== undefined) {
    return existing;
  }
  return initializeApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    APP_NAME,
  );
}

export function getClientAuth(): Auth {
  if (clientAuth !== undefined) {
    return clientAuth;
  }
  const auth = getAuth(clientApp());
  // `emulatorConfig` evita conectar dos veces la misma instancia (por ejemplo, tras una recarga en caliente).
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && auth.emulatorConfig === null) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL);
  }
  clientAuth = auth;
  return auth;
}
