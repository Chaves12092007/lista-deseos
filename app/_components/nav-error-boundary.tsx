"use client";

import { catchError } from "next/error";
import { SiteNavFallback } from "@/features/accounts/ui/site-nav";

/**
 * `app/error.tsx` no cubre el layout raíz. Si leer la sesión falla en la barra, la barra queda solo con la
 * marca; la página, que también lee la sesión, muestra `app/error.tsx` (regla 29).
 */
function NavErrorFallback() {
  return <SiteNavFallback />;
}

export const NavErrorBoundary = catchError(NavErrorFallback);
