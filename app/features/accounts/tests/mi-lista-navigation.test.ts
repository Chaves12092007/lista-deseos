import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedirectIfSignedIn } from "@/_components/redirect-if-signed-in";
import { HomeWelcome } from "@/features/accounts/ui/home-welcome";

/** Cambios a Cuentas por la spec de Mi lista (reglas 40 a 42). */

const getSession = vi.hoisted(() => vi.fn<() => Promise<{ uid: string; email: string | null } | null>>());
const redirect = vi.hoisted(() =>
  vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  }),
);

vi.mock("@/shared/server/session-next", () => ({ getSession }));
vi.mock("next/navigation", () => ({ redirect }));

beforeEach(() => {
  getSession.mockReset();
  redirect.mockClear();
});

describe("Con sesión, /registro e /ingresar redirigen a /mi-lista (regla 40)", () => {
  it("redirige a /mi-lista", async () => {
    getSession.mockResolvedValue({ uid: "uid-ana", email: "ana@x.com" });
    await expect(RedirectIfSignedIn()).rejects.toThrow("REDIRECT:/mi-lista");
    expect(redirect).toHaveBeenCalledWith("/mi-lista");
  });

  it("sin sesión no redirige", async () => {
    getSession.mockResolvedValue(null);
    await expect(RedirectIfSignedIn()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("Inicio (regla 42)", () => {
  it("con sesión saluda y enlaza «Ver mi lista» a /mi-lista, sin el texto antiguo", () => {
    const html = renderToStaticMarkup(createElement(HomeWelcome, { email: "ana@x.com" }));
    expect(html).toContain("Hola, ana@x.com");
    expect(html).toContain('href="/mi-lista"');
    expect(html).toContain("Ver mi lista");
    expect(html).not.toContain("Pronto podrás agregar tus deseos aquí.");
  });

  it("sin sesión no ofrece «Ver mi lista»", () => {
    const html = renderToStaticMarkup(createElement(HomeWelcome, { email: null }));
    expect(html).not.toContain("Ver mi lista");
    expect(html).toContain('href="/registro"');
    expect(html).toContain('href="/ingresar"');
  });
});
