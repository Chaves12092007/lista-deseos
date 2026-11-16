/** Error general de un formulario, justo encima del botón de enviar. No muestra nada si no hay mensaje. */
export function FormAlert({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }
  return (
    <p role="alert" className="rounded-md border-2 border-danger bg-surface p-3 text-danger">
      {message}
    </p>
  );
}
