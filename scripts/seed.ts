/**
 * `npm run seed`: llena el emulador con la cuenta demo y deseos de ejemplo. Se niega (código 1) si el entorno
 * no es el emulador local con un proyecto `demo-…`, así que nunca toca Firebase real.
 */
import { getAccountService, getWishService } from "../app/features/container";
import { getAdminAuth } from "../app/shared/server/firebase-admin";
import { seedDemoData, DEMO_EMAIL, DEMO_PASSWORD } from "./seed-core";
import { seedEnvironmentProblems } from "./seed-guard";

function say(line: string): void {
  process.stdout.write(`${line}\n`);
}

function fail(lines: string[]): void {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exitCode = 1;
}

/** Mensaje de un error cualquiera, sin nombrar `unknown`. */
function describeError<T>(error: T): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function accountState(created: boolean): string {
  if (created) {
    return "creada";
  }
  return "ya existía";
}

async function run(): Promise<void> {
  const problems = seedEnvironmentProblems(process.env);
  if (problems.length > 0) {
    fail(["El seed no corrió: solo se permite con el emulador de Firebase y un proyecto demo-…", ...problems]);
    return;
  }
  const result = await seedDemoData({
    accounts: getAccountService(),
    findUidByEmail: async (email) => (await getAdminAuth().getUserByEmail(email)).uid,
    wishes: getWishService(),
  });
  say(`Cuenta demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD} (${accountState(result.accountCreated)}).`);
  say(`Deseos: ${result.wishesCreated} creados, ${result.wishesSkipped} ya estaban.`);
}

run().catch((error: Error) => {
  fail([`El seed falló: ${describeError(error)}`, "¿Está corriendo npm run emulators?"]);
});
