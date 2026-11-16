import { FirebaseAuthError } from "firebase-admin/auth";
import type { CreateRequest, UserRecord } from "firebase-admin/auth";
import { describe, expect, it } from "vitest";
import { EMAIL_TAKEN_MESSAGE } from "@/features/accounts/schema";
import { createFirebaseAccountAuth } from "@/features/accounts/server/auth-port.firebase";
import type { AdminAccountAuth } from "@/features/accounts/server/auth-port.firebase";
import { ConflictError } from "@/shared/server/errors";

/** Usuario que devolvería Firebase (literal que cumple el tipo del SDK, sin `as`). */
const CREATED_USER: UserRecord = {
  uid: "uid-ana",
  email: "ana@x.com",
  emailVerified: false,
  disabled: false,
  metadata: { creationTime: "", lastSignInTime: "", toJSON: () => ({}) },
  providerData: [],
  toJSON: () => ({}),
};

/** Doble de Firebase Admin Auth (solo createUser y revokeRefreshTokens): registra y puede fallar. */
class FakeAdminAccountAuth implements AdminAccountAuth {
  readonly created: CreateRequest[] = [];
  readonly revoked: string[] = [];
  private failure: Error | undefined = undefined;

  failWith(error: Error): void {
    this.failure = error;
  }

  async createUser(properties: CreateRequest): Promise<UserRecord> {
    this.created.push(properties);
    this.throwIfFailing();
    return CREATED_USER;
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    this.revoked.push(uid);
    this.throwIfFailing();
  }

  private throwIfFailing(): void {
    if (this.failure !== undefined) {
      throw this.failure;
    }
  }
}

/** `FirebaseAuthError` agrega el prefijo `auth/`: se construye con el código sin prefijo. */
function firebaseAuthError(codeWithoutPrefix: string): FirebaseAuthError {
  return new FirebaseAuthError({ code: codeWithoutPrefix, message: "Error de prueba" });
}

function setup() {
  const admin = new FakeAdminAccountAuth();
  let getAuthCalls = 0;
  const port = createFirebaseAccountAuth(() => {
    getAuthCalls += 1;
    return admin;
  });
  return { admin, port, getAuthCalls: () => getAuthCalls };
}

describe("Adaptador de Cuentas con Firebase Admin", () => {
  it("no pide el cliente de Firebase hasta que se usa (perezoso)", () => {
    const context = setup();
    expect(context.getAuthCalls()).toBe(0);
  });

  it("el doble arma el código con el prefijo auth/", () => {
    expect(firebaseAuthError("email-already-exists").code).toBe("auth/email-already-exists");
  });

  it("crear la cuenta pasa a Firebase el correo y la contraseña", async () => {
    const context = setup();
    await context.port.createUser({ email: "ana@x.com", password: " 1234567" });
    expect(context.admin.created).toEqual([{ email: "ana@x.com", password: " 1234567" }]);
    expect(context.getAuthCalls()).toBeGreaterThanOrEqual(1);
  });

  it("un correo ya registrado se traduce a conflicto «Ya existe una cuenta con ese correo.»", async () => {
    const context = setup();
    context.admin.failWith(firebaseAuthError("email-already-exists"));
    const attempt = context.port.createUser({ email: "ana@x.com", password: "12345678" });
    await expect(attempt).rejects.toBeInstanceOf(ConflictError);
    await expect(attempt).rejects.toThrow(EMAIL_TAKEN_MESSAGE);
  });

  it("otro error de Firebase al crear se relanza sin cambios (mismo objeto)", async () => {
    const context = setup();
    const failure = firebaseAuthError("internal-error");
    context.admin.failWith(failure);
    await expect(context.port.createUser({ email: "ana@x.com", password: "12345678" })).rejects.toBe(failure);
  });

  it("un error cualquiera al crear se relanza sin cambios (mismo objeto)", async () => {
    const context = setup();
    const failure = new Error("red caída");
    context.admin.failWith(failure);
    await expect(context.port.createUser({ email: "ana@x.com", password: "12345678" })).rejects.toBe(failure);
  });

  it("revocar las sesiones pasa el uid a Firebase", async () => {
    const context = setup();
    await context.port.revokeSessions("uid-ana");
    expect(context.admin.revoked).toEqual(["uid-ana"]);
    expect(context.getAuthCalls()).toBeGreaterThanOrEqual(1);
  });

  it("si revocar falla, el error se relanza sin cambios", async () => {
    const context = setup();
    const failure = firebaseAuthError("user-not-found");
    context.admin.failWith(failure);
    await expect(context.port.revokeSessions("uid-ana")).rejects.toBe(failure);
  });
});
