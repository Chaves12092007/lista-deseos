import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // `@/tests/…` apunta a los ayudantes de la raíz; el resto de `@/…` es la carpeta `app/`.
    alias: [
      // `server-only` lanza fuera de la condición `react-server`; en las pruebas se usa su versión vacía.
      { find: /^server-only$/, replacement: resolve(import.meta.dirname, "node_modules/server-only/empty.js") },
      { find: /^@\/tests\//, replacement: `${resolve(import.meta.dirname, "tests")}/` },
      { find: /^@\//, replacement: `${resolve(import.meta.dirname, "app")}/` },
    ],
  },
  test: {
    // Punto de entrada único (`npm test`): los tests de cada feature viven en su carpeta
    // y `tests/` aporta los del proyecto y los ayudantes compartidos (`tests/helpers`).
    include: ["tests/**/*.test.ts", "app/features/*/tests/**/*.test.ts", "app/shared/tests/**/*.test.ts"],
    environment: "node",
    // Pruebas sin red (F0, regla 32): `fetch` y `net.connect` lanzan «Red prohibida en pruebas».
    setupFiles: ["tests/setup/no-network.ts"],
    // Cobertura de la lógica de negocio (servicios, repositorios y lo compartido del servidor).
    // Si baja del 80 %, `npm test` (y por tanto `npm run check`) falla.
    coverage: {
      provider: "v8",
      include: ["app/features/*/server/**/*.ts", "app/shared/server/**/*.ts", "app/features/*/schema.ts"],
      exclude: ["**/*.test.ts", "**/repository.firestore.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
