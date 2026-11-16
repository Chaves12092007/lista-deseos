import "server-only";
import { getSession } from "@/shared/server/session-next";

/** Texto que se muestra si la sesión no trae correo (no debería pasar: las cuentas se crean con correo). */
const MISSING_EMAIL_LABEL = "tu cuenta";

/**
 * Correo de la sesión actual, o `null` sin sesión. Lee `cookies()`: úsalo dentro de `<Suspense>`.
 * Con `null` la interfaz se muestra sin sesión y la cookie no se toca (R2, regla 20).
 */
export async function getSessionEmail(): Promise<string | null> {
  const session = await getSession();
  if (session === null) {
    return null;
  }
  if (session.email === null) {
    return MISSING_EMAIL_LABEL;
  }
  return session.email;
}
