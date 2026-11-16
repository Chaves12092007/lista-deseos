import { PRIMARY_BUTTON_CLASS } from "./styles";

interface SubmitButtonProps {
  pending: boolean;
  label: string;
  pendingLabel: string;
}

function buttonText({ pending, label, pendingLabel }: SubmitButtonProps): string {
  if (pending) {
    return pendingLabel;
  }
  return label;
}

/** Botón de enviar: deshabilitado y con otro texto mientras se envía (regla 28). */
export function SubmitButton(props: SubmitButtonProps) {
  return (
    <button type="submit" disabled={props.pending} className={`${PRIMARY_BUTTON_CLASS} w-full md:w-auto`}>
      {buttonText(props)}
    </button>
  );
}
