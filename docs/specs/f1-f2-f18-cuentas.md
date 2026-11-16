# F1 + F2 + F18 · Cuentas: registrarse, ingresar, cerrar sesión y pantallas base

- **Estado:** Aprobada
- **Rol(es):** Público (registrarse, ingresar), Usuario (cerrar sesión), Todos (barra e inicio)
- **Contrato afectado:** `app/features/accounts/schema.ts` (nuevo). `app/shared/schema.ts` no cambia.

## Objetivo

Una persona del público crea su cuenta con correo y contraseña y queda dentro. Después puede ingresar y cerrar sesión, y la barra y el inicio muestran si tiene sesión.

## Reglas de negocio

### F1 · Registrarse

1. La cuenta la crea el **servidor**: `POST /api/accounts` → servicio de `accounts` → Firebase Admin `createUser({ email, password })`. El navegador nunca crea cuentas con el SDK cliente.
2. Entrada: `{ email, password, password_confirmation }`, validada con Zod en la ruta y en el servicio.
3. Correo: se recortan los espacios de los extremos, se pasa a minúsculas, debe tener formato de correo (`z.email()`) y medir como máximo 254 caracteres **después** de normalizar.
4. Contraseña: de 8 a 128 caracteres (`string.length`), cualquier carácter y sin reglas de composición. **No** se recortan los espacios.
5. `password_confirmation` debe ser exactamente igual a `password`. Si no lo es → 400 con `fields.password_confirmation`.
6. Si el correo ya tiene cuenta (Firebase `auth/email-already-exists`) → `ConflictError` 409 «Ya existe una cuenta con ese correo.»
7. Si sale bien → 201 `{ email }` (el correo ya normalizado). La respuesta nunca incluye la contraseña, y la contraseña no se guarda fuera de Firebase Auth.
8. No se guarda perfil en Firestore ni se verifica el correo.
9. Después del 201, el navegador ingresa solo (mismo flujo de la regla 12) y va a `/`. Si ese ingreso automático falla, va a `/ingresar?cuenta=creada`, que muestra el aviso «Tu cuenta se creó. Ingresa con tu correo y contraseña.» (texto fijo; el parámetro solo enciende el aviso).
10. Cualquier otro error de Firebase al crear la cuenta → 500 genérico (F0, regla 3).

### F2 · Ingresar

11. El servidor nunca recibe la contraseña al ingresar. La verifica Firebase Auth en el navegador.
12. Flujo: el navegador llama a `signInWithEmailAndPassword` (con persistencia en memoria), obtiene el `id_token` y hace `POST /api/session` con `{ id_token }`. Con un 204, cierra la sesión del SDK cliente (`signOut`) y navega a `/`. Desde ahí la sesión vive solo en la cookie `session` de F0.
13. `POST /api/session`: `id_token` debe ser texto de 1 a 4096 caracteres; si no → 400 `VALIDATION`, **sin llamar a Firebase** (pendiente B1 de F0). Después llama a `createSession` de F0: el token debe tener ≤ 5 min, y la cookie dura 5 días. Si ya había una cookie, se reemplaza.
14. Errores de ingreso que ve la persona (los traduce una función pura en `accounts/ui`):
    - `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-email`, `auth/user-disabled` → «Correo o contraseña incorrectos.»
    - `auth/too-many-requests` → «Demasiados intentos. Espera unos minutos e intenta de nuevo.»
    - Cualquier otro código, un error de red o una respuesta que no sea 204 de `/api/session` → «No pudimos iniciar sesión. Intenta de nuevo.»
15. El formulario de ingreso solo exige que correo y contraseña no estén vacíos («Escribe tu correo.», «Escribe tu contraseña.»). No aplica las reglas 3 y 4.

### F2 · Cerrar sesión

16. `DELETE /api/session` siempre responde **204** (idempotente):
    - si `getSession()` da una sesión → `revokeRefreshTokens(uid)` y después `clearSession()`;
    - si da `null` (cookie ausente, vencida o revocada) → solo `clearSession()`, sin revocar.
17. Revocar cierra también las sesiones de la persona en sus otros dispositivos, porque `checkRevoked` está siempre activo (F0).
18. Si la revocación falla → 500 genérico y **la cookie no se borra**. La interfaz muestra «No pudimos cerrar la sesión. Intenta de nuevo.»
19. Con el 204, el navegador va a `/` y refresca, y la barra muestra el estado «sin sesión».

### Pendiente R2 de F0

20. Ninguna página, componente ni ruta borra la cookie porque `getSession()` haya devuelto `null`. Solo la borra `DELETE /api/session` (regla 16). Con `null`, la interfaz se muestra sin sesión.

### F18 · Barra, pantallas y redirecciones

21. Páginas: `/` (inicio), `/registro` (crear cuenta) e `/ingresar` (ingresar). Rutas API en inglés: `/api/accounts` y `/api/session`.
22. Barra (`<header>` + `<nav aria-label="Principal">`) en todas las páginas:
    - siempre: enlace «Lista de deseos» → `/`;
    - sin sesión: enlaces «Ingresar» → `/ingresar` y «Registrarse» → `/registro`;
    - con sesión: el correo de la persona y el botón «Cerrar sesión».
23. En pantallas menores que `md` (768 px), los elementos de la barra (menos la marca) van dentro de un menú plegable hecho con `<details>`/`<summary>` («Menú»), que funciona sin JavaScript y con teclado. Desde `md:` se muestran en línea.
24. Inicio sin sesión: la portada actual más los enlaces «Crear cuenta» → `/registro` e «Ingresar» → `/ingresar`. Inicio con sesión: «Hola, <correo>» y «Pronto podrás agregar tus deseos aquí.» (hasta F19).
25. Pie de página en todas las páginas: «Lista de deseos · Proyecto final de semestre».
26. Con sesión, abrir `/registro` o `/ingresar` redirige a `/`. No existe un parámetro `?next`: después de ingresar o registrarse siempre se va a `/`.
27. Títulos (`<title>`): «Crear cuenta · Lista de deseos», «Ingresar · Lista de deseos», «Lista de deseos» en el inicio.
28. Formularios: `<label>` visible en cada campo; `autocomplete` `email`, `new-password` (registro) y `current-password` (ingreso); errores por campo con `role="alert"` y `aria-describedby`; error general arriba del botón. Mientras se envía, el botón queda deshabilitado y dice «Creando cuenta…» o «Ingresando…».
29. Las lecturas de sesión (`cookies()`) van dentro de `<Suspense>` (Cache Components). Si `getSession()` lanza un error que no es de credencial, se muestra `app/error.tsx` con «Ocurrió un error inesperado. Intenta de nuevo.» y un botón «Reintentar».
30. Se cumple `docs/frontend-rules.md` completo: paleta, contraste, foco, objetivos de 44 px y revisión a 360, 768 y 1024 px.

## Entradas y salidas

| Entrada                                      | Tipo / restricción                                               |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `POST /api/accounts` `email`                 | texto; recortado y en minúsculas; formato de correo; 1–254       |
| `POST /api/accounts` `password`              | texto; 8–128 caracteres; sin recortar                            |
| `POST /api/accounts` `password_confirmation` | texto; igual a `password`                                        |
| `POST /api/session` `id_token`               | texto; 1–4096 caracteres; token de Firebase emitido hace ≤ 5 min |
| `DELETE /api/session`                        | sin cuerpo; usa la cookie `session` si existe                    |
| Todas las anteriores                         | `Origin` igual al de la petición (F0, regla 6) → si no, 403      |

Salidas exitosas: `POST /api/accounts` → 201 `{ email }`; `POST /api/session` → 204 + cookie; `DELETE /api/session` → 204 + cookie borrada.

Errores esperados:

- `ValidationError`/`ZodError` → 400 `VALIDATION` con `fields` (`email`, `password`, `password_confirmation`, `id_token`).
- `UnauthenticatedError` → 401: `id_token` rechazado por Firebase o con más de 5 min.
- `ForbiddenError` → 403: `Origin` ausente o distinto.
- `ConflictError` → 409: correo ya registrado.
- Otro error → 500 genérico (incluye una revocación fallida al cerrar sesión).

Mensajes de campo (registro): «Escribe tu correo.» (vacío), «Escribe un correo válido.» (formato), «El correo puede tener hasta 254 caracteres.», «La contraseña debe tener al menos 8 caracteres.», «La contraseña puede tener hasta 128 caracteres.», «Las contraseñas no coinciden.»

## Autorización

- `POST /api/accounts` y `POST /api/session`: públicos (no exigen sesión); exigen `Origin` correcto.
- `DELETE /api/session`: cualquiera; solo revoca el `uid` que sale de la cookie verificada, nunca uno enviado por el navegador (F0, regla 14).
- Nadie puede crear una cuenta a nombre de otra ni elegir su `uid`: el `uid` lo asigna Firebase.

## Criterios de aceptación

- **Dado** `{ email: "  Ana@X.com ", password: "12345678", password_confirmation: "12345678" }` **cuando** se registra **entonces** se crea el usuario `ana@x.com` y la respuesta es 201 `{ email: "ana@x.com" }`.
- **Dado** `password` de 7 caracteres **cuando** se registra **entonces** 400 con `fields.password`; con 8 → 201; con 128 → 201; con 129 → 400.
- **Dado** `password` `" 1234567"` (8 con el espacio) **cuando** se registra **entonces** se acepta tal cual, sin recortar.
- **Dado** un correo de 254 caracteres **cuando** se registra **entonces** 201; con 255 → 400 con `fields.email`.
- **Dado** un correo vacío o `"   "` **cuando** se registra **entonces** 400 «Escribe tu correo.»; con `"ana@"` → 400 «Escribe un correo válido.»
- **Dado** `password_confirmation` distinto **cuando** se registra **entonces** 400 con `fields.password_confirmation` «Las contraseñas no coinciden.», y no se llama a Firebase.
- **Dado** un correo ya registrado (Firebase lanza `auth/email-already-exists`) **cuando** se registra **entonces** 409 «Ya existe una cuenta con ese correo.»
- **Dado** que Firebase lanza otro error al crear **cuando** se registra **entonces** 500 genérico, sin detalles.
- **Dado** cualquier registro **cuando** se responde **entonces** ni la respuesta ni el error contienen la contraseña.
- **Dado** un `id_token` de 4096 caracteres **cuando** se hace `POST /api/session` **entonces** llega a `createSession`; con 4097 o vacío → 400, sin llamar a Firebase.
- **Dado** un `id_token` válido de hace 1 min **cuando** se hace `POST /api/session` **entonces** 204 y la cookie `session` queda puesta.
- **Dado** un `id_token` rechazado o de hace 6 min **cuando** se hace `POST /api/session` **entonces** 401 y no se pone la cookie.
- **Dado** un `POST /api/accounts` o un `POST`/`DELETE /api/session` sin `Origin` **cuando** llega **entonces** 403 y no se llama al servicio.
- **Dado** una sesión válida **cuando** se hace `DELETE /api/session` **entonces** se revoca **ese** `uid`, se borra la cookie y la respuesta es 204.
- **Dado** que no hay cookie, o es inválida, **cuando** se hace `DELETE /api/session` **entonces** 204, se borra la cookie y no se revoca nada.
- **Dado** que la revocación falla **cuando** se hace `DELETE /api/session` **entonces** 500 y la cookie no se borra.
- **Dado** una cookie inválida **cuando** se carga cualquier página **entonces** la barra muestra «Ingresar» y «Registrarse» y la cookie **no** se borra (R2).
- **Dado** una sesión **cuando** se abre `/registro` o `/ingresar` **entonces** se redirige a `/`.
- **Dado** una sesión **cuando** se carga el inicio **entonces** la barra muestra el correo y «Cerrar sesión», y el inicio muestra «Hola, <correo>».
- **Dado** cada código de la regla 14 **cuando** se traduce **entonces** la función de mensajes devuelve el texto indicado; un código desconocido devuelve «No pudimos iniciar sesión. Intenta de nuevo.»
- **Dado** un ancho de 360 px **cuando** se carga una página **entonces** la barra muestra «Menú» (`<summary>`) y al abrirlo aparecen los enlaces; **dado** 768 px **entonces** los enlaces se ven en línea y no hay «Menú».

## Bordes

- Contraseña de 7, 8, 128 y 129 caracteres.
- Correo de 254 y 255 caracteres, vacío, solo espacios o con mayúsculas.
- `id_token` vacío, de 1, 4096 y 4097 caracteres.
- `DELETE /api/session` dos veces seguidas → 204 las dos.
- Mismo correo registrado dos veces → la segunda da 409.
- Cookie presente pero inválida → sin sesión y sin borrarla.

## Fuera de alcance

Verificación de correo, recuperar o cambiar la contraseña (F3), perfil en Firestore, nombre visible, límites de peticiones al registrarse (riesgo aceptado, ver decisión 17), `?next`, mostrar u ocultar la contraseña, «cerrar sesión solo en este dispositivo», pantalla «Mi lista» (F19) y pruebas contra el emulador.

## Diseño técnico sugerido (lo detalla la interfaz del orquestador)

- `app/features/accounts/schema.ts`: `RegisterAccountInputSchema`, `RegisterAccountOutputSchema`, `CreateSessionInputSchema`.
- `app/features/accounts/server/account-service.ts`: `createAccountService({ auth })` con `register(input)` y `signOut(session | null)`. Puerto `AccountAuthPort { createUser, revokeSessions }` en `server/auth-port.ts`, con un adaptador de Firebase Admin (traduce `auth/email-already-exists` → `ConflictError`) y un doble en memoria para las pruebas.
- `app/features/container.ts` (nuevo): conecta el servicio con `getAdminAuth()` (`app/shared/server/firebase-admin.ts`).
- Rutas: `app/api/accounts/route.ts` y `app/api/session/route.ts`. Usan `assertSameOrigin`, `toErrorResponse` (`app/shared/server/http.ts`) y `createSession`/`getSession`/`clearSession` (`app/shared/server/session-next.ts`).
- UI: `app/features/accounts/ui/` (formularios, barra, función de mensajes de ingreso) y `getClientAuth()` (`app/shared/firebase-client.ts`). Páginas: `app/registro/page.tsx`, `app/ingresar/page.tsx`, `app/page.tsx`, `app/layout.tsx` y `app/error.tsx`.
- Antes de programar, leer `node_modules/next/dist/docs/` (rutas, `redirect`, Suspense y Cache Components).

## Preguntas abiertas

Todas respondidas por la persona el 2026-11-14:

1. ¿Quién crea la cuenta? → El servidor (Admin `createUser`).
2. ¿Qué campos tiene el registro? → Correo, contraseña y confirmación. Sin nombre.
3. ¿Qué reglas tiene la contraseña? → De 8 a 128 caracteres, sin reglas de composición.
4. ¿Qué pasa con un correo ya registrado? → 409 con el mensaje claro.
5. ¿Se ingresa solo después de registrarse? → Sí; si falla, va a `/ingresar` con un aviso.
6. ¿Cómo se trata el correo? → Se recorta, va en minúsculas y mide como máximo 254.
7. ¿Se verifica el correo? → No.
8. ¿Se guarda un perfil en Firestore? → No; solo se usa Firebase Auth.
9. ¿Qué error se muestra al fallar el ingreso? → Uno genérico, más el de demasiados intentos.
10. ¿Qué hace cerrar sesión? → Borra la cookie y revoca los tokens.
11. ¿Cómo se cierran B1 y R2 de F0? → `id_token` de 1 a 4096; nadie borra la cookie con `null`.
12. ¿A dónde se va después de ingresar? → A `/`; con sesión, `/registro` e `/ingresar` redirigen a `/`; no hay `?next`.
13. ¿Qué URLs se usan? → `/registro` e `/ingresar`.
14. ¿Cómo es la barra? → Plegable con `<details>`/`<summary>` por debajo de `md`, y en línea desde `md:` (requisito del profe: menú plegable a 360 px).
15. ¿Qué muestra el inicio? → Cambia según la sesión, y todas las páginas tienen pie de página.
16. ¿Qué pasa al cerrar sesión sin una sesión válida? → 204 y se borra la cookie, sin revocar.

Cambio tras la revisión de `security`, decidido por la persona el 2026-11-14:

17. Límite del registro → `POST /api/accounts` no tiene límite de peticiones. Firebase Admin `createUser` no aplica el límite por IP del registro desde el navegador, así que un script puede crear cuentas sin freno y usar el 409 para averiguar qué correos existen. Se acepta como riesgo conocido y se resuelve en una tarea aparte, con su propia spec, **antes de publicar en producción**. Un límite en memoria no sirve en Vercel; las opciones son un contador en Firestore o App Check.

Decisiones que tomé yo (sin preguntar) y que debes revisar antes de aprobar:

- Los textos exactos de los errores de campo, de ingreso y de cierre de sesión, del aviso `?cuenta=creada`, del pie de página, del saludo y de los títulos.
- La respuesta 201 `{ email }`, y que `POST /api/session` y `DELETE /api/session` respondan 204 sin cuerpo.
- Si la revocación falla → 500 y la cookie se queda, para poder reintentar.
- `POST /api/accounts` no revisa si ya hay una sesión: es público.
- El ingreso solo exige campos no vacíos y no aplica las reglas de largo.
- El nombre del campo es `password_confirmation`, y el archivo de la spec se llama `f1-f2-f18-cuentas.md`.
- Hay un `app/error.tsx` para los 500 de páginas.
