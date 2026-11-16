"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { ErrorFields } from "@/shared/schema";
import { FormAlert } from "@/shared/ui/form-alert";
import { fieldErrorsFromIssues, readTextField } from "@/shared/ui/form-data";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";
import { LoginFormSchema } from "../schema";
import { signInAndStartSession } from "./sign-in";

interface FormState {
  pending: boolean;
  fields: ErrorFields;
  message: string | null;
}

const IDLE: FormState = { pending: false, fields: {}, message: null };
const PENDING: FormState = { pending: true, fields: {}, message: null };

/** Formulario «Ingresar» (F2, reglas 12, 14, 15 y 28). La contraseña solo la ve Firebase Auth. */
export function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(IDLE);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = LoginFormSchema.safeParse({
      email: readTextField(form, "email"),
      password: readTextField(form, "password"),
    });
    if (!parsed.success) {
      setState({ pending: false, fields: fieldErrorsFromIssues(parsed.error.issues), message: null });
      return;
    }
    setState(PENDING);
    const result = await signInAndStartSession(parsed.data.email, parsed.data.password);
    if (!result.ok) {
      setState({ pending: false, fields: {}, message: result.message });
      return;
    }
    router.push("/mi-lista");
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <TextField
        id="ingreso-email"
        name="email"
        label="Correo"
        type="email"
        autoComplete="email"
        error={state.fields.email}
      />
      <TextField
        id="ingreso-password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
        error={state.fields.password}
      />
      <FormAlert message={state.message} />
      <SubmitButton pending={state.pending} label="Ingresar" pendingLabel="Ingresando…" />
    </form>
  );
}
