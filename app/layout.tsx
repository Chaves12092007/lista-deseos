import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lista de deseos",
  description: "Proyecto final de semestre: lista de deseos con enlaces y precios",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col bg-surface text-ink">
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <main id="contenido" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
