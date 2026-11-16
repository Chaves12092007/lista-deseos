import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteNavFallback } from "@/features/accounts/ui/site-nav";
import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/shared/seo";
import { NavErrorBoundary } from "./_components/nav-error-boundary";
import { SessionNav } from "./_components/session-nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col bg-surface text-ink">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <header className="bg-primary-strong text-surface">
          <NavErrorBoundary>
            <Suspense fallback={<SiteNavFallback />}>
              <SessionNav />
            </Suspense>
          </NavErrorBoundary>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="bg-primary-deep text-surface">
          <p className="mx-auto w-full max-w-5xl px-4 py-6">Lista de deseos · Proyecto final de semestre</p>
        </footer>
      </body>
    </html>
  );
}
