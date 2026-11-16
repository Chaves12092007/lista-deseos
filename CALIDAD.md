# Calidad web — evidencias

Evidencias en la carpeta [`calidad/`](calidad/). Todo se puede demostrar en vivo sobre la URL de producción: <https://lista-deseos-zeta.vercel.app>.

## 1. Lighthouse (móvil y escritorio, URL de producción en Vercel)

Medido con **PageSpeed Insights** (Lighthouse en los servidores de Google) el 2026-11-16. Primero lo corrí en el Lighthouse de Chrome desde mi equipo, pero salía el aviso _«The page loaded too slowly to finish within the time limit»_ por la lentitud del equipo (87–89 en rendimiento), así que tomé PageSpeed Insights como medición de referencia (captura `lighthouse-local-inicio-mobile.png`).

| Página      | Tipo           | Rendimiento | Accesibilidad | Buenas prácticas | SEO | Informe                                                                                                |
| ----------- | -------------- | ----------- | ------------- | ---------------- | --- | ------------------------------------------------------------------------------------------------------ |
| `/`         | Pública        | 100         | 100           | 100              | 100 | [PageSpeed](https://pagespeed.web.dev/analysis/https-lista-deseos-zeta-vercel-app/qja5hah6pz)          |
| `/ingresar` | Con formulario | 100         | 100           | 100              | 100 | [PageSpeed](https://pagespeed.web.dev/analysis/https-lista-deseos-zeta-vercel-app-ingresar/r9x9jxgugm) |
| `/mi-lista` | Con sesión     | COMPLETAR   | COMPLETAR     | COMPLETAR        | —   | Lighthouse de Chrome, escritorio, con sesión (`calidad/capturas/lighthouse-mi-lista.png`)              |

Los valores de la tabla son los de **móvil**; en escritorio los dos informes también dan 100 (pestaña «Escritorio» del mismo enlace). `/mi-lista` no se puede medir en PageSpeed porque exige sesión; es una página privada, por eso no se evalúa SEO.

Metas: Rendimiento ≥ 90 · Accesibilidad ≥ 95 · Buenas prácticas ≥ 95 · SEO ≥ 95. ✅

## 2. Core Web Vitals (móvil)

La app es nueva y no tiene tráfico suficiente para datos de campo (p75 de CrUX), así que se reportan los datos de laboratorio de PageSpeed Insights. INP no se mide en laboratorio; su indicador es el **TBT** (Total Blocking Time).

| Métrica     | Meta     | `/`   | `/ingresar` | Qué hice para lograrla                                                                                                                               |
| ----------- | -------- | ----- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| LCP         | ≤ 2,5 s  | 1,1 s | 0,8 s       | Partial Prerender: el HTML estático sale del CDN de Vercel y solo la parte con sesión se transmite después; sin imágenes pesadas ni fuentes externas |
| INP (≈ TBT) | ≤ 200 ms | 0 ms  | 20 ms       | Casi todo son componentes de servidor; el JavaScript del cliente se limita a los formularios; React Compiler activado                                |
| CLS         | ≤ 0,1    | 0     | 0           | Sin contenido que cargue tarde y empuje el resto; tamaños fijos en la imagen Open Graph; mensajes de error en espacio reservado                      |

Capturas: `psi-inicio-movil-metricas.png`, `psi-inicio-escritorio-metricas.png`, `psi-ingresar-movil-metricas.png`.

## 3. Responsive (360 · 768 · 1024 px)

- **Automatizado:** `npm run test:e2e` (Playwright) abre `/`, `/ingresar`, `/registro` y una ruta 404 a 360, 768 y 1024 px y comprueba que **no haya scroll horizontal** (`scrollWidth <= clientWidth`). Resultado: **24/24 en verde** (captura `e2e-playwright-axe.png`).
- **A 360 px** la barra muestra el botón **«Menú»**, un `<details>`/`<summary>` que se abre y se cierra con el teclado, sin JavaScript (se ve en la vista previa de PageSpeed).
- Diseño mobile-first con Tailwind: los enlaces de la barra se muestran en línea desde `md:` (768 px).

## 4. Accesibilidad (WCAG 2.2 AA)

- **axe:** 0 violaciones con las reglas `wcag2a` y `wcag2aa` en las 4 páginas públicas y los 3 anchos (`tests/e2e/public-pages.spec.ts`, captura `e2e-playwright-axe.png`). Lighthouse: 100 en accesibilidad.
- **Contraste:** `tests/project/palette-contrast.test.ts` calcula la razón de contraste de cada par de colores de la paleta, en claro y en oscuro (≥ 4,5:1 para texto, ≥ 3:1 para bordes de controles). En la prueba manual encontré el correo de la barra con poco contraste en modo oscuro; lo corregí (blanco sobre `#1e3a8a`, 10,36:1) y agregué el par a la prueba (commit `fix: contraste del correo en la barra de navegación (wcag aa)`).
- **Validador HTML del W3C:** _«Document checking completed. No errors or warnings to show.»_ en `/`. Aparecen 26 mensajes de tipo **Info** por la barra final en elementos vacíos (`<meta … />`), que genera React/Next.js al producir el HTML; no son errores ni advertencias y no afectan la validez (capturas `w3c-inicio-1.png`, `w3c-inicio-2.png`).
- **Comprobación manual (2026-11-16, en producción):**
  - Teclado ☑: recorrí `/mi-lista` solo con Tab, Enter y Esc; el foco siempre es visible, se agrega un deseo con Enter, el `<dialog>` de eliminar se abre con Enter y se cierra con Esc sin borrar, y el menú de 360 px funciona con teclado.
  - Zoom 200 % ☑ COMPLETAR (o quitar si no se hizo)
  - Lector de pantalla ☐ (no alcancé a hacerlo; queda como trabajo futuro)
- Otras decisiones: HTML semántico (`<header>`, `<nav>`, `<main>`, `<footer>`, `<dialog>` nativo), `lang="es"`, `<label>` en todos los campos y `prefers-reduced-motion` respetado.

## 5. Retos de excelencia elegidos

1. **Modo oscuro** que respeta `prefers-color-scheme`, con la misma identidad azul de la versión clara.
   - Evidencia: tokens oscuros en `app/globals.css`; prueba de contraste de los pares oscuros en `tests/project/palette-contrast.test.ts`.
   - Cómo reproducirlo: en Chrome, F12 → ⋮ → More tools → Rendering → `prefers-color-scheme: dark`, o poner el sistema operativo en modo oscuro.
2. **SEO completo e impresión.**
   - Evidencia: `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx` (imagen para compartir, 1200 × 630), datos estructurados JSON-LD (`app/_components/json-ld.tsx`), metadatos Open Graph y Twitter, URL canónica, página 404 propia (`app/not-found.tsx`), cabeceras de seguridad en `next.config.ts` y estilos `@media print` en `app/globals.css` (la lista se imprime limpia, sin barra ni botones). SEO 100 en Lighthouse.
   - Cómo reproducirlo: abrir `/robots.txt`, `/sitemap.xml` y `/opengraph-image`; Ctrl+P en `/mi-lista`.
3. **Pruebas e2e con Playwright + axe.**
   - Evidencia: `tests/e2e/public-pages.spec.ts` y `playwright.config.ts`; 24/24 en verde (captura `e2e-playwright-axe.png`).
   - Cómo reproducirlo: `npx playwright install chromium` y `npm run test:e2e` (por defecto contra producción; otra URL con `E2E_BASE_URL`). No está en `npm run check` ni en el CI porque necesita un navegador y red.
