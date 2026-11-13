import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("configuración de IA", () => {
  it("CLAUDE.md solo importa AGENTS.md", () => {
    expect(read("CLAUDE.md").trim()).toBe("@AGENTS.md");
  });

  it("AGENTS.md tiene como máximo 100 líneas", () => {
    expect(read("AGENTS.md").split("\n").length).toBeLessThanOrEqual(100);
  });

  it("el agente de seguridad es de solo lectura", () => {
    expect(read(".claude/agents/security.md")).not.toMatch(/tools:.*(Edit|Write)/);
  });

  it("no hay servidores MCP declarados", () => {
    expect(existsSync(join(root, ".mcp.json"))).toBe(false);
  });
});

describe("settings.json: barreras activas", () => {
  const settings = read(".claude/settings.json");

  it.each([
    '"Read(**/.env*)"',
    '"Edit(./.claude/**)"',
    '"Bash(git reset --hard:*)"',
    '"disableBypassPermissionsMode": "disable"',
    '"blockReadsOutsideWorkingDirectories": true',
    '"failIfUnavailable": true',
    '"allowUnsandboxedCommands": false',
  ])("contiene %s", (rule) => {
    expect(settings).toContain(rule);
  });

  it("no da acceso a carpetas extra", () => {
    expect(settings).not.toContain("additionalDirectories");
  });
});

describe("skills: nombre = carpeta y descripción presente", () => {
  const dir = join(root, ".claude/skills");
  it.each(readdirSync(dir))("%s", (skill) => {
    const text = readFileSync(join(dir, skill, "SKILL.md"), "utf8");
    expect(text).toMatch(new RegExp(`^---\\nname: ${skill}\\ndescription: .{20,}`));
    expect(skill).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
