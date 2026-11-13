# Lista de deseos

Proyecto final de semestre: una lista de deseos con enlaces y precios. Cada persona guarda los productos que quiere comprar, con el enlace de la tienda y el precio, los organiza en listas y ve cuánto suma todo. Se construye feature por feature dirigiendo agentes de IA (Claude Code) con una configuración que los contiene.

**Stack:** Next.js 16 (App Router) · TypeScript estricto · Tailwind 4 · Firebase Auth y Firestore (Emulator Suite en desarrollo) · Zod · Vitest · Vercel.

## Empezar

Requisitos y pasos en [`docs/empezar.md`](docs/empezar.md) (WSL2, Node 24, emulador de Firebase).

```bash
npm install
npm run prepare     # instala los hooks de git (Husky)
npm run check       # debe quedar en verde
```

## Comandos

| Comando              | Qué hace                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo en <http://localhost:3000>                                             |
| `npm run emulators`  | Firebase Emulator Suite (Auth 9099, Firestore 8080, UI 4000)                                  |
| `npm run check`      | Tipos + lint + formato + pruebas con cobertura + pruebas del hook (definición de «terminado») |
| `npm run check:full` | Lo anterior más `npm run build`                                                               |
| `npm run format`     | Aplica el formato con Prettier                                                                |
| `npm test`           | Pruebas con Vitest y cobertura (mínimo 80 % en la lógica de negocio)                          |
| `npm run test:hooks` | Pruebas del hook de la IA (`node:test`)                                                       |

## Proceso

- **Husky + lint-staged:** al hacer commit se formatea y se revisa lo modificado; el mensaje debe ser un commit convencional (`feat:`, `fix:`, `test:`, `docs:`, `chore:`…); al hacer push corre `npm run check`.
- **CI** (GitHub Actions): `npm ci` → `npm run check` → `npm run build` → `npm audit --audit-level=high`.
- Evidencias de IA en [`IA.md`](IA.md) y de calidad web en [`CALIDAD.md`](CALIDAD.md).

## Dependencias y por qué

| Paquete                                              | Para qué                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `next`, `react`, `react-dom`                         | Framework de la aplicación                                                |
| `firebase`                                           | Ingreso con Firebase Auth desde el navegador                              |
| `firebase-admin`                                     | Acceso a Auth y Firestore desde el servidor                               |
| `zod`                                                | Validar toda entrada y los contratos entre capas                          |
| `server-only`                                        | Impide que código de servidor llegue al navegador                         |
| `typescript`, `@types/*`                             | Tipado estricto                                                           |
| `tailwindcss`, `@tailwindcss/turbopack`              | Estilos mobile-first con tokens de la paleta                              |
| `babel-plugin-react-compiler`                        | Optimización automática de componentes de React                           |
| `eslint`, `eslint-config-next`                       | Reglas de código, accesibilidad (jsx-a11y) y fronteras de la arquitectura |
| `prettier`                                           | Formato del código                                                        |
| `vitest`, `@vitest/coverage-v8`                      | Pruebas y cobertura                                                       |
| `husky`, `lint-staged`                               | Revisiones antes de cada commit y push                                    |
| `@commitlint/cli`, `@commitlint/config-conventional` | Exigir commits convencionales                                             |
| `tsx`                                                | Ejecutar scripts de TypeScript (datos de ejemplo, utilidades)             |

Toda dependencia nueva se justifica aquí antes de instalarla, y se comprueba en npmjs.com que existe, está mantenida y tiene descargas reales.

## Dónde está qué

```
AGENTS.md, CLAUDE.md   Reglas para la IA
.claude/               Agentes, skills, permisos, sandbox y hook de Claude Code
app/                   Todo el código (features/, shared/, páginas y rutas)
tests/                 Pruebas del proyecto y ayudantes
docs/                  Features, arquitectura, specs, ADR, notas de entrega
ia/, IA.md             Evidencias de la configuración de IA
calidad/, CALIDAD.md   Evidencias de calidad web
```
