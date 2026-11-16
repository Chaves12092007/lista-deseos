import { redirect } from "next/navigation";
import { getSession } from "@/shared/server/session-next";

/** Con sesión, `/registro` e `/ingresar` llevan a `/` (regla 26). Va dentro de `<Suspense>`. No pinta nada. */
export async function RedirectIfSignedIn() {
  const session = await getSession();
  if (session !== null) {
    redirect("/");
  }
  return null;
}
