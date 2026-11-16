## Entrega: orquestador · F1 + F2 + F18 Cuentas

**Estado:** Aprobado con observaciones (`security`, una sola ronda, 2026-11-14). Hubo un hallazgo Medio: la persona lo aceptó como riesgo (spec, decisión 17). Los demás son Bajo o Info y quedan anotados abajo.

**Hecho:**

- Contrato `app/features/accounts/schema.ts` (snake_case) e interfaz `docs/handoffs/f1-f2-f18-interfaz.md`.
- TDD: el agente `tests` escribió las pruebas primero y dieron rojo (4 de 5 archivos, por módulos inexistentes). Después `backend` las puso en verde sin cambiar ninguna.
- Backend:
  - el servicio `register`/`startSession`/`endSession`;
  - los puertos, el adaptador de Firebase Admin y el doble en memoria;
  - el contenedor;
  - las rutas `POST /api/accounts` (201) y `POST`/`DELETE /api/session` (204).
  - Se cierran B1 (`id_token` ≤ 4096) y R2 (solo `DELETE` borra la cookie).
- Frontend:
  - barra con menú `<details>` bajo `md`;
  - formularios de registro e ingreso (SDK cliente con persistencia en memoria y `signOut`);
  - páginas `/`, `/registro` e `/ingresar` con su `<title>`, más `app/error.tsx` y el pie de página.

**Archivos:**

- Feature: `app/features/accounts/{schema.ts,server/**,ui/**,tests/**}` y `app/features/container.ts`.
- Rutas: `app/api/{accounts,session}/route.ts`.
- Compartido: `app/shared/server/http.ts` (`rejectInvalidJson`: JSON roto → 400) y `app/shared/ui/**`.
- Páginas: `app/_components/**`, `app/{layout,page,error}.tsx`, `app/{registro,ingresar}/page.tsx` y `app/globals.css` (enlaces subrayados).

**Cómo verificar:**

- `npm run typecheck`, `npm run lint`, `npm test` (420 pruebas; cobertura de 93,5 % en líneas y 91 % en funciones) y `npx prettier --check app docs tests`: todo en verde.
- `npm run test:hooks`: 12 de 12.
- `npx next build --webpack`: compila. `/`, `/registro` e `/ingresar` salen como Partial Prerender.

**Decisiones:**

- **JSON roto → 400:** la persona la aprobó en el plan.
- **`catchError` en la barra:** `error.tsx` no cubre el layout raíz, así que si falla la lectura de la sesión en la barra, queda solo la marca.
- **Sesión sin correo:** la barra muestra «tu cuenta».
- **Textos que agregó el frontend:**
  - «No pudimos crear la cuenta. Intenta de nuevo.»
  - «Cerrando sesión…»
  - «Empieza ahora»
  - la ayuda de `/registro`.

**Pendiente / bloqueos:**

- **`npm run build` (Turbopack) falla:** da «Export FormAlert doesn't exist in target module», aunque el export sí existe. Apunta a la caché `.next/cache/turbopack`, y el guard no deja borrarla. La persona debe correr `rm -rf .next && npm run build`.
- **Falta revisar en el navegador** (no se pudo dentro del sandbox), con `npm run emulators` y `npm run dev`:
  - las pantallas a 360, 768 y 1024 px;
  - registrarse, y registrarse con un correo repetido (409);
  - ingresar con una contraseña mala;
  - cerrar sesión, y el aviso `?cuenta=creada`;
  - que `/ingresar` redirija cuando hay sesión;
  - el menú con el teclado;
  - que la consola quede sin errores.
- **Antes de producción:** el límite de peticiones del registro (decisión 17 de la spec, hallazgo Medio).

**Observaciones de `security` (aceptadas):**

- **M1 (Media, riesgo aceptado):** el registro no tiene límite de peticiones y el 409 permite averiguar qué correos existen a escala. Se resuelve en una tarea aparte.
- **B1:** `request.json()` lee el cuerpo entero antes de revisar los largos. Falta un tope de `Content-Length` (por ejemplo, 16 KB) en un helper de `http.ts`.
- **B2 (sospecha, sin verificar):** una caída al bajar las claves de Google llega como `auth/argument-error`. Con eso, `getSession()` da `null` y `DELETE` borra la cookie sin revocar, así que los otros dispositivos siguen con sesión. Viene de R2 de F0.
- **B3:** no hay pruebas de `ui/sign-in.ts` (persistencia en memoria antes de ingresar, `signOut` siempre) ni de `sign-out-button`.
- **I1:** sería mejor `initializeAuth(app, { persistence: inMemoryPersistence })` en `getClientAuth()`.
- **I2:** `auth-port.firebase.ts` no lleva `server-only`. Hoy solo lo importa `container.ts`, que sí lo lleva.
- **I3:** en el preview de Vercel, confirmar `Cache-Control: private, no-store` en la parte por petición de `/` (el HTML estático no lleva el correo), junto con #3 y R3 de F0.

**Dudas de la especificación:** ninguna abierta. La decisión 17 quedó registrada en la spec.
