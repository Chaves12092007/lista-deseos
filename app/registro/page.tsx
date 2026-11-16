import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RegisterForm } from "@/features/accounts/ui/register-form";
import { RedirectIfSignedIn } from "../_components/redirect-if-signed-in";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-md md:max-w-2xl">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-3xl font-bold text-primary-strong">Crear cuenta</h1>
      <p className="mt-2 text-ink-muted">Crea tu cuenta con tu correo y una contraseña de al menos 8 caracteres.</p>
      <RegisterForm />
      <p className="mt-6">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-semibold">
          Ingresa
        </Link>
      </p>
    </div>
  );
}
