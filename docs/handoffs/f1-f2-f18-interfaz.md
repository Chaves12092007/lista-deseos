# F1 + F2 + F18 · Interfaz pública acordada (la fija el orquestador)

Complementa `docs/specs/f1-f2-f18-cuentas.md` con los nombres y firmas exactos, para que las pruebas y el código se escriban por separado contra el mismo acuerdo. Reutiliza lo de F0 (`docs/handoffs/f0-interfaz.md`).

## Contrato: `app/features/accounts/schema.ts` (ya escrito)

- `RegisterAccountInputSchema` → `{ email, password, password_confirmation }`. Tipos: `RegisterAccountInput` (entrada) y `RegisterAccountData` (salida, con el correo normalizado).
- `RegisterAccountOutputSchema` → `{ email }`. Tipo `RegisterAccountOutput`.
- `CreateSessionInputSchema` → `{ id_token }` de 1 a 4096 caracteres. Tipo `CreateSessionInput`.
- `LoginFormSchema` → `{ email, password }`, ambos no vacíos. No viaja al servidor.
- Constantes exportadas: `EMAIL_MAX_LENGTH`, `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`, `ID_TOKEN_MAX_LENGTH` y los mensajes (`EMAIL_REQUIRED_MESSAGE`, `EMAIL_INVALID_MESSAGE`, `EMAIL_TOO_LONG_MESSAGE`, `PASSWORD_TOO_SHORT_MESSAGE`, `PASSWORD_TOO_LONG_MESSAGE`, `PASSWORD_MISMATCH_MESSAGE`, `PASSWORD_REQUIRED_MESSAGE` y `EMAIL_TAKEN_MESSAGE`).

## Puertos: `app/features/accounts/server/auth-port.ts`

```ts
import type { Session } from "@/shared/server/session";

export interface NewAccount {
  email: string;
  password: string;
}
/** Firebase Auth visto desde Cuentas. */
export interface AccountAuthPort {
  /** Correo ya registrado → lanza ConflictError(EMAIL_TAKEN_MESSAGE). Cualquier otro error se propaga tal cual. */
  createUser(account: NewAccount): Promise<void>;
  /** Revoca los refresh tokens del uid (cierra todas sus sesiones). */
  revokeSessions(uid: string): Promise<void>;
}
/** Sesión de F0 (session-next.ts la cumple por estructura). */
export interface SessionPort {
  createSession(idToken: string): Promise<void>;
  getSession(): Promise<Session | null>;
  clearSession(): Promise<void>;
}
```

## Servicio: `app/features/accounts/server/account-service.ts`

```ts
export interface AccountServiceDeps {
  auth: AccountAuthPort;
  sessions: SessionPort;
}
export interface AccountService {
  register(input: RegisterAccountInput): Promise<RegisterAccountOutput>;
  startSession(input: CreateSessionInput): Promise<void>;
  endSession(): Promise<void>;
}
export function createAccountService(deps: AccountServiceDeps): AccountService;
```

- `register`: vuelve a validar con `RegisterAccountInputSchema.parse(input)` (un `ZodError` se propaga y la ruta lo convierte en 400). Si la validación falla, **no** llama a `auth.createUser`. Llama `auth.createUser({ email: normalizado, password })` y devuelve `{ email: normalizado }`. Los errores de `createUser` se propagan sin cambios.
- `startSession`: `CreateSessionInputSchema.parse(input)`. Si la validación falla, no llama a `sessions.createSession`. Después llama `sessions.createSession(id_token)`. Sus errores (`UnauthenticatedError` u otros) se propagan.
- `endSession`: `const session = await sessions.getSession()`.
  - Si hay sesión → `await auth.revokeSessions(session.uid)` y después `await sessions.clearSession()`.
  - Si es `null` → solo `sessions.clearSession()`.
  - Si `revokeSessions` lanza → se propaga y **no** se llama a `clearSession`.
  - Si `getSession` lanza → se propaga y no se borra nada.

## Adaptador: `app/features/accounts/server/auth-port.firebase.ts` (puro, sin `server-only`)

```ts
import type { Auth } from "firebase-admin/auth";
export type AdminAccountAuth = Pick<Auth, "createUser" | "revokeRefreshTokens">;
export function createFirebaseAccountAuth(getAuth: () => AdminAccountAuth): AccountAuthPort;
```

- Llama a `getAuth()` en cada operación, nunca al crearse (perezoso).
- `createUser` llama `auth.createUser({ email, password })`.
  - Si lanza un `FirebaseAuthError` (de `firebase-admin/auth`) con `code === "auth/email-already-exists"` → `ConflictError(EMAIL_TAKEN_MESSAGE)`.
  - Cualquier otro error se relanza sin cambios.
- `revokeSessions(uid)` llama `auth.revokeRefreshTokens(uid)`. Sus errores se relanzan sin cambios.

## Doble: `app/features/accounts/server/auth-port.memory.ts`

```ts
export class InMemoryAccountAuth implements AccountAuthPort {
  readonly accounts: NewAccount[]; // cuentas creadas, en orden
  readonly revokedUids: string[];
  failCreateWith(error: Error): void; // la próxima y siguientes createUser lanzan ese error
  failRevokeWith(error: Error): void;
  // createUser con un correo ya presente en `accounts` → ConflictError(EMAIL_TAKEN_MESSAGE)
}
```

## Contenedor: `app/features/container.ts`

`export function getAccountService(): AccountService`: conecta `createFirebaseAccountAuth(getAdminAuth)` y `{ createSession, getSession, clearSession }` de `@/shared/server/session-next`.

## Rutas (solo usan `@/features/container`, `@/shared/server/http` y el contrato)

`app/api/accounts/route.ts`, `export async function POST(request: Request): Promise<Response>`:

1. `assertSameOrigin(request)`.
2. Leer el JSON. Si el cuerpo no es JSON válido → 400 `VALIDATION` «Revisa los datos enviados.» (sin `fields`), sin llamar al servicio.
3. `RegisterAccountInputSchema.parse(...)` (`ZodError` → 400 con `fields`), después `getAccountService().register(input)` y una respuesta **201** con `{ email }`.
4. Cualquier error → `toErrorResponse(error)`.

`app/api/session/route.ts`:

- `POST`: lo mismo con `CreateSessionInputSchema` → `getAccountService().startSession(input)` → **204** sin cuerpo.
- `DELETE`: `assertSameOrigin` → `getAccountService().endSession()` → **204** sin cuerpo. No lee el cuerpo.

## Interfaz de usuario pura: `app/features/accounts/ui/login-error-message.ts`

```ts
export const LOGIN_INVALID_MESSAGE = "Correo o contraseña incorrectos.";
export const LOGIN_TOO_MANY_MESSAGE = "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
export const LOGIN_FAILED_MESSAGE = "No pudimos iniciar sesión. Intenta de nuevo.";
export function loginErrorMessage(code: string): string;
```

- `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-email`, `auth/user-disabled` → `LOGIN_INVALID_MESSAGE`.
- `auth/too-many-requests` → `LOGIN_TOO_MANY_MESSAGE`.
- Cualquier otro código (incluido `""`) → `LOGIN_FAILED_MESSAGE`.
