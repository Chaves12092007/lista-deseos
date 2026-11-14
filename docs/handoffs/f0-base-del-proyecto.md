## Entrega: orquestador · F0 Base del proyecto (versión mínima)

**Estado:** Aprobado con observaciones (`security`, tercera revisión, 2026-11-14). Solo hay hallazgos de severidad Baja; por decisión de la persona quedan anotados abajo, sin otra ronda.

**Revisiones de `security`:**

1. Aprobado, con 12 observaciones Baja/Info. La persona decidió cambios en la spec (decisiones 18–21) y se corrigieron #1, #2, #4, #5, #7, #8, #9 y #10.
2. Cambios requeridos por R1 (Media): una cookie malformada hacía que el SDK lanzara `SyntaxError`/`TypeError` y daba 500. Se corrigió con `hasJwtShape` en `admin-verifier.ts`, con prueba de regresión contra el SDK real sin red.
3. Aprobado con observaciones: R1 corregido. Se probaron 2290 tokens con forma de JWT válida contra el SDK real, en modo emulador y producción, y ninguno produjo un error que no fuera de Firebase.

**Hecho:**

- Contrato del error en el cable: `app/shared/schema.ts` (`ErrorBodySchema`, `ErrorCodeSchema`, `ErrorFieldsSchema`).
- Errores de dominio y traducción a HTTP, con `unstable_rethrow` primero y 500 genérico sin detalles (reglas 1–5).
- Validación de `Origin` por origen completo (esquema, host y puerto) en `POST`/`PUT`/`PATCH`/`DELETE` (reglas 6–7).
- Sesión con cookie de Firebase: `createSession`, `getSession`, `requireSession` y `clearSession`. Token de ≤ 5 min (falla cerrada si `auth_time` no es finito), `checkRevoked` siempre, cookie `HttpOnly`/`Lax`/`Path=/`/5 días/`Secure` en producción. Solo una credencial rechazada da `null`/401; los demás errores se propagan a 500 (reglas 8–14).
- Rechazo previo de textos sin forma de JWT, para que una cookie malformada dé `null` y no 500 (hallazgo R1).
- Validación pura del entorno, `readValidEnv` al primer uso de Firebase y `npm run check:env` sin valores en la salida (reglas 15–27). El modo emulador se rechaza en Vercel, y el `PROJECT_ID` del navegador se exige igual al del servidor en los dos modos.
- Clientes de Firebase: Admin (`server-only`, una sola app, perezoso) y navegador (solo Auth, emulador en `127.0.0.1:9099`) (reglas 28–29).
- Pruebas sin red: `fetch`, `net` (`connect`, `createConnection`, `Socket#connect`) y `tls.connect` lanzan «Red prohibida en pruebas» (regla 32).

**Archivos:**

- Código: `app/shared/schema.ts`, `app/shared/server/{errors,http,session,session-next,admin-verifier,firebase-auth-errors,env,firebase-admin}.ts`, `app/shared/firebase-client.ts`, `scripts/check-env.ts`.
- Pruebas: `app/shared/tests/**`, `tests/setup/no-network.ts`, `tests/helpers/mcp-config.ts`, `tests/project/mcp-config-helper.test.ts`, `tests/project/agents-consistency.test.ts`. Este último cambio lo autorizó la persona: un `.mcp.json` que es exactamente `/dev/null`, como lo monta el sandbox, cuenta como «sin servidores».
- Configuración: `vitest.config.mts` (`setupFiles` y alias de `server-only` solo en pruebas) y `package.json` (script `check:env`).
- Docs: `docs/specs/f0-base-del-proyecto.md` (decisiones 18–21 tras `security`) y `docs/handoffs/f0-interfaz.md` (interfaz acordada).

**Cómo verificar:**

- `npm run check` → todo en verde: 332 pruebas y cobertura de `app/shared/server/**` en 89 % de funciones y 92 % de líneas. Dentro del sandbox se verificaron por separado typecheck, lint, formato de las carpetas del proyecto y `npm test`.
- `npm run build` → compila sin errores.
- `npm run check:env` → `Modo: …` y una línea por variable, sin valores; código 0 si el entorno es válido.

**Decisiones:**

- Orden TDD: primero las pruebas (agente `tests`), verificadas en rojo, y después el código (agente `backend`), en cada ronda.
- El adaptador de Firebase Admin se sacó a `admin-verifier.ts` (puro, con pruebas) en vez de excluir `session-next.ts` de la cobertura.
- Mensajes por defecto: 401 «Inicia sesión para continuar.», 403 «No tienes permiso para hacer esto.», 400 de `ZodError` «Revisa los datos enviados.».
- Se mantiene la regla 4 (`ZodError` → 400), aprobada en la spec.

**Pendiente / bloqueos:**

- `npm run check`, `npm run build` y `npm run check:env` no corren completos dentro del sandbox: Tailwind y prettier no pueden leer `.idea` y `.vscode`, y tsx no puede abrir su pipe IPC. Los corre la persona fuera del sandbox.
- Para el preview de F2 en Vercel: confirmar cómo arma Vercel `request.url` (comparación de `Origin`, hallazgo #3) y que expone `VERCEL` en tiempo de ejecución (R3).
- `npm audit --omit=dev`: 7 avisos transitivos de `firebase-admin` (denegación de servicio). Revisarlos en una tarea aparte, con aviso a la persona.

**Observaciones de `security` (severidad Baja, aceptadas):**

- B1: no hay límite de longitud del token antes de decodificarlo. Para la cookie lo acotan el navegador y Node; en F2, limitar `idToken` en el esquema Zod de la ruta (por ejemplo, `max(4096)`).
- B2 (sin verificar): faltan pruebas de `hasJwtShape` contra el SDK real en bordes de decodificación: base64url con largo ≡ 1 (mod 4), BOM, UTF-8 inválido, anidación profunda, espacios en el payload y `__proto__`. No es un fallo demostrado; `security` no pudo ejecutarlo por permisos del sandbox.
- R2: una caída al descargar las claves de Google llega como `auth/argument-error` y da 401 en vez de 500. En F2, no borrar la cookie cuando `getSession()` devuelva `null`.
- R3: la protección del emulador en Vercel depende de que Vercel exponga `VERCEL` (activado por defecto).
- R4: archivos sin seguimiento ajenos a F0 (`.claude/*`, `.idea`, `.vscode`, `data`) que no deben entrar en ningún commit.
- #12: los 500 no se registran (los logs están fuera de alcance).

**Dudas de la especificación:**

- Ninguna abierta: las decisiones 18–21 quedaron registradas en la spec.
