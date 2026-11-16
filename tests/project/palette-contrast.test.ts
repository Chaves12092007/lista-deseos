import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../helpers/contrast";

/**
 * Se escribe desde docs/frontend-rules.md, sección 3 (paleta, tokens y tabla de contrastes),
 * y se compara contra lo que realmente define app/globals.css.
 */

const CSS_PATH = join(__dirname, "..", "..", "app", "globals.css");
const css = readFileSync(CSS_PATH, "utf8");

/** Tabla «Token / Valor» de la sección 3. */
const DOCUMENTED_PALETTE: Record<string, string> = {
  surface: "#FFFFFF",
  "surface-alt": "#EFF6FF",
  "surface-strong": "#DBEAFE",
  ink: "#0F172A",
  "ink-muted": "#475569",
  primary: "#1D4ED8",
  "primary-hover": "#1E40AF",
  "primary-strong": "#1E3A8A",
  "primary-deep": "#172554",
  line: "#BFDBFE",
  "control-border": "#64748B",
  danger: "#B91C1C",
  success: "#15803D",
  warning: "#92400E",
};

type AllowedPair = { foreground: string; background: string; documented: number; minimum: number };

const TEXT_MINIMUM = 4.5;
const COMPONENT_MINIMUM = 3;

/** Tabla «Pares permitidos y su contraste»; «documented» es el valor que figura en la tabla. */
const ALLOWED_PAIRS: AllowedPair[] = [
  { foreground: "ink", background: "surface", documented: 17.85, minimum: TEXT_MINIMUM },
  { foreground: "ink", background: "surface-alt", documented: 16.4, minimum: TEXT_MINIMUM },
  { foreground: "ink", background: "surface-strong", documented: 14.63, minimum: TEXT_MINIMUM },
  { foreground: "ink-muted", background: "surface", documented: 7.58, minimum: TEXT_MINIMUM },
  { foreground: "ink-muted", background: "surface-alt", documented: 6.96, minimum: TEXT_MINIMUM },
  { foreground: "ink-muted", background: "surface-strong", documented: 6.21, minimum: TEXT_MINIMUM },
  { foreground: "primary", background: "surface", documented: 6.7, minimum: TEXT_MINIMUM },
  { foreground: "primary", background: "surface-alt", documented: 6.16, minimum: TEXT_MINIMUM },
  { foreground: "surface", background: "primary", documented: 6.7, minimum: TEXT_MINIMUM },
  { foreground: "surface", background: "primary-hover", documented: 8.72, minimum: TEXT_MINIMUM },
  { foreground: "surface", background: "primary-strong", documented: 10.36, minimum: TEXT_MINIMUM },
  { foreground: "surface", background: "primary-deep", documented: 14.69, minimum: TEXT_MINIMUM },
  { foreground: "primary-strong", background: "surface-strong", documented: 8.49, minimum: TEXT_MINIMUM },
  { foreground: "danger", background: "surface", documented: 6.47, minimum: TEXT_MINIMUM },
  { foreground: "success", background: "surface", documented: 5.02, minimum: TEXT_MINIMUM },
  { foreground: "warning", background: "surface", documented: 7.09, minimum: TEXT_MINIMUM },
  { foreground: "control-border", background: "surface", documented: 4.76, minimum: COMPONENT_MINIMUM },
  { foreground: "control-border", background: "surface-alt", documented: 4.37, minimum: COMPONENT_MINIMUM },
  { foreground: "primary", background: "surface", documented: 6.7, minimum: COMPONENT_MINIMUM },
  { foreground: "surface", background: "primary-strong", documented: 10.36, minimum: COMPONENT_MINIMUM },
];

/** Bloque del modo oscuro: desde su `@media` hasta la siguiente capa (`@layer base`). */
const DARK_BLOCK_PATTERN = /@media \(prefers-color-scheme: dark\)[\s\S]*?(?=@layer base)/;
const darkBlock = DARK_BLOCK_PATTERN.exec(css)?.[0] ?? "";
const lightCss = css.replace(DARK_BLOCK_PATTERN, "");

/** Lee todas las declaraciones `--color-<nombre>: <valor>;` del CSS,. */
function readColorDeclarations(source: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const match of source.matchAll(/--color-([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      declarations.set(name, value.trim());
    }
  }
  return declarations;
}

const declaredColors = readColorDeclarations(lightCss);
const darkColors = readColorDeclarations(darkBlock);

/** Valor hexadecimal de un token; falla con un mensaje claro si falta o no es un hexadecimal. */
function colorOf(token: string, colors: Map<string, string> = declaredColors): string {
  const value = colors.get(token);
  if (value === undefined || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`El token --color-${token} no está definido como #RRGGBB en globals.css (valor: ${String(value)})`);
  }
  return value;
}

function contrastOfTokens(
  foreground: string,
  background: string,
  colors: Map<string, string> = declaredColors,
): number {
  return contrastRatio(colorOf(foreground, colors), colorOf(background, colors));
}

describe("Paleta · los tokens de color de globals.css son exactamente los documentados", () => {
  it("define los 14 tokens de la paleta, ni más ni menos", () => {
    const declaredNames = [...declaredColors.keys()];
    expect(declaredNames.sort()).toEqual(Object.keys(DOCUMENTED_PALETTE).sort());
    expect(Object.keys(DOCUMENTED_PALETTE)).toHaveLength(14);
  });

  it.each(Object.entries(DOCUMENTED_PALETTE))("el token --color-%s vale %s", (token, hex) => {
    expect(colorOf(token).toUpperCase()).toBe(hex);
  });

  it("reinicia los colores de Tailwind con --color-*: initial para que no existan colores fuera de la paleta", () => {
    expect(css).toMatch(/--color-\*\s*:\s*initial\s*;/);
  });

  it("define el modo oscuro con prefers-color-scheme: dark", () => {
    expect(darkBlock).not.toBe("");
  });
});

describe("Paleta · modo oscuro: los mismos 14 tokens con valores oscuros", () => {
  it("redefine exactamente los mismos tokens que el modo claro", () => {
    expect([...darkColors.keys()].sort()).toEqual(Object.keys(DOCUMENTED_PALETTE).sort());
  });

  it.each(Object.keys(DOCUMENTED_PALETTE))("--color-%s tiene un valor #RRGGBB propio en oscuro", (token) => {
    expect(colorOf(token, darkColors)).not.toBe(colorOf(token));
  });

  it.each(ALLOWED_PAIRS)(
    "oscuro: $foreground sobre $background cumple el mínimo de $minimum:1",
    ({ foreground, background, minimum }) => {
      expect(contrastOfTokens(foreground, background, darkColors)).toBeGreaterThanOrEqual(minimum);
    },
  );

  it("oscuro: las combinaciones prohibidas siguen sin llegar al mínimo", () => {
    expect(contrastOfTokens("primary", "primary-strong", darkColors)).toBeLessThan(TEXT_MINIMUM);
    expect(contrastOfTokens("ink-muted", "primary-strong", darkColors)).toBeLessThan(TEXT_MINIMUM);
    expect(contrastOfTokens("line", "surface", darkColors)).toBeLessThan(COMPONENT_MINIMUM);
  });
});

describe("Movimiento e impresión · reglas del CSS", () => {
  it("respeta prefers-reduced-motion", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it("define @media print que oculta barra, botones y formularios", () => {
    const printBlock = /@media print[\s\S]*$/.exec(css)?.[0] ?? "";
    expect(printBlock).toMatch(/body > header/);
    expect(printBlock).toMatch(/\bform\b/);
    expect(printBlock).toMatch(/\bbutton\b/);
  });
});

describe("Paleta · contraste WCAG 2.2 AA de los pares permitidos", () => {
  it.each(ALLOWED_PAIRS)(
    "$foreground sobre $background cumple el mínimo de $minimum:1",
    ({ foreground, background, minimum }) => {
      expect(contrastOfTokens(foreground, background)).toBeGreaterThanOrEqual(minimum);
    },
  );

  it.each(ALLOWED_PAIRS)(
    "$foreground sobre $background coincide con el contraste documentado ($documented)",
    ({ foreground, background, documented }) => {
      expect(contrastOfTokens(foreground, background)).toBeCloseTo(documented, 1);
    },
  );
});

describe("Paleta · combinaciones prohibidas", () => {
  it("primary sobre primary-strong NO llega a 4,5:1, por eso no se usa para texto", () => {
    expect(contrastOfTokens("primary", "primary-strong")).toBeLessThan(TEXT_MINIMUM);
  });

  it("ink-muted sobre primary-strong NO llega a 4,5:1", () => {
    expect(contrastOfTokens("ink-muted", "primary-strong")).toBeLessThan(TEXT_MINIMUM);
  });

  it("line sobre surface no llega ni a 3:1, por eso solo sirve de línea decorativa y no de borde de campo", () => {
    expect(contrastOfTokens("line", "surface")).toBeLessThan(COMPONENT_MINIMUM);
  });
});

describe("Responsive · puntos de control del CSS", () => {
  it("no define los breakpoints sm, xl ni 2xl", () => {
    expect(css).not.toMatch(/--breakpoint-sm\s*:/);
    expect(css).not.toMatch(/--breakpoint-xl\s*:/);
    expect(css).not.toMatch(/--breakpoint-2xl\s*:/);
  });

  it("define md en 48rem (768 px) y lg en 64rem (1024 px)", () => {
    expect(css).toMatch(/--breakpoint-md\s*:\s*48rem\s*;/);
    expect(css).toMatch(/--breakpoint-lg\s*:\s*64rem\s*;/);
  });

  it("reinicia los breakpoints de Tailwind con --breakpoint-*: initial", () => {
    expect(css).toMatch(/--breakpoint-\*\s*:\s*initial\s*;/);
  });
});
