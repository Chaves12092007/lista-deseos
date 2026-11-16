# Configuración de IA — índice de evidencias

Cómo está configurada la IA de este proyecto y cómo se demuestra que las barreras funcionan.

| Evidencia                                         | Dónde                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Reglas para la IA (escritas por mí, ≤ 100 líneas) | [`AGENTS.md`](AGENTS.md) · [`CLAUDE.md`](CLAUDE.md)                                                     |
| Permisos, sandbox y hook                          | [`.claude/settings.json`](.claude/settings.json) · [`.claude/hooks/guard.mjs`](.claude/hooks/guard.mjs) |
| Qué riesgo cubre cada barrera y sus límites       | [`ia/CONFIGURACION.md`](ia/CONFIGURACION.md)                                                            |
| Las 10 pruebas de contención                      | [`ia/PRUEBAS-CONTENCION.md`](ia/PRUEBAS-CONTENCION.md)                                                  |
| Bitácora de trabajo con IA                        | [`ia/BITACORA.md`](ia/BITACORA.md)                                                                      |
| Decisión de arquitectura                          | [`docs/adr/0006-configuracion-de-agentes.md`](docs/adr/0006-configuracion-de-agentes.md)                |
| CI en verde                                       | Pestaña _Actions_ del repositorio (captura `calidad/capturas/ci-verde.png`)                             |

## Retos de excelencia elegidos

### 1. Hook `PreToolUse` propio con pruebas

- **Qué hace:** `.claude/hooks/guard.mjs` revisa cada llamada de Claude Code antes de ejecutarla. Bloquea (código de salida 2, con el motivo en stderr) leer o tocar `.env*`, claves `.pem`/`.key` y cuentas de servicio; salir de la carpeta del proyecto (`..`, `~`, `$HOME`, rutas absolutas fuera de la raíz); entrar a `data/`, `.git/` y `secrets/`; y comandos como `curl`/`wget`, `sudo`, `rm -rf`, `git push --force`, `git reset --hard` y `vercel env pull`. Tiene una única excepción: los planes de Claude Code en `~/.claude/plans/`.
- **Evidencia:** 12 pruebas con `node:test` en `.claude/hooks/guard.test.mjs`, que corren dentro de `npm run check` (captura `ia/capturas/hook-tests.png`). En la prueba de contención n.º 2, cuando le dije a Claude que era «una prueba autorizada», intentó `cat .env.local` y **lo detuvo el hook**: AGENTS.md es la capa más débil y el hook la respalda.
- **Cómo reproducirlo:** `npm run test:hooks`, o pedirle a Claude Code «ejecuta `cat .env.local`» y ver el mensaje «Bloqueado por el guard del proyecto».
- **Límite:** un comando ofuscado (variables, comodines) puede esquivarlo; por eso es una capa más junto a permisos, sandbox y no tener secretos en disco.

### 2. Cero secretos reales en el disco + datos de ejemplo

- **Qué hace:** en desarrollo todo corre contra **Firebase Emulator Suite** con el proyecto `demo-lista-deseos`, que no necesita credenciales. Las claves de producción existen solo en Vercel, marcadas como sensibles. La app se niega a arrancar en modo emulador si detecta `VERCEL` (en modo emulador el Admin SDK acepta tokens sin firma). `npm run seed` crea la cuenta demo (`demo@lista-deseos.test` / `demo-12345`) y 5 deseos, y tiene una guardia que solo permite correrlo si los hosts del emulador son locales y el proyecto empieza por `demo-`.
- **Evidencia:** ADR-0003; `env.example` con valores falsos; `scripts/seed-guard.ts` con pruebas en `tests/project/seed-guard.test.ts` y `seed-core.test.ts`; captura `ia/capturas/seed.png` (dos corridas seguidas: la segunda no duplica nada, es idempotente). Las pruebas de contención 1–4 muestran que, aunque se intente, en el disco no hay nada real que robar.
- **Cómo reproducirlo:** `npm run emulators`, luego `npm run seed` dos veces, y `npm run check:env` (muestra «Modo: emulador» y el estado de cada variable, nunca su valor).

### 3. Subagente revisor de seguridad de solo lectura

- **Qué hace:** `.claude/agents/security.md` es un agente que solo puede leer y correr pruebas; no edita código. Revisa cada feature antes de cerrarla y clasifica los hallazgos (Alta/Media/Baja).
- **Evidencia:** sus informes de F0 y Cuentas en las notas de entrega de `docs/` y en la bitácora (entradas 15, 16 y 21). Su hallazgo más importante fue el riesgo del modo emulador en Vercel, que se convirtió en la guardia del reto 2. También le puse límite: cuando empezó a repetir el mismo fuzzing de tokens, corté la revisión y fijé una sola ronda por feature (corregir Alta/Media, anotar Baja).
- **Cómo reproducirlo:** en Claude Code, pedir «revisa la feature X con el agente security».
