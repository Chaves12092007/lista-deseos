import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/features/accounts/ui/login-form";
import { pageMetadata } from "@/shared/seo";
import { AccountCreatedNotice } from "../_components/account-created-notice";
import { RedirectIfSignedIn } from "../_components/redirect-if-signed-in";

export const metadata: Metadata = pageMetadata({
  title: "Ingresar",
  description: "Ingresa con tu correo y tu contraseña para ver y ordenar tu lista de deseos.",
  path: "/ingresar",
});

export default function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  return (
    <div className="mx-auto w-full max-w-md">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <h1 className="text-3xl font-bold text-primary-strong">Ingresar</h1>
      <Suspense fallback={null}>
        <AccountCreatedNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
      <p className="mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
