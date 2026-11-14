# F0 · Base del proyecto (versión mínima)

- **Estado:** Aprobada
- **Rol(es):** Sistema (lo usan todas las demás features; no tiene pantallas)
- **Contrato afectado:** `app/shared/schema.ts` (forma del error en el cable)

## Objetivo

Las rutas y servicios de cualquier feature pueden lanzar errores de dominio que llegan al navegador como HTTP coherente, leer la sesión verificada de la persona y usar Firebase (emulador en desarrollo) con un entorno validado, todo probado sin red.

## Reglas de negocio

### Errores de dominio y HTTP

1. Existen exactamente cinco errores de dominio en `app/shared/server/`. Cada uno tiene un `code` y un estado HTTP fijos:

   | Clase                  | `code`            | HTTP |
   | ---------------------- | ----------------- | ---- |
   | `ValidationError`      | `VALIDATION`      | 400  |
   | `UnauthenticatedError` | `UNAUTHENTICATED` | 401  |
   | `ForbiddenError`       | `FORBIDDEN`       | 403  |
   | `NotFoundError`        | `NOT_FOUND`       | 404  |
   | `ConflictError`        | `CONFLICT`        | 409  |

   Cualquier otro error (incluido uno que no sea `Error`) se traduce a 500 con `code` `INTERNAL`.

2. El cuerpo de toda respuesta de error es JSON con la forma `{ "error": { "code": string, "message": string, "fields"?: { [campo]: string } } }`, definida con Zod en `app/shared/schema.ts`.
   - `message` va en español y se le puede mostrar a la persona.
   - `fields` aparece **solo** en los 400 y mapea cada campo inválido a su mensaje en español.
3. Un 500 siempre responde `{ "error": { "code": "INTERNAL", "message": "Ocurrió un error inesperado. Intenta de nuevo." } }`. Nunca incluye el stack, el mensaje original ni ningún detalle interno.
4. Un `ZodError` que llegue al traductor se convierte en un 400 `VALIDATION` con `fields` (ruta del campo unida con `.` → primer mensaje de ese campo).
5. En un `catch` que envuelve APIs de Next, el traductor llama primero a `unstable_rethrow(error)` (Cache Components).

### Validación del origen

6. En peticiones `POST`, `PUT`, `PATCH` y `DELETE`, si el header `Origin` falta o su origen (esquema, host y puerto) no es igual al origen de la petición, la respuesta es 403 `FORBIDDEN` y no se ejecuta el servicio.
7. `GET`, `HEAD` y `OPTIONS` no se revisan.

### Sesión (cookie de Firebase)

8. F0 entrega solo funciones del servidor: `createSession(idToken)`, `getSession()`, `requireSession()` y `clearSession()`. No crea rutas ni pantallas (eso es F2).
9. `createSession(idToken)`:
   - verifica el ID token con Firebase Admin;
   - exige que el token se haya emitido (`auth_time`) hace **5 minutos o menos**; si no, lanza `UnauthenticatedError`;
   - crea la cookie de sesión de Firebase con duración de **5 días** y la guarda en la cookie `session`.
10. La cookie `session` lleva `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=432000` (5 días) y `Secure` solo cuando `NODE_ENV` es `production`.
11. `getSession()` devuelve `{ uid, email }` si la cookie existe y `verifySessionCookie(cookie, checkRevoked = true)` la acepta. Si falta, es inválida, venció o fue revocada, o el usuario está deshabilitado, devuelve `null`. Nunca lanza por una cookie mala. Cualquier otro error (entorno inválido, red, caída de Firebase) **no** se convierte en `null`: se propaga y termina en 500 `INTERNAL`. Lo mismo en `createSession`: solo un token rechazado por Firebase Auth se vuelve `UnauthenticatedError`.
12. `requireSession()` devuelve lo mismo que `getSession()`; si no hay sesión, lanza `UnauthenticatedError` (→ 401).
13. `clearSession()` borra la cookie `session` (`Max-Age=0`).
14. El `uid` de la persona sale **solo** de la sesión verificada, nunca del cuerpo, la URL ni los headers que mande el navegador.

### Variables de entorno

15. Variables del servidor: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`.
16. Variables del navegador: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS`.
17. **Modo:** es _emulador_ si `FIREBASE_AUTH_EMULATOR_HOST` está definida y no está vacía; si no, es _producción_.
18. En modo emulador son obligatorias:
    - `FIREBASE_PROJECT_ID`, que debe empezar con `demo-`;
    - `FIRESTORE_EMULATOR_HOST`;
    - `NEXT_PUBLIC_FIREBASE_API_KEY` (cualquier texto no vacío);
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, igual a `FIREBASE_PROJECT_ID`;
    - `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` igual a `"true"`.

    `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` y `NEXT_PUBLIC_FIREBASE_APP_ID` quedan como «no aplica».

    Si la variable `VERCEL` está definida y no vacía, el modo emulador es un error de coherencia: en Vercel nunca se usa el emulador (con él, Firebase Admin acepta tokens sin firma).

19. En modo producción son obligatorias:
    - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`;
    - las cuatro `NEXT_PUBLIC_FIREBASE_*`, con `NEXT_PUBLIC_FIREBASE_PROJECT_ID` igual a `FIREBASE_PROJECT_ID`;
    - `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` sin definir o igual a `"false"`.

    `FIRESTORE_EMULATOR_HOST` debe estar sin definir.

20. `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` solo acepta `"true"` o `"false"`; sin definir equivale a `"false"`. Cualquier otro valor es «inválida».
21. Si el modo es producción y `NODE_ENV` no es `production`, la validación falla con el mensaje «En desarrollo solo se usa el emulador de Firebase». Así nunca se usan claves reales fuera de producción.
22. `FIREBASE_PRIVATE_KEY` se normaliza antes de usarla: se quitan las comillas envolventes y los `\n` literales se cambian por saltos de línea (ADR-0007).
23. La app valida el entorno **al primer uso de Firebase** (cuando se crea el cliente por primera vez), no al arrancar ni al compilar. Si es inválido, lanza un error que nombra las variables con problema y su estado, **nunca sus valores**.

### `npm run check:env`

24. El comando corre `tsx --env-file-if-exists=.env.local --conditions=react-server scripts/check-env.ts`. tsx no lee `.env.local` por sí solo, así que el flag de Node lo carga antes de validar; si el archivo no existe, se valida solo con las variables del entorno (por ejemplo, en Vercel).
25. La salida tiene una primera línea `Modo: emulador` o `Modo: producción`. Luego viene una línea por variable de las reglas 15 y 16 con la forma `NOMBRE: <estado>`, donde el estado es `ok`, `falta`, `inválida` o `no aplica`. Al final se agregan los errores de coherencia (reglas 18, 19 y 21), si los hay.
26. La salida nunca contiene el valor de una variable ni un fragmento de él.
27. Termina con código 0 si ninguna variable obligatoria está en `falta` o `inválida` y no hay errores de coherencia; si no, con código 1.

### Clientes de Firebase

28. Servidor: `getAdminAuth()` y `getFirestore()` en `app/shared/server/` (con `import "server-only"`) devuelven una única instancia de `firebase-admin`.
    - En modo emulador se inicializan solo con `projectId`; el SDK toma los hosts de `FIREBASE_AUTH_EMULATOR_HOST` y `FIRESTORE_EMULATOR_HOST`.
    - En modo producción usan las credenciales de la regla 19.
29. Navegador: `getClientAuth()` en `app/shared/` devuelve el `Auth` del SDK `firebase` (solo Authentication). Si `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` es `"true"`, llama a `connectAuthEmulator` con `http://127.0.0.1:9099` (puerto de `firebase.json`) una sola vez. F0 no lo usa en ninguna pantalla.

### Pruebas sin red

30. La sesión recibe por inyección un puerto `SessionVerifier` (`verifyIdToken`, `createSessionCookie`, `verifySessionCookie`) y un puerto `CookieJar` (`get`, `set`, `delete`). Las pruebas usan dobles en memoria de ambos.
31. La validación del entorno es una función pura que recibe el objeto de variables (no lee `process.env` directamente), para probarla con objetos de prueba.
32. Un setup de Vitest reemplaza `fetch`, `net.connect`, `net.createConnection`, `net.Socket.prototype.connect` y `tls.connect` para que lancen «Red prohibida en pruebas» (así quedan cubiertos también `http`, `https` y `http2`). `npm test` no levanta el emulador ni abre sockets.
33. La cobertura de `app/shared/server/**` es ≥ 80 % (ya la exige `vitest.config.mts`).

## Entradas y salidas

| Entrada                  | Tipo / restricción                                                         |
| ------------------------ | -------------------------------------------------------------------------- |
| `createSession(idToken)` | `idToken`: texto no vacío; token válido emitido hace ≤ 5 min               |
| cookie `session`         | texto; la verifica Firebase Admin                                          |
| header `Origin`          | URL; su host debe ser igual al host de la petición (POST/PUT/PATCH/DELETE) |
| variables de entorno     | ver reglas 15–21                                                           |

Salida exitosa:

- `getSession()` / `requireSession()` → `{ uid: string, email: string | null }`.
- `check:env` → informe por variable y código 0.

Errores esperados:

- `ValidationError` → datos inválidos (400, con `fields`).
- `UnauthenticatedError` → `requireSession()` sin sesión válida; `createSession` con token inválido o emitido hace más de 5 min (401).
- `ForbiddenError` → `Origin` ausente o distinto en un método que cambia datos (403).
- `NotFoundError` / `ConflictError` → los lanzan las features (404 / 409).
- Error de entorno → al primer uso de Firebase, con los nombres de las variables y su estado.
- Cualquier otro → 500 `INTERNAL` genérico.

## Autorización

- F0 no decide quién puede qué: da `requireSession()` para que cada feature lo exija.
- Sin sesión: `getSession()` devuelve `null`; `requireSession()` responde 401.
- Nadie puede elegir su `uid`: solo sale de la cookie verificada (regla 14).

## Criterios de aceptación

- **Dado** un servicio que lanza `NotFoundError("No existe el deseo")` **cuando** la ruta traduce el error **entonces** responde 404 con `{ error: { code: "NOT_FOUND", message: "No existe el deseo" } }`.
- **Dado** cada una de las cinco clases **cuando** se traduce **entonces** el estado y el `code` son los de la tabla de la regla 1.
- **Dado** un `ZodError` en el campo `price` **cuando** se traduce **entonces** responde 400 con `code: "VALIDATION"` y `fields.price` con un mensaje.
- **Dado** un `Error("conexión a db falló")` **cuando** se traduce **entonces** responde 500 con el mensaje genérico y el cuerpo no contiene «conexión a db falló».
- **Dado** un valor lanzado que no es `Error` (por ejemplo, un texto) **cuando** se traduce **entonces** responde 500 `INTERNAL`.
- **Dado** un `POST` sin header `Origin` **cuando** pasa por la validación de origen **entonces** responde 403 `FORBIDDEN`.
- **Dado** un `POST` con `Origin: https://otro.com` y host `app.com` **cuando** se valida **entonces** responde 403.
- **Dado** un `POST` con `Origin` del mismo host **cuando** se valida **entonces** continúa.
- **Dado** un `GET` sin `Origin` **cuando** se valida **entonces** continúa.
- **Dado** un ID token válido emitido hace 1 minuto **cuando** se llama `createSession` **entonces** se guarda la cookie `session` con `HttpOnly`, `SameSite=Lax`, `Path=/` y `Max-Age=432000`.
- **Dado** `NODE_ENV=production` **cuando** se crea la sesión **entonces** la cookie lleva `Secure`; **dado** `NODE_ENV=development` **entonces** no lo lleva.
- **Dado** un ID token emitido hace 6 minutos **cuando** se llama `createSession` **entonces** lanza `UnauthenticatedError` y no se guarda la cookie.
- **Dado** un ID token que el verificador rechaza **cuando** se llama `createSession` **entonces** lanza `UnauthenticatedError`.
- **Dado** una cookie válida **cuando** se llama `getSession()` **entonces** devuelve `{ uid, email }`, y el verificador recibió `checkRevoked = true`.
- **Dado** una cookie revocada, vencida o alterada **cuando** se llama `getSession()` **entonces** devuelve `null`.
- **Dado** un verificador que falla por algo que no es la cookie (por ejemplo, entorno inválido o red) **cuando** se llama `getSession()` **entonces** el error se propaga (no devuelve `null`).
- **Dado** un ID token sin `auth_time` válido **cuando** se llama `createSession` **entonces** lanza `UnauthenticatedError` y no se guarda la cookie.
- **Dado** un `POST` con `Origin: http://app.com` y petición a `https://app.com` **cuando** se valida **entonces** responde 403.
- **Dado** el modo emulador con `VERCEL=1` **cuando** se valida **entonces** hay un error de coherencia.
- **Dado** el modo producción con `NEXT_PUBLIC_FIREBASE_PROJECT_ID` distinto de `FIREBASE_PROJECT_ID` **cuando** se valida **entonces** hay un error de coherencia.
- **Dado** el entorno de pruebas **cuando** una prueba llama a `net.connect`, `new net.Socket().connect`, `tls.connect` o `https.get` **entonces** lanza «Red prohibida en pruebas».
- **Dado** que no hay cookie **cuando** se llama `requireSession()` **entonces** lanza `UnauthenticatedError`.
- **Dado** una sesión **cuando** se llama `clearSession()` **entonces** la cookie `session` se borra.
- **Dado** el modo emulador con todas sus variables correctas **cuando** se valida **entonces** el resultado es válido y `FIREBASE_PRIVATE_KEY` figura como «no aplica».
- **Dado** el modo emulador con `FIREBASE_PROJECT_ID=lista-real` **cuando** se valida **entonces** `FIREBASE_PROJECT_ID` es «inválida».
- **Dado** el modo emulador con `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` sin definir **cuando** se valida **entonces** hay un error de coherencia.
- **Dado** el modo emulador con `NEXT_PUBLIC_FIREBASE_PROJECT_ID` distinto de `FIREBASE_PROJECT_ID` **cuando** se valida **entonces** hay un error de coherencia.
- **Dado** el modo producción con `NODE_ENV=development` **cuando** se valida **entonces** falla con «En desarrollo solo se usa el emulador de Firebase».
- **Dado** el modo producción sin `FIREBASE_PRIVATE_KEY` y `NODE_ENV=production` **cuando** se valida **entonces** `FIREBASE_PRIVATE_KEY: falta`.
- **Dado** el modo producción con `FIRESTORE_EMULATOR_HOST` definida **cuando** se valida **entonces** hay un error de coherencia.
- **Dado** `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=yes` **cuando** se valida **entonces** es «inválida».
- **Dado** `FIREBASE_PRIVATE_KEY` entre comillas y con `\n` literales **cuando** se normaliza **entonces** queda sin comillas y con saltos de línea reales.
- **Dado** un entorno inválido **cuando** se corre `check:env` **entonces** la salida tiene una línea por variable, termina con código 1 y no contiene ningún valor de variable.
- **Dado** un entorno válido **cuando** se corre `check:env` **entonces** termina con código 0.
- **Dado** el entorno de pruebas **cuando** una prueba llama a `fetch` **entonces** lanza «Red prohibida en pruebas».

## Bordes

- Token emitido hace exactamente 5 min → se acepta. Hace 5 min + 1 s → `UnauthenticatedError`.
- `idToken` vacío → `UnauthenticatedError`, sin llamar al verificador.
- Cookie `session` vacía → `getSession()` devuelve `null`.
- `fields` con 1 campo y con varios; error de validación sin campos (raíz) → clave `_`.
- `FIREBASE_AUTH_EMULATOR_HOST` definida pero vacía → modo producción.
- `FIREBASE_PROJECT_ID` igual a `demo-` (solo el prefijo) → «inválida» (falta el nombre).
- Todas las variables vacías → modo producción con todas las obligatorias en «falta».
- `Origin` con otro puerto (`localhost:3001` vs `localhost:3000`) → 403.

## Fuera de alcance

- El `seed` (datos de ejemplo).
- Las rutas `/api/session` y las pantallas de ingreso y cierre de sesión (F2).
- Las pruebas contra el emulador (`test:emulator`).
- Reescribir las puertas de calidad (`npm run check` ya existe).
- Límites de peticiones y registros (logs) de errores.

## Preguntas abiertas

Todas respondidas por la persona el 2026-11-13:

1. Catálogo de errores → 5 clases (400, 401, 403, 404, 409) y 500 para todo lo demás.
2. Cuerpo del error → `{ error: { code, message, fields? } }`, con `fields` solo en 400.
3. Error inesperado → mensaje genérico, sin detalles ni id.
4. Validación de origen → sí, chequeo de `Origin` en los métodos que cambian datos (403).
5. Duración de la sesión → 5 días.
6. Cookie → `session`, HttpOnly, SameSite=Lax, Path=/, Secure en producción.
7. Revocación → sí, `checkRevoked = true` siempre.
8. Alcance de la sesión → F0 solo funciones; rutas en F2; token de ≤ 5 min.
9. Nombres de variables → los de las reglas 15 y 16 (dados por la persona según `env.example`).
10. Modo → por `FIREBASE_AUTH_EMULATOR_HOST`; proyecto `demo-`; fuera de producción solo emulador.
11. `check:env` → una línea por variable con estado, código 1 si falla.
12. Momento de validación → al primer uso de Firebase.
13. `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` → solo `"true"` o `"false"`; host fijo `127.0.0.1:9099`.
14. Coherencia servidor/navegador → sí, si no coinciden es error.
15. Variables del navegador en modo emulador → `API_KEY` y `PROJECT_ID`; `AUTH_DOMAIN` y `APP_ID` quedan como «no aplica».
16. Pruebas → puertos con dobles en memoria; red bloqueada en Vitest; sin emulador en `npm test`.
17. Cliente del navegador → F0 lo inicializa (solo Auth), sin pantallas.

Cambios tras la revisión de `security`, decididos por la persona el 2026-11-13:

18. Sesión → solo una cookie o token rechazado por Firebase Auth da `null`/401; los demás errores se propagan (regla 11).
19. Origen → se compara el origen completo (esquema, host y puerto), no solo el host (regla 6).
20. Emulador en Vercel → error de coherencia si `VERCEL` está definida (regla 18).
21. Proyecto en producción → `NEXT_PUBLIC_FIREBASE_PROJECT_ID` igual a `FIREBASE_PROJECT_ID` también en producción (regla 19).

Decisiones que tomé yo (sin preguntar) y que debes revisar: la regla 4 (`ZodError` → 400), el `code` en mayúsculas de cada clase, la clave `_` para errores sin campo, `email: string | null` en la sesión y que `FIRESTORE_EMULATOR_HOST` sea un error en producción.
