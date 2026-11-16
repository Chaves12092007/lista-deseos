import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Páginas públicas: la ruta inexistente debe responder 404 y seguir siendo accesible. */
const PAGES = [
  { name: "inicio", path: "/", status: 200 },
  { name: "ingresar", path: "/ingresar", status: 200 },
  { name: "registro", path: "/registro", status: 200 },
  { name: "404", path: "/esta-ruta-no-existe", status: 404 },
];

const WIDTHS = [360, 768, 1024];
const VIEWPORT_HEIGHT = 800;

for (const { name, path, status } of PAGES) {
  for (const width of WIDTHS) {
    test.describe(`${name} a ${width}px`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
        const response = await page.goto(path);
        expect(response?.status()).toBe(status);
      });

      test("no tiene scroll horizontal", async ({ page }) => {
        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
      });

      test("0 violaciones de axe (wcag2a y wcag2aa)", async ({ page }) => {
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(results.violations).toEqual([]);
      });
    });
  }
}
