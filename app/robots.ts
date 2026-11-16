import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/shared/seo";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/mi-lista", "/api/"] },
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
