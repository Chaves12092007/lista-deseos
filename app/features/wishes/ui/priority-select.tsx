/** Selector de prioridad accesible: `<label>` visible y error con `role="alert"` enlazado con `aria-describedby`. */

interface PrioritySelectProps {
  id: string;
  error: string | undefined;
  defaultValue: string;
}

const OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

function describedBy(error: string | undefined, errorId: string): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  return errorId;
}

export function PrioritySelect({ id, error, defaultValue }: PrioritySelectProps) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold text-ink">
        Prioridad
      </label>
      <select
        id={id}
        name="priority"
        defaultValue={defaultValue}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(error, errorId)}
        className="min-h-11 w-full rounded-md border-2 border-control-border bg-surface px-3 text-ink"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
