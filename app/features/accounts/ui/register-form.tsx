"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import type { ErrorFields } from "@/shared/schema";
import { FormAlert } from "@/shared/ui/form-alert";
import { readTextField } from "@/shared/ui/form-data";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";
import type { RegisterAccountInput } from "../schema";
import { submitRegistration } from "./register-request";

interface FormState {
  pending: boolean;
  fields: ErrorFields;
  message: string | null;
}

const IDLE: FormState = { pending: false, fields: {}, message: null };
const PENDING: FormState = { pending: true, fields: {}, message: null };
const ACCOUNT_CREATED_LOGIN_PATH = "/ingresar?cuenta=creada";

function readInput(form: HTMLFormElement): RegisterAccountInput {
  return {
    email: readTextField(form, "email"),
    password: readTextField(form, "password"),
    password_confirmation: readTextField(form, "password_confirmation"),
  };
}

/** Formulario «Crear cuenta» (F1, reglas 9 y 28). */
export function RegisterForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(IDLE);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setState(PENDING);
    const outcome = await submitRegistration(readInput(event.currentTarget));
    if (outcome.kind === "error") {
      setState({ pending: false, fields: outcome.fields, message: outcome.message });
      return;
    }
    if (outcome.kind === "created") {
      router.push(ACCOUNT_CREATED_LOGIN_PATH);
      return;
    }
    router.push("/mi-lista");
    router.refresh();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
      <RegisterFields fields={state.fields} />
      <div className="flex flex-col gap-4 md:col-span-2">
        <FormAlert message={state.message} />
        <SubmitButton pending={state.pending} label="Crear cuenta" pendingLabel="Creando cuenta…" />
      </div>
    </form>
  );
}

function RegisterFields({ fields }: { fields: ErrorFields }) {
  return (
    <>
      <TextField
        id="registro-email"
        name="email"
        label="Correo"
        type="email"
        autoComplete="email"
        error={fields.email}
        className="md:col-span-2"
      />
      <TextField
        id="registro-password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        error={fields.password}
      />
      <TextField
        id="registro-password-confirmation"
        name="password_confirmation"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        error={fields.password_confirmation}
      />
    </>
  );
}
