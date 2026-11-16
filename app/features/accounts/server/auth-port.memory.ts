import { EMAIL_TAKEN_MESSAGE } from "@/features/accounts/schema";
import { ConflictError } from "@/shared/server/errors";
import type { AccountAuthPort, NewAccount } from "./auth-port";

/** Doble en memoria de Firebase Auth para las pruebas de Cuentas: registra lo creado y lo revocado. */
export class InMemoryAccountAuth implements AccountAuthPort {
  readonly accounts: NewAccount[] = [];
  readonly revokedUids: string[] = [];
  private createFailure: Error | undefined = undefined;
  private revokeFailure: Error | undefined = undefined;

  /** La próxima y siguientes `createUser` lanzan ese error. */
  failCreateWith(error: Error): void {
    this.createFailure = error;
  }

  /** La próxima y siguientes `revokeSessions` lanzan ese error. */
  failRevokeWith(error: Error): void {
    this.revokeFailure = error;
  }

  async createUser(account: NewAccount): Promise<void> {
    if (this.createFailure !== undefined) {
      throw this.createFailure;
    }
    if (this.accounts.some((existing) => existing.email === account.email)) {
      throw new ConflictError(EMAIL_TAKEN_MESSAGE);
    }
    this.accounts.push({ email: account.email, password: account.password });
  }

  async revokeSessions(uid: string): Promise<void> {
    if (this.revokeFailure !== undefined) {
      throw this.revokeFailure;
    }
    this.revokedUids.push(uid);
  }
}
