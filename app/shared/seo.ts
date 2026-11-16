import type { Metadata } from "next";

/** Datos del sitio y metadatos compartidos (SEO básico y Open Graph). Sin reglas de negocio. */

export const SITE_NAME = "Lista de deseos";
export const SITE_DESCRIPTION =
  "Guarda lo que quieres comprar con el enlace de la tienda y el precio, ordénalo por prioridad o precio y mira cuánto suma lo pendiente.";

const LOCAL_URL = "http://localhost:3000";

/** URL pública del sitio: en Vercel, el dominio de producción; en local, `localhost`. */
export function getSiteUrl(): URL {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (host === undefined || host === "") {
    return new URL(LOCAL_URL);
  }
  return new URL(`https://${host}`);
}

interface PageSeo {
  title: string;
  description: string;
  path: string;
}

/**
 * Metadatos de una página con Open Graph. `openGraph` de una página reemplaza al del layout (no se mezclan),
 * por eso se repiten aquí el nombre del sitio, el idioma y el tipo.
 */
export function pageMetadata({ title, description, path }: PageSeo): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "es_CO",
      type: "website",
    },
  };
}
