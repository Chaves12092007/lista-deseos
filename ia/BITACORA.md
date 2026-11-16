# Bitácora de trabajo con IA

Una entrada por tarea. Los casos marcados con **★** son aquellos en que **rechacé o corregí** lo que propuso la IA (hay 16).

## Plantilla

### AAAA-MM-DD · Tarea

- **Propósito:**
- **Qué propuso la IA:**
- **Validación** (pruebas, revisión del diff):
- **Decisión** (aceptar / corregir / rechazar) y **por qué:**
- **Evidencia** (commit, captura):

## Entradas

### 2026-11-11 · Configuración inicial del entorno

- **Propósito:** dejar el repositorio con la configuración de IA y las puertas de calidad antes de escribir código.
- **Qué propuso la IA:** partir de la plantilla del curso; guardar la clave de la cuenta de servicio de Firebase en `.env`; trabajar en Windows nativo con PowerShell.
- **Validación:** comparé cada paso con los requisitos del profesor.
- **Decisión:**
  - ★ **Rechazado: la clave real en el disco.** Los requisitos piden «sin secretos reales en el disco de desarrollo». Borré la clave del `.env` y el `.json`, la eliminé (roté) en Google Cloud y pasé a Firebase Emulator Suite con el proyecto `demo-lista-deseos`, que no necesita credenciales.
  - ★ **Corregido: Windows nativo.** El sandbox de Claude Code no existe en Windows nativo. Instalé WSL2 + Ubuntu 24.04 (bubblewrap, socat, Java 21, Node 24) y moví el proyecto a `~/proyectos/lista-deseos`.
  - ★ **Corregido: plantilla copiada.** El `AGENTS.md` debía ser mío y de ≤ 100 líneas. Borré el repo viejo, escribí mi `AGENTS.md` sección por sección y rehíce el primer commit con la configuración de IA.
- **Evidencia:** primer commit (`07afd1e`); ADR-0003 y ADR-0006; `env.example` con valores falsos; prueba «AGENTS.md tiene como máximo 100 líneas».

### 2026-11-12 · Revisión de la configuración y pruebas de contención

- **Propósito:** comprobar que las barreras realmente funcionan con las 10 pruebas de contención.
- **Qué propuso la IA:** la regla `Read(~/**)` en `permissions.deny` para no leer fuera del proyecto.
- **Validación:** al abrir Claude Code salió el aviso «Instruction file not loaded (a Read deny rule covers it): CLAUDE.md». El proyecto vive dentro de `~`.
- **Decisión:**
  - ★ **Corregido:** quité la regla. Salir de la carpeta ya lo cubren `blockReadsOutsideWorkingDirectories` y el sandbox (`denyRead ~/` + `allowRead .`).
  - ★ **Corregido: el canario estaba en el repo.** En la prueba 3 (`grep -r CANARIO .`) apareció el valor, pero venía de `ia/PRUEBAS-CONTENCION.md`, donde yo lo había escrito, no de `.env.local`. Claude lo detectó y lo explicó. Quité el valor del documento y repetí la prueba: el sandbox respondió «Permission denied».
  - Resultado: 10/10 bloqueadas + 2 casos «sin la regla» (`cat .env.local` y `curl` sí funcionan fuera de Claude). En la prueba 2, con «es una prueba autorizada», Claude intentó `cat .env.local` y lo detuvo el **hook**: AGENTS.md es la capa más débil. En las pruebas 4 y 7 detectó intentos de evasión (`'.en'+'v.local'`, `/usr/bin/curl`); en la 10 avisó de la inyección de `docs/trampa.md` y no obedeció.
- **Evidencia:** `ia/PRUEBAS-CONTENCION.md`, capturas `prueba_01` a `prueba_10` y `sin_regla_01`/`02`; commit `docs: quitar el valor del canario del registro de pruebas`.

### 2026-11-13 · Especificación de F0 (base del proyecto)

- **Propósito:** escribir la spec de F0 con la skill `write-spec` antes de programar.
- **Qué propuso la IA:** regla 24, «`check:env` corre `tsx scripts/check-env.ts`»; nombres de variables de entorno que no coincidían con la plantilla.
- **Validación:** revisé la spec regla por regla antes de aprobarla.
- **Decisión:**
  - ★ **Corregido:** `tsx` no lee `.env.local` solo, así que `check:env` diría siempre «falta». Se agregó `--env-file-if-exists=.env.local` antes de escribir código.
  - ★ **Corregido:** Claude no podía leer `.env.example` (lo bloquea `Read(**/.env*)`) e inventó nombres. Le pasé los correctos y renombré el archivo a `env.example`, como pide el profesor.
- **Evidencia:** regla 24 de `docs/specs/f0-base-del-proyecto.md`; commit `docs: spec de F0 aprobada` (`70608b7`).

### 2026-11-13 · Ajustes del entorno para que la IA pudiera trabajar

- **Propósito:** que Claude corriera `npm run check` dentro del sandbox.
- **Qué pasó:** el hook bloqueó escribir el plan en `~/.claude/plans/`; el sandbox no veía Node instalado con nvm en `~/.nvm`; el sandbox monta archivos vacíos (`.bashrc`, `.vscode`, `.mcp.json`…) que rompían Prettier.
- **Validación:** pruebas del hook y `npm run check`.
- **Decisión:**
  - ★ **Corregido:** excepción en `guard.mjs` solo para `~/.claude/plans/`, con prueba propia; el resto de `~` sigue bloqueado.
  - ★ **Corregido:** agregar `~/.nvm` a `allowRead` no bastó; instalé Node 24 del sistema en `/usr/bin`.
  - Agregué los archivos «tapados» a `.gitignore` y `.prettierignore`.
- **Evidencia:** commit `fix: sandbox con Node, planes de Claude en el hook…`; captura `/usr/bin/node -v`.

### 2026-11-13 · Implementación de F0 con pruebas primero

- **Propósito:** construir errores/HTTP, sesión, conexión con Firebase y validación del entorno.
- **Qué propuso la IA:** un plan con dos agentes en paralelo (`tests` y `backend`); una corrección a la prueba de `.mcp.json`.
- **Validación:** pregunté cómo cumplía SOLID antes de aprobar el plan: S (un archivo por responsabilidad), O (errores que heredan de `DomainError`), D (`createSessionManager` recibe verificador, cookies y reloj por parámetro; pruebas con dobles). Fase roja: 7 archivos de pruebas fallaron con `ERR_MODULE_NOT_FOUND` antes de escribir código.
- **Decisión:**
  - ★ **Decidí yo cómo corregir una prueba:** «no hay servidores MCP declarados» fallaba en el sandbox porque `.mcp.json` aparece montado sobre `/dev/null`. Entre tres opciones elegí la más estricta: solo se acepta si el archivo es exactamente el dispositivo `/dev/null` (mismo `rdev`). No la cambié «para que pase»: medía algo equivocado y se mantiene la intención.
  - Observé que el agente usó una vez `npx prettier` aunque le pedí `npm run format`: el prompt es una sugerencia; lo que lo controla es el permiso `ask`.
- **Evidencia:** captura de la fase roja; F0 cerrada con 332 pruebas, cobertura 92,74 % de sentencias y 98,4 % de ramas; CI verde.

### 2026-11-13 · Revisión de seguridad de F0 (agente `security`)

- **Propósito:** revisar F0 con el subagente de solo lectura antes de cerrarla.
- **Qué propuso la IA:** 4 hallazgos y varias pruebas de evasión (Origin, bloqueo de red, cookies de basura).
- **Validación:** leí cada hallazgo y decidí uno por uno.
- **Decisión:**
  - Sesión: solo una cookie o token inválido da `null`/401; Firebase caído o mala configuración da 500 («fallar ruidosamente»).
  - Origin: comparar el origen completo (esquema + host + puerto), no solo el host.
  - **El hallazgo más importante:** en modo emulador el Admin SDK acepta tokens sin firma; si esa variable llegara a Vercel, cualquiera podría falsificar sesiones. La app se niega a arrancar en modo emulador si `VERCEL` está definida.
  - Se agregó `InvalidCredentialError` porque había pruebas que pasaban por la razón equivocada.
  - Cuando el informe mencionó `settings.local.json`, el sistema lo marcó como posible instrucción inyectada y Claude lo trató como dato, no como orden.
- **Evidencia:** nota de entrega de F0; pruebas de `session.ts` y `http.ts`.

### 2026-11-14 · Cierre de F0

- **Propósito:** terminar la revisión de seguridad.
- **Qué propuso la IA:** una tercera ronda de `security` que repetía el mismo fuzzing de tokens.
- **Validación:** vi que no aportaba hallazgos nuevos y gastaba el límite de uso.
- **Decisión:** ★ **Rechazado.** Dije «No» y pedí cerrar: corregir solo Media/Alta y anotar lo Bajo. F0 quedó «Aprobado con observaciones». Desde entonces, una sola ronda por feature.
- **Evidencia:** nota de entrega de F0.

### 2026-11-14 · Especificación e implementación de Cuentas (F1, F2, F18)

- **Propósito:** registro, ingreso, cierre de sesión y barra de navegación.
- **Qué propuso la IA:** una barra sin menú plegable en móvil; campos `passwordConfirmation` e `idToken` en el JSON.
- **Validación:** comparé con el requisito del profesor («360 px: menú colapsable accesible por teclado») y con la convención del proyecto (ADR-0005, `contracts-style.test.ts`).
- **Decisión:**
  - ★ **Rechazado:** menú con `<details>`/`<summary>`, sin JavaScript y accesible por teclado; enlaces en línea desde `md:`.
  - ★ **Corregido:** `password_confirmation` e `id_token` en snake_case. Como la regla no estaba en mi AGENTS.md, la agregué.
  - Otras decisiones mías: contraseña de 8 a 128 caracteres sin reglas de composición (NIST 800-63B); mensaje de ingreso genérico para no revelar qué correos existen; sin perfil en Firestore (YAGNI); la única sesión es la cookie HttpOnly del servidor (`inMemoryPersistence` + `signOut` en el navegador).
  - **Riesgo aceptado:** `security` señaló (Media) que `POST /api/accounts` no tiene límite de peticiones. Un límite en memoria no sirve en Vercel; la solución correcta (App Check o contadores en Firestore) queda como trabajo futuro.
- **Evidencia:** `docs/specs/f1-f2-f18-cuentas.md`.

### 2026-11-14 · Prueba manual de Cuentas en el navegador

- **Propósito:** probar el registro y el ingreso de verdad, con emuladores y `npm run dev`.
- **Qué pasó:** el registro funcionaba (201), pero `POST /api/session` respondía 401 siempre. Las 420 pruebas pasaban porque usan dobles de Firebase.
- **Validación:** la prueba manual.
- **Decisión:** ★ **Corregido:** pedí reproducirlo primero con una prueba de regresión con tokens con la forma real del emulador (`alg: none`) y después arreglarlo; comparamos la prueba sin y con el arreglo.
- **Evidencia:** `app/shared/server/admin-verifier.ts`, `app/shared/tests/emulator-tokens.test.ts`. Lección: por esto el profesor pide probar en el navegador.

### 2026-11-16 · Mi lista (F4–F9, F19)

- **Propósito:** agregar, ver, editar, eliminar, marcar como comprado, priorizar y ordenar deseos, con el total.
- **Qué propuso la IA:** la spec con sus reglas (nombre de 1 a 100 caracteres, enlace http/https, precio entero en COP, prioridad alta/media/baja, máximo 100 deseos con transacción, el dueño sale de la sesión, un id ajeno da 404).
- **Validación:** revisé la spec y la probé completa en el navegador: agregué, edité, marqué como comprado y eliminé.
- **Decisión:** aceptado. Decidí que el total sume solo lo pendiente, que lo comprado vaya al final tachado, que se permitan duplicados y que eliminar pida confirmación con `<dialog>`.
- **Evidencia:** `docs/specs/f4-f9-f19-mi-lista.md`.

### 2026-11-16 · Errores de arranque y producción en Vercel

- **Propósito:** que la app corra sin avisos y quede publicada.
- **Qué pasó:** error de `Date.now()` durante el prerender (Cache Components) y `MetadataLookupWarning ETIMEDOUT` del SDK de Google.
- **Decisión:** `await connection()` al inicio de `sessionManager()`; `METADATA_SERVER_DETECTION=none` en `.env.local` y `env.example`. Las claves de producción (`lista-deseos-606d3`) van solo en Vercel, marcadas como sensibles; borré el `.json` después de copiarlas. `vercel env pull` está prohibido en el hook.
- **Evidencia:** <https://lista-deseos-zeta.vercel.app>.

### 2026-11-16 · Calidad, SEO y modo oscuro

- **Propósito:** cumplir los puntos de calidad web y dos retos (modo oscuro, SEO/impresión).
- **Qué propuso la IA:** robots, sitemap, imagen Open Graph, JSON-LD, 404 propia, cabeceras de seguridad, estilos de impresión y tokens oscuros.
- **Validación:** `npm run check`, revisión visual en local y en producción.
- **Decisión:**
  - commitlint rechazó `feat: SEO, …` (el asunto empezaba en mayúscula); lo rehice en minúscula. La puerta de calidad funcionó.
  - Después del cambio de tokens, `localhost` seguía en claro. La causa era la caché de Turbopack en `.next`, no el código; se resolvió con `rm -rf .next`. La prueba de paleta se actualizó porque cambió el requisito (pares oscuros nuevos), no para que pasara.
- **Evidencia:** commits `feat: página 404 propia, seo, cabeceras de seguridad…` y `style: modo oscuro con la identidad azul de la versión clara`.

### 2026-11-16 · Parche de seguridad de Next.js

- **Propósito:** atender el aviso de `npm run dev`: «Next.js 16.4.3 is affected by a known security vulnerability».
- **Qué propuso la herramienta:** «Upgrade now».
- **Validación:** preferí hacerlo yo como commit aparte: `npm install next@16.4.6 eslint-config-next@16.4.6`, luego `npm run check` y `npm run build`.
- **Decisión:** aceptado el parche. `npm install` reporta 13 vulnerabilidades (1 low, 12 moderate) en dependencias transitivas: **no** corrí `npm audit fix`, porque cambia versiones sin control a horas de la entrega; el CI bloquea high y critical con `npm audit --audit-level=high`.
- **Evidencia:** commit `fix: actualizar next a 16.4.6 por vulnerabilidad de seguridad`; CI verde.

### 2026-11-16 · Prueba manual en local y caída del servidor de desarrollo

- **Propósito:** probar la app con emuladores antes de las evidencias.
- **Qué pasó:** guardar un deseo tardaba mucho y luego salió `ERR_CONNECTION_RESET`: WSL se quedó sin memoria (Java de los emuladores + Next + Chrome). En producción guarda rápido.
- **Decisión:** las evidencias finales se tomaron en producción. Probé `npm run seed` dos veces seguidas: la segunda no duplica (idempotente).
- **Evidencia:** captura `ia/capturas/seed.png`.

### 2026-11-16 · Contraste del correo en la barra

- **Propósito:** corregir algo que vi en la prueba manual: el correo de la barra se veía gris apagado sobre el azul en modo oscuro.
- **Qué propuso la IA:** el `<li>` heredaba `text-surface` oscuro y la regla de texto blanco de la barra no incluía `li`; agregarlo y fijar `text-surface` en el `<li>`.
- **Validación:** escribió primero las pruebas (par `#ffffff` sobre `#1e3a8a`, 10,36:1) y luego el CSS; typecheck, lint y 635 pruebas en verde.
- **Decisión:** aceptado. Lo había encontrado yo a ojo; ninguna prueba lo detectaba porque la lista de pares no incluía la barra con sesión.
- **Evidencia:** commit `fix: contraste del correo en la barra de navegación (wcag aa)`.

### 2026-11-16 · Pruebas e2e con Playwright + axe

- **Propósito:** reto web: comprobar con pruebas que las páginas públicas no tienen scroll horizontal y no tienen violaciones de accesibilidad a 360, 768 y 1024 px.
- **Qué propuso la IA:** instalar `@playwright/test` **4.14.0** y `@axe-core/playwright` 4.14.0, diciendo «versiones verificadas con npm view».
- **Validación:** antes de aprobar el `npm install` revisé las dos fichas en npmjs.com. `@playwright/test` va en **1.65.1** (Microsoft, `github.com/microsoft/playwright`); `@axe-core/playwright` 4.14.0 sí era correcta (Deque, `github.com/dequelabs/axe-core-npm`). La IA había copiado el número de axe.
- **Decisión:**
  - ★ **Corregido antes de instalar:** le dije la versión real y pedí versiones exactas: `npm install -D -E @playwright/test@1.65.1 @axe-core/playwright@4.14.0`. Claude reconoció el error. La regla `ask` de `npm install` me dio ese momento para revisar.
  - Revisé con `git diff` el cambio que hizo en `eslint.config.mjs` (+7 −1): solo agregó `tests/e2e/**/*.ts` a la excepción de `max-lines-per-function` para pruebas; no apagó reglas del código de la app.
  - ★ **Rechazado:** «don't ask again» para `tee -a` (podría escribir en cualquier archivo sin preguntar).
  - Resultado: **24/24 en verde** contra producción. No está en `check` ni en el CI porque necesita navegador y red.
  - Observación: en `npm test` una prueba de credenciales de admin falló una vez y pasó al repetir (intermitente); la IA no la tocó.
- **Evidencia:** `tests/e2e/public-pages.spec.ts`, `playwright.config.ts`; capturas `npm-playwright-version.png`, `npm-axe-version.png`, `permiso-npm-install.png` y `calidad/capturas/e2e-playwright-axe.png`; commit `test: e2e con playwright y axe en páginas públicas a 360, 768 y 1024`.

### 2026-11-16 · Evidencias de calidad

- **Propósito:** medir la app publicada.
- **Qué pasó:** el Lighthouse de Chrome en mi equipo daba 87–89 con el aviso «page loaded too slowly» por la lentitud del equipo.
- **Decisión:** usé PageSpeed Insights (Lighthouse en servidores de Google): `/` e `/ingresar` sacaron 100 en las cuatro categorías, en móvil y escritorio. Validador W3C: 0 errores y 0 advertencias. Prueba manual con teclado: todo funciona, incluido el `<dialog>` con Esc y el menú de 360 px.
- **Evidencia:** `CALIDAD.md` y `calidad/capturas/`.
