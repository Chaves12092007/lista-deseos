# Configuración de la IA

Herramienta: Claude Code (versión: 2.1.326), en WSL2 Ubuntu 24.04, abierta siempre en la raíz del repo. Modelo de trabajo: Sonnet por defecto, para cuidar el límite de uso.

| Barrera                                    | Archivo / ajuste               | Riesgo que cubre                                   | Límite conocido                                                                   |
| ------------------------------------------ | ------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Reglas                                     | `AGENTS.md`                    | Orienta a la IA                                    | Es una sugerencia: se puede ignorar o anular con inyección                        |
| `permissions.deny` de `.env*`, claves      | `.claude/settings.json`        | Que la IA lea secretos con sus herramientas        | Una regla de `Read` no ve un `grep -r` ni un script de Node → lo cubre el sandbox |
| `blockReadsOutsideWorkingDirectories`      | `.claude/settings.json`        | Leer otros proyectos o `~`                         | Solo herramientas de archivos → Bash lo cubre el sandbox                          |
| Sandbox (`denyRead: ~/`, `allowRead: .`)   | `.claude/settings.json`        | Que un comando lea fuera del proyecto o los `.env` | No existe en Windows nativo: por eso WSL2                                         |
| Red (`allowedDomains`)                     | `.claude/settings.json`        | Exfiltrar datos o bajar código                     | Solo aplica a comandos dentro del sandbox                                         |
| `deny`/`ask` de comandos                   | `.claude/settings.json`        | Acciones destructivas o sin vuelta atrás           | `Bash(curl *)` no detiene `/usr/bin/curl` ni `sh -c` → sandbox + hook             |
| `ask` en `npm install`                     | `.claude/settings.json`        | Dependencias maliciosas o inventadas               | Solo avisa: la verificación en npmjs.com la hago yo                               |
| `Edit(./.claude/**)` denegado              | `.claude/settings.json`        | Que la IA abra su propia jaula                     | —                                                                                 |
| Hook `guard.mjs`                           | `.claude/hooks/`               | Segunda revisión de rutas y comandos               | Un comando ofuscado puede esquivarlo: es una capa más                             |
| Emulator Suite                             | `firebase.json`, `env.example` | Robo de credenciales reales                        | Producción vive solo en Vercel                                                    |
| Modo plan y `disableBypassPermissionsMode` | `.claude/settings.json`        | Que la IA cambie código sin que yo apruebe el plan | Nunca elijo «auto mode» ni «don't ask again» amplios                              |

## Ajustes hechos

- **2026-11-12** — Quité `Read(~/**)` de `deny`: como el proyecto vive dentro de `~`, bloqueaba el propio `CLAUDE.md` («Instruction file not loaded»). Salir de la carpeta ya lo cubren `blockReadsOutsideWorkingDirectories` y el sandbox.
- **2026-11-13** — Renombré `.env.example` a `env.example`: la regla `Read(**/.env*)` también bloqueaba la plantilla y la IA inventaba nombres de variables.
- **2026-11-13** — Excepción en el hook para `~/.claude/plans/`: el modo plan necesita escribir ahí su plan. El resto de `~` sigue bloqueado y hay una prueba para cada caso.
- **2026-11-13** — El sandbox no veía Node instalado con nvm en `~/.nvm` (agregar `~/.nvm` a `allowRead` no bastó). Instalé Node 24 del sistema en `/usr/bin`.
- **2026-11-13** — El sandbox monta archivos vacíos (`.bashrc`, `.vscode`, `.mcp.json`…) dentro del proyecto y Prettier fallaba al leerlos. Los agregué a `.gitignore` y `.prettierignore`.
- **2026-11-14** — Reglas `allow` para `npx vitest`, `npx eslint`, `npx prettier` y `git add`, para no aprobar decenas de comandos por feature. `git push` y `npm install` siguen en `ask`.

## Límites encontrados en la práctica

- `Bash(npx:*)` no cubre `npm exec`, que hace lo mismo: el orquestador lo usó una vez sin pedir permiso.
- El hook da **falsos positivos**: bloqueó editar `package.json` con Bash porque el comando mencionaba `.env.local` dentro de un script; Claude lo resolvió con la herramienta Edit.
- El hook bloquea los `cd` con rutas absolutas; cuando la terminal de Claude quedó dentro de `node_modules/`, tuve que reiniciarla.
- Algunos comandos no funcionan dentro del sandbox (`tsx` falla con `listen EPERM`; el build de Turbopack falla por la caché): `check:env`, `seed` y `build` los corro yo fuera de Claude.
- La IA puede afirmar que verificó algo que no verificó: dijo «versiones verificadas con npm view» y dio `@playwright/test` 4.14.0, cuando la real era 1.65.1 (bitácora, entrada 30). La regla `ask` de `npm install` me dio el momento para revisarlo.
