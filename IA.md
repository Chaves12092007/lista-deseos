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
| CI en verde                                       | Pestaña _Actions_ del repositorio                                                                       |

## Retos de excelencia elegidos

1. **Hook `PreToolUse` propio** con pruebas `node:test` (`npm run test:hooks`).
2. **Cero secretos reales en disco**: todo contra Firebase Emulator Suite (ADR-0003).
3. _(opcional)_ Subagente revisor de solo lectura (`.claude/agents/security.md`).

Para cada reto: evidencia y cómo reproducirlo (completar).
