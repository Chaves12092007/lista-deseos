import type { Metadata } from "next";
import { Suspense } from "react";
import { MyWishes } from "../_components/my-wishes";

export const metadata: Metadata = {
  title: "Mi lista",
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
