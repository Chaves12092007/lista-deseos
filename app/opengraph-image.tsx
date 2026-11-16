import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/shared/seo";

/**
 * Imagen Open Graph de todo el sitio (1200×630). ImageResponse no lee `globals.css`, así que los colores
 * son los valores de los tokens `primary-strong` y `surface` (docs/frontend-rules.md, sección 3), con
 * contraste 10,36:1.
 */

export const alt = `${SITE_NAME}: ${SITE_DESCRIPTION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PRIMARY_STRONG = "#1e3a8a";
const SURFACE = "#ffffff";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: PRIMARY_STRONG,
        color: SURFACE,
      }}
    >
      <h1 style={{ fontSize: 128, fontWeight: 700, margin: 0 }}>{SITE_NAME}</h1>
      <p style={{ fontSize: 40, lineHeight: 1.4, margin: "32px 0 0", maxWidth: 960 }}>
        Guarda lo que quieres comprar con su tienda y su precio, y mira cuánto suma lo pendiente.
      </p>
    </div>,
    { ...size },
  );
}
