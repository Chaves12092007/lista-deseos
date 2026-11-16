/**
 * Campo de texto accesible: `<label>` visible, error por campo con `role="alert"` enlazado con
 * `aria-describedby` (docs/frontend-rules.md, sección 3).
 */

interface TextFieldProps {
  id: string;
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  error: string | undefined;
  className?: string;
}

function describedBy(error: string | undefined, errorId: string): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  return errorId;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) {
    return null;
  }
  return (
    <p id={id} role="alert" className="text-danger">
      {message}
    </p>
  );
}

export function TextField({ id, name, label, type, autoComplete, error, className = "" }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(error, errorId)}
        className="min-h-11 w-full rounded-md border-2 border-control-border bg-surface px-3 text-ink"
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
