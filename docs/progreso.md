# Progreso

Lo mantiene el orquestador: se actualiza al cerrar cada feature (spec aprobada → construida → `npm run check:full` en verde → `security` → nota en `docs/handoffs/`). Lo leen Claude Code y OpenCode al empezar la sesión.

## Estado

- **Construido:** F0 (versión mínima, sin seed): errores y HTTP, origen, sesión, entorno, `check:env` y clientes de Firebase. `security`: Aprobado con observaciones. Nota: `docs/handoffs/f0-base-del-proyecto.md`.
- **Construido:** F1 + F2 + F18 · Cuentas: registro, ingreso y cierre de sesión, barra y pantallas base. `security`: Aprobado con observaciones (una ronda). Nota: `docs/handoffs/f1-f2-f18-cuentas.md`.
- **Spec en curso:** F4–F9 + F19 · Mi lista (`docs/specs/f4-f9-f19-mi-lista.md`, Borrador, espera la aprobación de la persona).
- **Siguiente:** construir Mi lista cuando la spec esté aprobada.

## Decisiones tomadas

- Errores en el cable `{ error: { code, message, fields? } }`; 500 siempre genérico (`docs/specs/f0-base-del-proyecto.md`, reglas 1–5).
- Sesión: solo una credencial rechazada da `null`/401; otros errores dan 500. Una cookie sin forma de JWT se rechaza antes de Firebase (spec F0, regla 11 y decisión 18).
- `Origin` se compara por origen completo (spec F0, regla 6 y decisión 19).
- Campos del cable en `snake_case` (`AGENTS.md`, ADR-0005). La cuenta la crea el servidor; el ingreso pasa por el SDK cliente, sin persistencia, y llega a `POST /api/session`. Cerrar sesión revoca los tokens (spec Cuentas).
- El emulador está prohibido en Vercel, y el `PROJECT_ID` del navegador debe ser igual al del servidor en los dos modos (spec F0, decisiones 20 y 21).

## Pendientes de la persona

- Correr `npm run check`, `npm run build` y `npm run check:env` fuera del sandbox para cerrar F0.
- En el primer preview de Vercel (F2): confirmar cómo arma Vercel `request.url` (comparación de `Origin`) y que expone `VERCEL` en tiempo de ejecución.
- Cuentas: borrar `.next` y correr `npm run build` (Turbopack falló por la caché); revisar en el navegador a 360, 768 y 1024 px con los emuladores (lista en la nota de entrega).
- Antes de producción: límite de peticiones en `POST /api/accounts` (spec Cuentas, decisión 17; riesgo aceptado).
- En el preview de Vercel: confirmar `Cache-Control: private, no-store` en la parte por petición de `/` (observación I3 de Cuentas).
- Revisar los archivos sin seguimiento ajenos a F0 (`.claude/*`, `.idea`, `.vscode`, `data`) y decidir si van en `.gitignore`.
- Revisar en una tarea aparte los 7 avisos de `npm audit --omit=dev` (transitivos de `firebase-admin`).
