"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Botón «Cerrar sesión» (reglas 16–19). Solo `DELETE /api/session` borra la cookie (R2). */

export const SIGN_OUT_FAILED_MESSAGE = "No pudimos cerrar la sesión. Intenta de nuevo.";

const SESSION_ENDPOINT = "/api/session";
const SESSION_CLEARED_STATUS = 204;

async function endSession(): Promise<boolean> {
  try {
    const response = await fetch(SESSION_ENDPOINT, { method: "DELETE" });
    return response.status === SESSION_CLEARED_STATUS;
  } catch {
    return false;
  }
}

function buttonText(pending: boolean): string {
  if (pending) {
    return "Cerrando sesión…";
  }
  return "Cerrar sesión";
}

function SignOutError({ failed }: { failed: boolean }) {
  if (!failed) {
    return null;
  }
  return (
    <p role="alert" className="rounded-md bg-surface px-2 py-1 text-danger">
      {SIGN_OUT_FAILED_MESSAGE}
    </p>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick(): Promise<void> {
    setPending(true);
    setFailed(false);
    const cleared = await endSession();
    if (!cleared) {
      setPending(false);
      setFailed(true);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 md:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border-2 border-surface px-4 font-semibold text-surface hover:bg-primary-hover disabled:cursor-not-allowed"
      >
        {buttonText(pending)}
      </button>
      <SignOutError failed={failed} />
    </div>
  );
}
