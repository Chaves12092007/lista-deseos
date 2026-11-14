import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { declaredMcpServers, isNullDevice, mcpServersFromFile } from "../helpers/mcp-config";

describe("Detección de servidores MCP en .mcp.json (helper de pruebas)", () => {
  it("un archivo vacío no declara servidores", () => {
    expect(declaredMcpServers("")).toEqual([]);
  });

  it("un archivo con solo espacios no declara servidores", () => {
    expect(declaredMcpServers("  \n\t ")).toEqual([]);
  });

  it("un JSON vacío ({}) no declara servidores", () => {
    expect(declaredMcpServers("{}")).toEqual([]);
  });

  it("mcpServers vacío no declara servidores", () => {
    expect(declaredMcpServers('{"mcpServers":{}}')).toEqual([]);
  });

  it("detecta un servidor declarado", () => {
    const content = '{"mcpServers":{"docs":{"command":"npx","args":["servidor-docs"]}}}';
    expect(declaredMcpServers(content)).toEqual(["docs"]);
  });

  it("un JSON inválido lanza: no se puede verificar, así que no se acepta", () => {
    expect(() => declaredMcpServers("{mcpServers:")).toThrow();
  });

  it("mcpServers con una forma que no es un objeto de servidores lanza", () => {
    expect(() => declaredMcpServers('{"mcpServers":["docs"]}')).toThrow();
  });
});

describe("Decisión según el estado de .mcp.json (helper de pruebas)", () => {
  /** Lectura que no debe ocurrir: si se llama, la prueba falla. */
  const mustNotRead = () => {
    throw new Error("No se debía leer el archivo");
  };

  /** Lectura de un archivo normal sin permiso, como en el sandbox. */
  const deniedRead = () => {
    throw new Error("EACCES: permission denied");
  };

  it("si el archivo no existe, no hay servidores y no se lee", () => {
    expect(mcpServersFromFile({ exists: false, isNullDevice: false, read: mustNotRead })).toEqual([]);
  });

  it("el montaje del sandbox (/dev/null) cuenta como sin servidores, sin leerlo", () => {
    expect(mcpServersFromFile({ exists: true, isNullDevice: true, read: mustNotRead })).toEqual([]);
  });

  it("un archivo normal sin mcpServers no declara servidores", () => {
    expect(mcpServersFromFile({ exists: true, isNullDevice: false, read: () => "{}" })).toEqual([]);
  });

  it("un archivo normal con un servidor lo detecta", () => {
    const read = () => '{"mcpServers":{"docs":{"command":"npx"}}}';
    expect(mcpServersFromFile({ exists: true, isNullDevice: false, read })).toEqual(["docs"]);
  });

  it("un archivo normal que no se puede leer lanza: no se puede verificar", () => {
    expect(() => mcpServersFromFile({ exists: true, isNullDevice: false, read: deniedRead })).toThrow("EACCES");
  });

  it("un archivo normal con JSON inválido lanza", () => {
    expect(() => mcpServersFromFile({ exists: true, isNullDevice: false, read: () => "{roto" })).toThrow();
  });

  it("un dispositivo que no es /dev/null se lee y, si no se puede leer, lanza", () => {
    expect(() => mcpServersFromFile({ exists: true, isNullDevice: false, read: deniedRead })).toThrow("EACCES");
  });
});

describe("Reconocimiento de /dev/null (helper de pruebas)", () => {
  it("/dev/null se reconoce como el dispositivo nulo", () => {
    expect(isNullDevice("/dev/null")).toBe(true);
  });

  it("otro dispositivo de caracteres (/dev/zero) no es el dispositivo nulo", () => {
    expect(isNullDevice("/dev/zero")).toBe(false);
  });

  it("un archivo normal no es el dispositivo nulo", () => {
    expect(isNullDevice(join(__dirname, "mcp-config-helper.test.ts"))).toBe(false);
  });
});
