import { HomeWelcome } from "@/features/accounts/ui/home-welcome";
import { getSessionEmail } from "./session-email";

/** Bloque del inicio según la sesión. Va dentro de `<Suspense>` (Cache Components). */
export async function HomeSession() {
  return <HomeWelcome email={await getSessionEmail()} />;
}
