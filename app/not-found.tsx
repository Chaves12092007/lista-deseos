import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
  description: "La página que buscas no existe o cambió de lugar.",
};

export default function NotFound() {
  return (
    <section aria-labelledby="no-encontrada" className="mx-auto w-full max-w-md">
      <h1 id="no-encontrada" className="text-3xl font-bold text-primary-strong">
        Página no encontrada
      </h1>
      <p className="mt-2 text-ink-muted">La página que buscas no existe o cambió de lugar.</p>
      <p className="mt-6">
        <Link href="/" className="font-semibold">
          Volver al inicio
        </Link>
      </p>
    </section>
  );
}
