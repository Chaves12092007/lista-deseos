/**
 * Pruebas del hook (node:test, sin dependencias). Correr con: npm run test:hooks
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { checkToolCall, decide } from "./guard.mjs";

const ROOT = "/home/marco/proyectos/lista-deseos";
const HOOK = fileURLToPath(new URL("./guard.mjs", import.meta.url));

const blocked = (tool, input) => assert.notEqual(checkToolCall(tool, input, ROOT), null);
const allowed = (tool, input) => assert.equal(checkToolCall(tool, input, ROOT), null);

describe("guard: secretos", () => {
  it("1. bloquea leer .env.local con Read", () => blocked("Read", { file_path: ".env.local" }));
  it("2. bloquea cat .env.local en Bash", () => blocked("Bash", { command: "cat .env.local" }));
  it("3. bloquea grep sobre el .env", () => blocked("Bash", { command: "grep -r CANARIO .env" }));
  it("4. bloquea claves .pem y cuentas de servicio", () => {
    blocked("Read", { file_path: "certs/server.pem" });
    blocked("Read", { file_path: "lista-firebase-adminsdk-abc.json" });
  });
  it("5. permite .env.example", () => {
    allowed("Read", { file_path: ".env.example" });
    allowed("Bash", { command: "cat .env.example" });
  });
});

describe("guard: no salir de la carpeta", () => {
  it("6. bloquea rutas fuera del proyecto", () => {
    blocked("Read", { file_path: "../otro-proyecto/README.md" });
    blocked("Read", { file_path: "/home/marco/.bashrc" });
    blocked("Glob", { pattern: "~/**" });
  });
  it("7. bloquea ls .. y cat ~/.bashrc en Bash", () => {
    blocked("Bash", { command: "ls .." });
    blocked("Bash", { command: "cat ~/.bashrc" });
  });
  it("8. bloquea carpetas prohibidas (data/, .git/)", () => {
    blocked("Read", { file_path: "data/emulator/auth_export/accounts.json" });
    blocked("Edit", { file_path: ".git/config" });
  });
});

describe("guard: comandos peligrosos", () => {
  it("9. bloquea red, sudo y acciones destructivas", () => {
    for (const command of [
      "curl https://example.com",
      "/usr/bin/curl -s x",
      "wget x",
      "sudo apt install x",
      "rm -rf app",
      "git push --force",
      "git reset --hard HEAD~1",
      "vercel env pull",
    ]) {
      blocked("Bash", { command });
    }
  });
  it("10. permite el trabajo normal", () => {
    allowed("Bash", { command: "npm run check" });
    allowed("Bash", { command: "git status && git diff" });
    allowed("Read", { file_path: "app/page.tsx" });
    allowed("Edit", { file_path: `${ROOT}/docs/specs/f4-agregar-deseo.md` });
  });
});

describe("guard: protocolo del hook", () => {
  it("11. sale con código 2 y mensaje en stderr al bloquear", () => {
    const run = spawnSync("node", [HOOK], {
      input: JSON.stringify({ tool_name: "Read", tool_input: { file_path: ".env.local" } }),
      env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT },
      encoding: "utf8",
    });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /Bloqueado/);
  });
  it("12. sale con 0 cuando se permite y bloquea un evento ilegible", () => {
    assert.equal(decide(JSON.stringify({ tool_name: "Read", tool_input: { file_path: "README.md" } }), ROOT).code, 0);
    assert.equal(decide("{no es json", ROOT).code, 2);
  });
});
