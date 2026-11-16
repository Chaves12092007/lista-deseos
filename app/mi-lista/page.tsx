import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/shared/seo";
import { MyWishes } from "../_components/my-wishes";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Mi lista",
    description: "Tus deseos con su tienda, precio y prioridad, y cuánto suma lo pendiente.",
    path: "/mi-lista",
  }),
  // Página privada: no se indexa (tampoco está en el sitemap).
  robots: { index: false, follow: false },
};

export default function MyListPage({ searchParams }: PageProps<"/mi-lista">) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary-strong">Mi lista</h1>
      <Suspense
        fallback={
          <p role="status" className="mt-6 text-ink-muted">
            Cargando tu lista…
          </p>
        }
      >
        <MyWishes searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
