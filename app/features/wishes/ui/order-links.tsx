import Link from "next/link";
import type { WishOrder } from "../schema";

/** Enlaces para ordenar la lista con `?orden=` (F9, regla 21). El activo lleva `aria-current`. */

const OPTIONS: { value: WishOrder; label: string }[] = [
  { value: "prioridad", label: "Prioridad" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
];

const BASE_CLASS = "inline-flex min-h-11 min-w-11 items-center rounded-md px-4 font-semibold";
const ACTIVE_CLASS = `${BASE_CLASS} bg-primary-strong text-surface hover:text-surface`;
const INACTIVE_CLASS = `${BASE_CLASS} border-2 border-control-border text-primary-strong`;

function linkClass(active: boolean): string {
  if (active) {
    return ACTIVE_CLASS;
  }
  return INACTIVE_CLASS;
}

function currentValue(active: boolean): "true" | undefined {
  if (active) {
    return "true";
  }
  return undefined;
}

export function OrderLinks({ current }: { current: WishOrder }) {
  return (
    <nav aria-label="Ordenar deseos" className="mt-4">
      <ul className="flex flex-col gap-2 md:flex-row md:flex-wrap">
        {OPTIONS.map((option) => (
          <li key={option.value}>
            <Link
              href={`/mi-lista?orden=${option.value}`}
              aria-current={currentValue(option.value === current)}
              className={linkClass(option.value === current)}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
