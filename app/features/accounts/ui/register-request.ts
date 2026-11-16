import { ErrorBodySchema } from "@/shared/schema";
import type { ErrorFields } from "@/shared/schema";
import { fieldErrorsFromIssues } from "@/shared/ui/form-data";
import { RegisterAccountInputSchema, RegisterAccountOutputSchema } from "../schema";
import type { RegisterAccountInput } from "../schema";
import { signInAndStartSession } from "./sign-in";

/**
 * Flujo de registro en el navegador (reglas 1–9): validación previa sin red, `POST /api/accounts` y
 * ingreso automático. El servidor vuelve a validar todo.
 */

export const REGISTER_FAILED_MESSAGE = "No pudimos crear la cuenta. Intenta de nuevo.";

export type RegistrationOutcome =
  { kind: "signed-in" } | { kind: "created" } | { kind: "error"; fields: ErrorFields; message: string | null };

type CreateResult = { ok: true; email: string } | { ok: false; fields: ErrorFields; message: string | null };

const ACCOUNTS_ENDPOINT = "/api/accounts";
const CREATED_STATUS = 201;

function failure(fields: ErrorFields, message: string | null): CreateResult {
  return { ok: false, fields, message };
}

async function readCreated(response: Response): Promise<CreateResult> {
  const parsed = RegisterAccountOutputSchema.safeParse(await response.json());
  if (!parsed.success) {
    return failure({}, REGISTER_FAILED_MESSAGE);
  }
  return { ok: true, email: parsed.data.email };
}

async function readError(response: Response): Promise<CreateResult> {
  const parsed = ErrorBodySchema.safeParse(await response.json());
  if (!parsed.success) {
    return failure({}, REGISTER_FAILED_MESSAGE);
  }
  const fields = parsed.data.error.fields;
  if (fields !== undefined && Object.keys(fields).length > 0) {
    return failure(fields, null);
  }
  return failure({}, parsed.data.error.message);
}

async function createAccount(input: RegisterAccountInput): Promise<CreateResult> {
  try {
    const response = await fetch(ACCOUNTS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.status === CREATED_STATUS) {
      return await readCreated(response);
    }
    return await readError(response);
  } catch {
    return failure({}, REGISTER_FAILED_MESSAGE);
  }
}

export async function submitRegistration(input: RegisterAccountInput): Promise<RegistrationOutcome> {
  const local = RegisterAccountInputSchema.safeParse(input);
  if (!local.success) {
    return { kind: "error", fields: fieldErrorsFromIssues(local.error.issues), message: null };
  }
  const created = await createAccount(input);
  if (!created.ok) {
    return { kind: "error", fields: created.fields, message: created.message };
  }
  const signIn = await signInAndStartSession(created.email, input.password);
  if (!signIn.ok) {
    return { kind: "created" };
  }
  return { kind: "signed-in" };
}
