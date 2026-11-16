import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyWishes } from "@/_components/my-wishes";
import type { WishService } from "@/features/wishes/server/wish-service";

const service = vi.hoisted(() => ({
  create: vi.fn<WishService["create"]>(),
  list: vi.fn<WishService["list"]>(),
  update: vi.fn<WishService["update"]>(),
  remove: vi.fn<WishService["remove"]>(),
}));
const session = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<{ uid: string; email: string | null } | null>>(),
  clearSession: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/features/container", () => ({ getWishService: () => service }));
vi.mock("@/shared/server/session-next", () => session);
vi.mock("next/navigation", () => ({
  redirect: (url: string): never => {
    throw new Error(`REDIRECT:${url}`);
  },
  useRouter: vi.fn(),
}));

beforeEach(() => {
  service.list.mockReset();
  session.getSession.mockReset();
  session.clearSession.mockReset();
  service.list.mockResolvedValue({ wishes: [], total_pending_cop: 0 });
  session.getSession.mockResolvedValue({ uid: "uid-ana", email: "ana@x.com" });
});

describe("/mi-lista: sesión (regla 32)", () => {
  it("sin sesión redirige a /ingresar, no lee deseos y no borra la cookie", async () => {
    session.getSession.mockResolvedValue(null);
    await expect(MyWishes({ searchParams: Promise.resolve({}) })).rejects.toThrow("REDIRECT:/ingresar");
    expect(service.list).not.toHaveBeenCalled();
    expect(session.clearSession).not.toHaveBeenCalled();
  });
});

describe("/mi-lista: ?orden (regla 18)", () => {
  it("lee los deseos del uid de la sesión con el orden pedido", async () => {
    await MyWishes({ searchParams: Promise.resolve({ orden: "precio-asc" }) });
    expect(service.list).toHaveBeenCalledWith("uid-ana", "precio-asc");
  });

  it.each([{}, { orden: "xyz" }, { orden: "" }, { orden: ["precio-asc", "precio-desc"] }])(
    "con %j se ordena por prioridad",
    async (params) => {
      await MyWishes({ searchParams: Promise.resolve(params) });
      expect(service.list).toHaveBeenCalledWith("uid-ana", "prioridad");
    },
  );
});
