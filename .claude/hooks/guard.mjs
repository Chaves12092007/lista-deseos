#!/usr/bin/env node
/**
 * Hook PreToolUse de Claude Code (reto de IA: «hook propio»).
 *
 * Claude Code le pasa por stdin un JSON con `tool_name` y `tool_input`. Si la llamada toca algo
 * prohibido, el hook escribe el motivo en stderr y sale con código 2: Claude Code bloquea la
 * herramienta y le muestra el motivo al modelo. Si todo está bien, sale con 0.
 *
 * Es UNA capa más (permisos + sandbox + este hook + no tener secretos en disco): un comando con
 * comodines o variables puede esquivarlo, por eso no es la única barrera.
 */
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Archivos y carpetas que el agente nunca toca (relativos a la raíz del proyecto). */
const SECRET_FILE = /(^|[\\/\s"'=])\.env(\.[\w.-]+)?(?=$|[\s"'`;|&)])/;
const ALLOWED_ENV = /\.env\.example\b/g;
const SECRET_PATTERNS = [/\.pem\b/, /\.key\b/, /firebase-adminsdk[^\s]*\.json/, /(^|[\\/\s])secrets[\\/]/];
const FORBIDDEN_DIRS = ["data", ".git", "secrets"];

/** Comandos de terminal prohibidos: red directa, privilegios y acciones destructivas o sin vuelta atrás. */
const FORBIDDEN_COMMANDS = [
  { pattern: /(^|[\s;|&/(`])(curl|wget)(\s|$)/, reason: "salir a la red con curl/wget" },
  { pattern: /(^|[\s;|&(`])sudo(\s|$)/, reason: "usar sudo" },
  { pattern: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\b/, reason: "borrar con rm -rf" },
  { pattern: /\bgit\s+push\b.*(\s--force\b|\s-f\b|\s--force-with-lease\b)/, reason: "git push --force" },
  { pattern: /\bgit\s+reset\s+--hard\b/, reason: "git reset --hard" },
  { pattern: /\bvercel\s+env\s+pull\b/, reason: "bajar secretos de producción con vercel env pull" },
];

/** Herramientas que reciben rutas y nombres de los campos donde vienen. */
const PATH_FIELDS = ["file_path", "path", "notebook_path", "pattern", "glob"];

/** Devuelve el motivo del bloqueo si el texto menciona un archivo secreto. */
export function mentionsSecret(text) {
  const withoutExample = text.replace(ALLOWED_ENV, "");
  if (SECRET_FILE.test(withoutExample)) {
    return "leer o tocar archivos .env (solo se permite .env.example)";
  }
  const hit = SECRET_PATTERNS.find((pattern) => pattern.test(withoutExample));
  if (hit) {
    return "leer o tocar claves o cuentas de servicio";
  }
  return null;
}

/** Devuelve el motivo si la ruta sale de la raíz del proyecto o entra a una carpeta prohibida. */
export function checkPath(rawPath, root) {
  if (rawPath.startsWith("~")) {
    return "salir de la carpeta del proyecto (~)";
  }
  const rel = relative(root, resolve(root, rawPath));
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return "salir de la carpeta del proyecto";
  }
  const first = rel.split(/[\\/]/)[0];
  if (FORBIDDEN_DIRS.includes(first)) {
    return `entrar a la carpeta prohibida ${first}/`;
  }
  return mentionsSecret(rel);
}

/** Devuelve el motivo si el comando de terminal está prohibido. */
export function checkCommand(command) {
  const forbidden = FORBIDDEN_COMMANDS.find((rule) => rule.pattern.test(command));
  if (forbidden) {
    return forbidden.reason;
  }
  if (/(^|\s)(~|\.\.)(\/|\s|$)/.test(command) || /\$HOME|\/home\//.test(command)) {
    return "salir de la carpeta del proyecto";
  }
  return mentionsSecret(command);
}

/** Revisa una llamada completa. Devuelve el motivo del bloqueo o null si se permite. */
export function checkToolCall(toolName, toolInput, root) {
  if (toolName === "Bash" && typeof toolInput.command === "string") {
    return checkCommand(toolInput.command);
  }
  for (const field of PATH_FIELDS) {
    const value = toolInput[field];
    if (typeof value === "string" && value.length > 0) {
      const reason = checkPath(value, root);
      if (reason) {
        return reason;
      }
    }
  }
  return null;
}

/** Lee el evento de stdin y decide. Exportada para poder probarla sin lanzar un proceso. */
export function decide(rawEvent, root) {
  let event;
  try {
    event = JSON.parse(rawEvent);
  } catch {
    return { code: 2, message: "guard: evento ilegible; bloqueo por precaución." };
  }
  const reason = checkToolCall(String(event.tool_name ?? ""), event.tool_input ?? {}, root);
  if (reason) {
    return { code: 2, message: `Bloqueado por el guard del proyecto: no se permite ${reason}.` };
  }
  return { code: 0, message: "" };
}

function main() {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", () => {
    const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
    const { code, message } = decide(raw, root);
    if (message) {
      process.stderr.write(`${message}\n`);
    }
    process.exit(code);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
