/**
 * Aviso de `/ingresar?cuenta=creada` (regla 9): texto fijo; el parámetro solo lo enciende.
 * Lee `searchParams`: va dentro de `<Suspense>` (Cache Components).
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const ACCOUNT_CREATED_NOTICE = "Tu cuenta se creó. Ingresa con tu correo y contraseña.";

export async function AccountCreatedNotice({ searchParams }: { searchParams: SearchParams }) {
  const { cuenta } = await searchParams;
  if (cuenta !== "creada") {
    return null;
  }
  return (
    <p role="status" className="mt-4 rounded-md border-2 border-success bg-surface p-3 text-success">
      {ACCOUNT_CREATED_NOTICE}
    </p>
  );
}
