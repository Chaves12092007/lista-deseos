import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "./sign-out-button";

/**
 * Barra principal (F18, reglas 22 y 23). Bajo `md` los elementos (menos la marca) van en un `<details>`
 * plegable que funciona sin JavaScript; desde `md` se muestran en línea. Recibe el correo por props.
 */

const NAV_LINK_CLASS =
  "inline-flex min-h-11 min-w-11 items-center rounded-md px-2 font-semibold text-surface underline underline-offset-4 hover:text-surface hover:decoration-2";

function NavFrame({ children }: { children?: ReactNode }) {
  return (
    <nav aria-label="Principal" className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-2">
      <Link href="/" className={`${NAV_LINK_CLASS} text-lg`}>
        Lista de deseos
      </Link>
      {children}
    </nav>
  );
}

function NavItems({ email, className }: { email: string | null; className: string }) {
  if (email === null) {
    return (
      <ul className={className}>
        <li>
          <Link href="/ingresar" className={NAV_LINK_CLASS}>
            Ingresar
          </Link>
        </li>
        <li>
          <Link href="/registro" className={NAV_LINK_CLASS}>
            Registrarse
          </Link>
        </li>
      </ul>
    );
  }
  return (
    <ul className={className}>
      <li>
        <Link href="/mi-lista" className={NAV_LINK_CLASS}>
          Mi lista
        </Link>
      </li>
      <li className="px-2 break-all text-surface">{email}</li>
      <li>
        <SignOutButton />
      </li>
    </ul>
  );
}

export function SiteNav({ email }: { email: string | null }) {
  return (
    <NavFrame>
      <details className="relative md:hidden">
        <summary className="flex min-h-11 min-w-11 cursor-pointer items-center rounded-md border-2 border-surface px-3 font-semibold text-surface">
          Menú
        </summary>
        <NavItems
          email={email}
          className="absolute right-0 top-full z-10 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-md border-2 border-surface bg-primary-strong p-3 text-surface"
        />
      </details>
      <NavItems email={email} className="hidden items-center gap-4 text-surface md:flex" />
    </NavFrame>
  );
}

/** Barra mientras se lee la sesión o si leerla falla: solo la marca. */
export function SiteNavFallback() {
  return <NavFrame />;
}
