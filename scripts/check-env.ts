/**
 * `npm run check:env` (F0, reglas 24–27): informa el estado de cada variable de entorno de Firebase,
 * sin mostrar nunca sus valores, y termina con código 1 si el entorno no es válido.
 */
import { checkEnv } from "../app/shared/server/env";

const { lines, exitCode } = checkEnv(process.env);
process.stdout.write(`${lines.join("\n")}\n`);
process.exitCode = exitCode;
