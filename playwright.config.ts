import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas e2e de las páginas públicas (npm run test:e2e). No arrancan la app: apuntan a una URL ya publicada.
 * Cambia el destino con la variable E2E_BASE_URL (por ejemplo, http://localhost:3000).
 */
const DEFAULT_BASE_URL = "https://lista-deseos-zeta.vercel.app";

export default defineConfig({
  testDir: "tests/e2e",
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
