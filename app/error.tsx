"use client";

import type { ErrorInfo } from "next/error";
import { PRIMARY_BUTTON_CLASS } from "@/shared/ui/styles";

/** Error inesperado en una página (regla 29). No muestra detalles del error. */
export default function ErrorPage({ retry }: Pick<ErrorInfo, "retry">) {
  return (
    <section aria-labelledby="error-titulo" className="mx-auto w-full max-w-md">
      <h1 id="error-titulo" role="alert" className="text-2xl font-bold text-primary-strong">
        Ocurrió un error inesperado. Intenta de nuevo.
      </h1>
      <button type="button" onClick={() => retry()} className={`${PRIMARY_BUTTON_CLASS} mt-6 w-full md:w-auto`}>
        Reintentar
      </button>
    </section>
  );
}
