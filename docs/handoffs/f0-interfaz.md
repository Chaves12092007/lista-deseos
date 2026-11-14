# F0 · Interfaz pública acordada (la fija el orquestador)

Complementa `docs/specs/f0-base-del-proyecto.md` con los nombres y firmas exactos, para que pruebas y código se escriban por separado contra el mismo acuerdo.

Contrato del cable: `app/shared/schema.ts`: `ErrorCodeSchema`, `ErrorFieldsSchema`, `ErrorBodySchema`, tipos `ErrorCode`, `ErrorFields`, `ErrorBody`.

## `app/shared/server/errors.ts`

- `abstract class DomainError extends Error { readonly code: ErrorCode; readonly status: number }`
- `ValidationError(message: string, fields?: ErrorFields)` → `VALIDATION`, 400, propiedad `fields?: ErrorFields`
- `UnauthenticatedError(message?: string)` → `UNAUTHENTICATED`, 401 (mensaje por defecto en español)
- `ForbiddenError(message?: string)` → `FORBIDDEN`, 403 (mensaje por defecto en español)
- `NotFoundError(message: string)` → `NOT_FOUND`, 404
- `ConflictError(message: string)` → `CONFLICT`, 409
- `const INTERNAL_ERROR_MESSAGE = "Ocurrió un error inesperado. Intenta de nuevo."`

## `app/shared/server/http.ts`

- `toErrorResponse<T>(error: T): Response`
  - Primero `unstable_rethrow(error)` (de `next/navigation`): un `notFound()`/`redirect()` de Next se re-lanza.
  - `DomainError` → su status y `{ error: { code, message } }`; `fields` solo en 400 y solo si hay campos.
  - `ZodError` → 400 `VALIDATION`, mensaje genérico en español, `fields`: ruta unida con `.` → primer mensaje de ese campo; ruta vacía → clave `_`.
  - Cualquier otra cosa (incluido un valor que no es `Error`) → 500 con exactamente `{ error: { code: "INTERNAL", message: INTERNAL_ERROR_MESSAGE } }`.
  - `Content-Type: application/json`.
- `assertSameOrigin(request: Request): void`
  - `POST`, `PUT`, `PATCH`, `DELETE`: si falta `Origin`, no es una URL válida o su `origin` (esquema + host + puerto) ≠ `new URL(request.url).origin` → lanza `ForbiddenError`.
  - Cualquier otro método (`GET`, `HEAD`, `OPTIONS`…): no revisa.

## `app/shared/server/session.ts` (lógica pura, sin Next ni Firebase)

```ts
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 432000; // 5 días
export const MAX_TOKEN_AGE_SECONDS = 300; // 5 min
export interface Session {
  uid: string;
  email: string | null;
}
export interface VerifiedIdToken {
  uid: string;
  email?: string;
  auth_time: number;
} // auth_time en segundos (epoch)
export interface VerifiedSessionCookie {
  uid: string;
  email?: string;
}
export interface SessionVerifier {
  verifyIdToken(idToken: string): Promise<VerifiedIdToken>; // credencial rechazada → lanza InvalidCredentialError; otra falla → lanza ese error
  createSessionCookie(idToken: string, options: { expiresIn: number }): Promise<string>; // expiresIn en ms (432000 * 1000); mismas reglas de error
  verifySessionCookie(cookie: string, checkRevoked: boolean): Promise<VerifiedSessionCookie>; // mismas reglas de error
}
/** Lo lanza un SessionVerifier cuando Firebase Auth rechaza el token o la cookie (vencida, revocada, alterada, usuario deshabilitado…). */
export class InvalidCredentialError extends Error {}
export interface SessionCookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  secure: boolean;
}
export interface CookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, options: SessionCookieOptions): void;
  delete(name: string): void;
}
export interface SessionDeps {
  verifier: SessionVerifier;
  cookies: CookieJar;
  now: () => number;
  isProduction: boolean;
} // now en ms
export interface SessionManager {
  createSession(idToken: string): Promise<void>;
  getSession(): Promise<Session | null>;
  requireSession(): Promise<Session>;
  clearSession(): Promise<void>;
}
export function createSessionManager(deps: SessionDeps): SessionManager;
```

- `idToken` vacío → `UnauthenticatedError` sin llamar al verificador. Verificador lanza `InvalidCredentialError` → `UnauthenticatedError`. Cualquier otro error del verificador se propaga tal cual (spec, regla 11 actualizada).
- `now() - auth_time * 1000 > 300000` → `UnauthenticatedError` y no se guarda la cookie (300 s exactos se aceptan; 301 s no). Falla cerrada: si `auth_time` no es un número finito → `UnauthenticatedError` (escribir la condición como «aceptar solo si edad ≤ 300 s»).
- Cookie: `set("session", valor, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 432000, secure: isProduction })`.
- `getSession`: cookie ausente o vacía → `null` sin llamar al verificador; llama `verifySessionCookie(cookie, true)`; si lanza `InvalidCredentialError` → `null`; cualquier otro error se propaga; `email` ausente → `null`.
- `requireSession` sin sesión → `UnauthenticatedError`. `clearSession` → `cookies.delete("session")`.

## `app/shared/server/session-next.ts` (`import "server-only"`)

Exporta `createSession`, `getSession`, `requireSession`, `clearSession`, conectando `cookies()` de `next/headers` y `getAdminAuth()`. `isProduction = process.env.NODE_ENV === "production"`. El `delete` del adaptador pone la cookie con `maxAge: 0` y los mismos atributos. Pegamento sin pruebas unitarias.

Clasificación de errores en `app/shared/server/firebase-auth-errors.ts` (puro, con pruebas): `isRejectedCredential<T>(error: T): boolean` → `true` solo si es un `FirebaseAuthError` (de `firebase-admin/auth`) con código de credencial rechazada: `auth/argument-error`, `auth/invalid-id-token`, `auth/id-token-expired`, `auth/id-token-revoked`, `auth/session-cookie-expired`, `auth/session-cookie-revoked`, `auth/user-disabled`, `auth/user-not-found`. Cualquier otro código (por ejemplo `auth/invalid-session-cookie-duration`, que es un error del servidor) → `false`. El adaptador vive en `app/shared/server/admin-verifier.ts` (puro, sin `server-only`, con pruebas): `createAdminVerifier(getAuth: () => AdminAuthPort): SessionVerifier`, donde `AdminAuthPort` es `Pick<Auth, "verifyIdToken" | "createSessionCookie" | "verifySessionCookie">` de `firebase-admin/auth`. Llama a `getAuth()` en cada operación (perezoso: sin operación no se toca Firebase) y pasa `idToken`, `cookie`, `checkRevoked` y `expiresIn` tal cual. `session-next.ts` solo hace `createAdminVerifier(getAdminAuth)`. **Forma previa (regla 11, hallazgo R1 de security):** antes de llamar al SDK, `verifyIdToken`, `createSessionCookie` y `verifySessionCookie` comprueban que el texto tenga forma de JWT: exactamente 3 partes separadas por `.`, cada una base64url no vacía, y que la cabecera y el payload decodifiquen a JSON que sea un objeto (no `null`, ni lista, ni texto). Si no la tiene → `InvalidCredentialError` **sin llamar a `getAuth()`** (el SDK lanzaría `SyntaxError`/`TypeError`, que no es `FirebaseAuthError`). Función pura exportada: `hasJwtShape(token: string): boolean`. El verificador envuelve cada llamada: si `isRejectedCredential(error)` lanza `InvalidCredentialError`; si no, relanza el error original.

## `app/shared/server/env.ts` (puro: recibe el objeto de variables, nunca lee `process.env`)

```ts
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
export const ENV_VARS = [...SERVER_ENV_VARS, ...CLIENT_ENV_VARS] as const; // orden de la salida
export type EnvVarName = (typeof ENV_VARS)[number];
export type EnvStatus = "ok" | "falta" | "inválida" | "no aplica";
export type EnvMode = "emulador" | "producción";
export type EnvInput = Readonly<Record<string, string | undefined>>; // incluye NODE_ENV
export interface EnvReport {
  mode: EnvMode;
  statuses: Record<EnvVarName, EnvStatus>;
  errors: string[];
  ok: boolean;
}
export function validateEnv(vars: EnvInput): EnvReport;
export function normalizePrivateKey(raw: string): string; // quita comillas envolventes ("…" o '…') y cambia `\n` literales por saltos reales
export function formatEnvReport(report: EnvReport): string[]; // ["Modo: emulador", "FIREBASE_PROJECT_ID: ok", … 10 líneas …, …errores]
export function checkEnv(vars: EnvInput): { lines: string[]; exitCode: 0 | 1 };
export interface ValidEnv {
  mode: EnvMode;
  projectId: string;
  clientEmail: string | null;
  privateKey: string | null;
} // privateKey ya normalizada; null en emulador
export class EnvError extends Error {} // nombra variables con problema + estado + errores de coherencia; nunca valores
export function readValidEnv(vars: EnvInput): ValidEnv; // lanza EnvError si !ok
```

Una variable vacía (`""`) cuenta como sin definir. Modo emulador ⇔ `FIREBASE_AUTH_EMULATOR_HOST` no vacía.

- **Emulador:** `FIREBASE_AUTH_EMULATOR_HOST` ok. `FIREBASE_PROJECT_ID` falta, o inválida si no empieza con `demo-` o es exactamente `demo-`. `FIRESTORE_EMULATOR_HOST` y `NEXT_PUBLIC_FIREBASE_API_KEY` falta/ok. `NEXT_PUBLIC_FIREBASE_PROJECT_ID` falta/ok; si difiere de `FIREBASE_PROJECT_ID` → error de coherencia. `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`: distinto de `"true"`/`"false"` → inválida; sin definir o `"false"` → error de coherencia. `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_APP_ID` → «no aplica». Si `VERCEL` (no es una de las 10 variables del informe) está definida y no vacía → error de coherencia «El emulador de Firebase no se usa en Vercel (FIREBASE_AUTH_EMULATOR_HOST)».
- **Producción:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` y las cuatro `NEXT_PUBLIC_FIREBASE_*` → falta/ok. Si ambas están definidas y `NEXT_PUBLIC_FIREBASE_PROJECT_ID` ≠ `FIREBASE_PROJECT_ID` → error de coherencia (mismo texto que en emulador). `FIREBASE_AUTH_EMULATOR_HOST` → «no aplica». `FIRESTORE_EMULATOR_HOST` → «no aplica»; si está definida → error de coherencia. `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`: distinto de `"true"`/`"false"` → inválida; `"true"` → error de coherencia; sin definir o `"false"` → ok. Si `NODE_ENV !== "production"` → error «En desarrollo solo se usa el emulador de Firebase».
- `ok` = ninguna variable en falta/inválida y `errors` vacío. `exitCode` 0 si ok, 1 si no.

## `app/shared/server/firebase-admin.ts` (`import "server-only"`)

- `adminCredentials(env: ValidEnv): { projectId: string; clientEmail: string; privateKey: string } | null` — `null` en emulador (se inicializa solo con `projectId`).
- `getAdminAuth(): Auth` y `getFirestore(): Firestore` validan `readValidEnv(process.env)` en el **primer uso** (importar el módulo no valida ni lanza) y reutilizan una única app con nombre propio (`getApps()` + `initializeApp(opciones, "lista-deseos")`): dos llamadas devuelven la misma instancia.

## `app/shared/firebase-client.ts` (navegador; sin pruebas unitarias)

`getClientAuth(): Auth` — SDK `firebase`, solo Auth; lee `process.env.NEXT_PUBLIC_*` con acceso literal; si `NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"` llama una sola vez a `connectAuthEmulator(auth, "http://127.0.0.1:9099")`.

## `scripts/check-env.ts`

`const { lines, exitCode } = checkEnv(process.env)`; escribe `lines.join("\n") + "\n"` con `process.stdout.write`; `process.exitCode = exitCode`.
