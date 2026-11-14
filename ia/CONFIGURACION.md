# Configuración de la IA

Herramienta: Claude Code (versión: _completar con `claude --version`_), en WSL2 Ubuntu 24.04, abierta siempre en la raíz del repo.

| Barrera                                  | Archivo / ajuste               | Riesgo que cubre                                   | Límite conocido                                                                   |
| ---------------------------------------- | ------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Reglas                                   | `AGENTS.md`                    | Orienta a la IA                                    | Es una sugerencia: se puede ignorar o anular con inyección                        |
| `permissions.deny` de `.env*`, claves    | `.claude/settings.json`        | Que la IA lea secretos con sus herramientas        | Una regla de `Read` no ve un `grep -r` ni un script de Node → lo cubre el sandbox |
| `blockReadsOutsideWorkingDirectories`    | `.claude/settings.json`        | Leer otros proyectos o `~`                         | Solo herramientas de archivos → Bash lo cubre el sandbox                          |
| Sandbox (`denyRead: ~/`, `allowRead: .`) | `.claude/settings.json`        | Que un comando lea fuera del proyecto o los `.env` | No existe en Windows nativo: por eso WSL2                                         |
| Red (`allowedDomains`)                   | `.claude/settings.json`        | Exfiltrar datos o bajar código                     | Solo aplica a comandos dentro del sandbox                                         |
| `deny`/`ask` de comandos                 | `.claude/settings.json`        | Acciones destructivas o sin vuelta atrás           | `Bash(curl *)` no detiene `/usr/bin/curl` ni `sh -c` → sandbox + hook             |
| `Edit(./.claude/**)` denegado            | `.claude/settings.json`        | Que la IA abra su propia jaula                     | —                                                                                 |
| Hook `guard.mjs`                         | `.claude/hooks/`               | Segunda revisión de rutas y comandos               | Un comando ofuscado puede esquivarlo: es una capa más                             |
| Emulator Suite                           | `firebase.json`, `env.example` | Robo de credenciales reales                        | Producción vive solo en Vercel                                                    |

## Ajustes hechos

- _(fecha) — qué cambié y por qué_
