import { SiteNav } from "@/features/accounts/ui/site-nav";
import { getSessionEmail } from "./session-email";

/** Barra con la sesión de la cookie. Va dentro de `<Suspense>` (Cache Components). */
export async function SessionNav() {
  return <SiteNav email={await getSessionEmail()} />;
}
