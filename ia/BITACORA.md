# Bitácora de trabajo con IA

Una entrada por tarea. Mínimo **3 casos** en que rechacé o corregí lo que propuso la IA.

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
- **Qué propuso la IA:** partir de la plantilla del curso; luego, al revisar los requisitos, rehacer la base (WSL2, sandbox, emulador, Prettier, ESLint más estricto).
- **Validación:** `npm run check` en verde; pruebas del hook.
- **Decisión:** _completar_. Rechazado: guardar la clave real de la cuenta de servicio en `.env` (la borré y la roté); usar Windows nativo (sin sandbox).
- **Evidencia:** primer commit.
