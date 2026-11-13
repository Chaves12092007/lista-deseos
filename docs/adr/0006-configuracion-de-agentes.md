# ADR-0006 · Configuración de la IA: capas de contención

- **Estado:** Aceptada
- **Fecha:** 2026-11-11
- **Quién decide:** Marco

## Contexto

Una instrucción en el prompt es una sugerencia que el modelo puede ignorar o que un texto malicioso puede anular. Lo que de verdad contiene a la IA es lo que el programa hace cumplir. El curso pide configurarlo antes de generar código y dejarlo en el primer commit.

## Decisión

Se usa solo **Claude Code**, abierto siempre en la raíz del repositorio, dentro de **WSL2** (el sandbox no existe en Windows nativo). Capas, de la más débil a la más fuerte:

| Capa                  | Dónde                                                                         | Qué cubre                                                                                                                                                                                                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reglas escritas       | `AGENTS.md` (≤ 100 líneas) y `CLAUDE.md` (`@AGENTS.md`)                       | Orientan; no protegen                                                                                                                                                                                                                                                                                               |
| Permisos              | `.claude/settings.json` → `permissions`                                       | `deny` de `.env*`, claves, `data/`, `~`, `sudo`, `rm -rf`, `curl`, `wget`, `git push --force`, `git reset --hard`, editar `.claude/`; `ask` para `git push`, instalar dependencias, `npx`, `vercel`, `firebase`; modo `plan` por defecto; `bypassPermissions` deshabilitado; lecturas fuera del proyecto bloqueadas |
| Sandbox               | `.claude/settings.json` → `sandbox`                                           | Bash aislado con bubblewrap: no lee `~` ni `.env*` ni `data/`, no escribe en `.claude/`, red solo a `registry.npmjs.org` y `github.com`; si no hay sandbox, Claude Code no arranca                                                                                                                                  |
| Hook propio           | `.claude/hooks/guard.mjs` (pruebas en `guard.test.mjs`, `npm run test:hooks`) | Segunda revisión de cada `Read/Edit/Write/Glob/Grep/Bash`; sale con código 2 y explica el motivo                                                                                                                                                                                                                    |
| Sin secretos en disco | Firebase Emulator Suite (ADR-0003)                                            | Aunque todo lo anterior fallara, no hay nada real que robar                                                                                                                                                                                                                                                         |

Sin servidores MCP. Sin acceso web (`WebFetch` denegado).

## Dominios de red permitidos

- `registry.npmjs.org`: instalar dependencias (siempre con permiso, regla `ask`).
- `github.com`: `git push`/`git pull` (siempre con permiso).

## Consecuencias

- Hay que trabajar en WSL2 con `bubblewrap` y `socat` instalados.
- Cambiar la configuración de la IA lo hace la persona a mano: la IA no puede editar `.claude/`.
- Las pruebas de contención (`ia/PRUEBAS-CONTENCION.md`) demuestran que cada capa funciona.
