import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/shared/seo";

/** Solo páginas públicas: `/mi-lista` es privada y no se lista. */
const PUBLIC_PATHS = ["/", "/ingresar", "/registro"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return PUBLIC_PATHS.map((path) => ({ url: new URL(path, base).toString() }));
}
