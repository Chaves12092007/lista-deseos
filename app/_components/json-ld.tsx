import { SITE_DESCRIPTION, SITE_NAME, getSiteUrl } from "@/shared/seo";

/** Datos estructurados (JSON-LD) de la portada: describe el sitio como una aplicación web gratuita. */
export function WebApplicationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: getSiteUrl().toString(),
    inLanguage: "es",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "COP" },
  };
  // `<` escapado para que ningún texto pueda cerrar la etiqueta <script>.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
