# Progreso

Lo mantiene el orquestador: se actualiza al cerrar cada feature (spec aprobada → construida → `npm run check:full` en verde → `security` → nota en `docs/handoffs/`). Lo leen Claude Code y OpenCode al empezar la sesión.

## Estado

- **Construido:** F0 (versión mínima, sin seed): errores y HTTP, origen, sesión, entorno, `check:env` y clientes de Firebase. `security`: Aprobado con observaciones. Nota: `docs/handoffs/f0-base-del-proyecto.md`.
- **Spec en curso:** ninguna.
- **Siguiente:** F1 o F2, ver `docs/features.md`.

## Decisiones tomadas

- Errores en el cable `{ error: { code, message, fields? } }`; 500 siempre genérico (`docs/specs/f0-base-del-proyecto.md`, reglas 1–5).
- Sesión: solo una credencial rechazada da `null`/401; otros errores dan 500. Una cookie sin forma de JWT se rechaza antes de Firebase (spec F0, regla 11 y decisión 18).
- `Origin` se compara por origen completo (spec F0, regla 6 y decisión 19).
- El emulador está prohibido en Vercel, y el `PROJECT_ID` del navegador debe ser igual al del servidor en los dos modos (spec F0, decisiones 20 y 21).

## Pendientes de la persona

- Correr `npm run check`, `npm run build` y `npm run check:env` fuera del sandbox para cerrar F0.
- En el primer preview de Vercel (F2): confirmar cómo arma Vercel `request.url` (comparación de `Origin`) y que expone `VERCEL` en tiempo de ejecución.
- Para F2: limitar el tamaño de `idToken` en la ruta y no borrar la cookie cuando `getSession()` devuelva `null` (observaciones B1 y R2).
- Revisar los archivos sin seguimiento ajenos a F0 (`.claude/*`, `.idea`, `.vscode`, `data`) y decidir si van en `.gitignore`.
- Revisar en una tarea aparte los 7 avisos de `npm audit --omit=dev` (transitivos de `firebase-admin`).
