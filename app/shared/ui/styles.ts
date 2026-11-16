/** Clases compartidas de botones y enlaces con forma de botón (paleta y 44 px de docs/frontend-rules.md). */

export const PRIMARY_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-5 font-semibold text-surface no-underline hover:bg-primary-hover hover:text-surface disabled:cursor-not-allowed disabled:bg-primary-hover";

export const SECONDARY_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border-2 border-control-border bg-surface px-5 font-semibold text-primary-strong no-underline hover:bg-surface-strong hover:text-primary-strong";

/** Acción destructiva confirmada (borde y texto `danger` sobre `surface`, contraste 6,47). */
export const DANGER_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-danger px-5 font-semibold text-surface hover:underline disabled:cursor-not-allowed";

export const DANGER_OUTLINE_BUTTON_CLASS =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border-2 border-danger bg-surface px-5 font-semibold text-danger hover:bg-surface-alt";
