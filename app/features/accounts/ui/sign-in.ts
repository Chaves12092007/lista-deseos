import { FirebaseError } from "firebase/app";
import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { Auth } from "firebase/auth";
import { getClientAuth } from "@/shared/firebase-client";
import type { CreateSessionInput } from "../schema";
import { LOGIN_FAILED_MESSAGE, loginErrorMessage } from "./login-error-message";

/**
 * Ingreso desde el navegador (reglas 11–14): Firebase verifica la contraseña, el `id_token` viaja a
 * `POST /api/session` y después se cierra la sesión del SDK cliente. La sesión vive solo en la cookie.
 */

export type SignInResult = { ok: true } | { ok: false; message: string };

const SESSION_ENDPOINT = "/api/session";
const SESSION_CREATED_STATUS = 204;

function messageForError<T>(error: T): string {
  if (error instanceof FirebaseError) {
    return loginErrorMessage(error.code);
  }
  return LOGIN_FAILED_MESSAGE;
}

function ignoreSignOutError(): void {
  // Cerrar el SDK cliente es limpieza: si falla, la sesión de la cookie ya quedó decidida.
}

async function postIdToken(idToken: string): Promise<boolean> {
  const body: CreateSessionInput = { id_token: idToken };
  const response = await fetch(SESSION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.status === SESSION_CREATED_STATUS;
}

async function startSession(auth: Auth, email: string, password: string): Promise<SignInResult> {
  try {
    await setPersistence(auth, inMemoryPersistence);
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const created = await postIdToken(await credential.user.getIdToken());
    if (!created) {
      return { ok: false, message: LOGIN_FAILED_MESSAGE };
    }
    return { ok: true };
  } finally {
    await signOut(auth).catch(ignoreSignOutError);
  }
}

export async function signInAndStartSession(email: string, password: string): Promise<SignInResult> {
  try {
    return await startSession(getClientAuth(), email, password);
  } catch (error) {
    return { ok: false, message: messageForError(error) };
  }
}
