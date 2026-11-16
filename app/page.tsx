import { Suspense } from "react";
import { HomeSession } from "./_components/home-session";

interface Area {
  title: string;
  text: string;
}

const AREAS: Area[] = [
  { title: "Cuentas", text: "Registrarse, ingresar y que cada persona vea solo sus deseos." },
  {
    title: "Deseos",
    text: "Guardar productos con el enlace de la tienda y el precio, editarlos, priorizarlos y marcarlos como comprados.",
  },
  { title: "Listas", text: "Organizar los deseos por categorías, ver el total y fijar una meta de ahorro." },
];

export default function HomePage() {
  return (
    <article>
      <header className="rounded-lg bg-primary-strong p-6 text-surface md:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide">Proyecto final de semestre</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Lista de deseos</h1>
        <p className="mt-4 max-w-[70ch] text-lg">
          Guarda lo que quieres comprar con el enlace de la tienda y el precio, organízalo en listas y mira cuánto suma
          todo.
        </p>
      </header>

      <Suspense fallback={<div aria-hidden="true" className="mt-10 min-h-24" />}>
        <HomeSession />
      </Suspense>

      <section aria-labelledby="areas" className="mt-10">
        <h2 id="areas" className="text-2xl font-bold text-primary-strong">
          Qué vas a poder hacer
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {AREAS.map((area) => (
            <li key={area.title}>
              <article className="h-full rounded-lg border border-line bg-surface-alt p-4">
                <h3 className="text-lg font-semibold text-primary-strong">{area.title}</h3>
                <p className="mt-1 text-ink-muted">{area.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
