import type { Wish, WishOrder } from "../schema";
import { formatCop } from "./format";
import { OrderLinks } from "./order-links";
import { WishForm } from "./wish-form";
import { WishItem } from "./wish-item";

/** Contenido de «Mi lista» (F5, F19): formulario para agregar, total de pendientes, orden y la lista. */

interface WishesBoardProps {
  wishes: Wish[];
  totalPendingCop: number;
  order: WishOrder;
}

function WishList({ wishes }: { wishes: Wish[] }) {
  if (wishes.length === 0) {
    return <p className="mt-4 text-ink-muted">Aún no tienes deseos. Agrega el primero.</p>;
  }
  return (
    <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {wishes.map((wish) => (
        <WishItem key={`${wish.id}-${wish.updated_at}`} wish={wish} />
      ))}
    </ul>
  );
}

export function WishesBoard({ wishes, totalPendingCop, order }: WishesBoardProps) {
  return (
    <>
      <section aria-labelledby="agregar" className="mt-6 rounded-lg border border-line bg-surface-alt p-4 md:p-6">
        <h2 id="agregar" className="text-2xl font-bold text-primary-strong">
          Agregar un deseo
        </h2>
        <WishForm idPrefix="nuevo" submitLabel="Agregar deseo" />
      </section>
      <section aria-labelledby="tus-deseos" className="mt-8">
        <h2 id="tus-deseos" className="text-2xl font-bold text-primary-strong">
          Tus deseos
        </h2>
        <p role="status" className="mt-2 text-lg">
          Total pendiente: <strong>{formatCop(totalPendingCop)}</strong>
        </p>
        <OrderLinks current={order} />
        <WishList wishes={wishes} />
      </section>
    </>
  );
}
