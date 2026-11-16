import Link from "next/link";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/shared/ui/styles";

/** Bloque del inicio que cambia con la sesión (F18, regla 24; con sesión, regla 42 de Mi lista). Recibe el correo por props. */
export function HomeWelcome({ email }: { email: string | null }) {
  if (email === null) {
    return (
      <section aria-labelledby="empezar" className="mt-10">
        <h2 id="empezar" className="text-2xl font-bold text-primary-strong">
          Empieza ahora
        </h2>
        <ul className="mt-4 flex flex-col gap-3 md:flex-row">
          <li>
            <Link href="/registro" className={`${PRIMARY_BUTTON_CLASS} w-full md:w-auto`}>
              Crear cuenta
            </Link>
          </li>
          <li>
            <Link href="/ingresar" className={`${SECONDARY_BUTTON_CLASS} w-full md:w-auto`}>
              Ingresar
            </Link>
          </li>
        </ul>
      </section>
    );
  }
  return (
    <section aria-labelledby="bienvenida" className="mt-10">
      <h2 id="bienvenida" className="text-2xl font-bold break-all text-primary-strong">
        Hola, {email}
      </h2>
      <p className="mt-4">
        <Link href="/mi-lista" className={PRIMARY_BUTTON_CLASS}>
          Ver mi lista
        </Link>
      </p>
    </section>
  );
}
