import { redirect } from "next/navigation";
import { getWishService } from "@/features/container";
import { WishOrderSchema } from "@/features/wishes/schema";
import { WishesBoard } from "@/features/wishes/ui/wishes-board";
import { getSession } from "@/shared/server/session-next";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Lista de la persona con sesión (F5, F19; spec reglas 12 y 32). Sin sesión lleva a `/ingresar` sin tocar la
 * cookie (R2). El dueño sale de la sesión. Lee `cookies()` y `searchParams`: va dentro de `<Suspense>`.
 */
export async function MyWishes({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (session === null) {
    redirect("/ingresar");
  }
  const { orden } = await searchParams;
  const order = WishOrderSchema.parse(orden);
  const list = await getWishService().list(session.uid, order);
  return <WishesBoard wishes={list.wishes} totalPendingCop={list.total_pending_cop} order={order} />;
}
