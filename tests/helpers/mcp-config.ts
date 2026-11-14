import { statSync } from "node:fs";
import { z } from "zod";

/** Forma mínima de `.mcp.json`: solo interesa `mcpServers`; el resto se deja pasar. */
const McpConfigSchema = z
  .object({
    mcpServers: z.record(z.string(), z.object({}).loose()).optional(),
  })
  .loose();

/**
 * Nombres de los servidores MCP declarados en el contenido de `.mcp.json`.
 * - Contenido vacío (o solo espacios) → ninguno: dentro del sandbox el archivo está montado sobre `/dev/null`.
 * - JSON sin `mcpServers` o con `mcpServers` vacío → ninguno.
 * - JSON inválido → lanza: si no se puede verificar, no se acepta.
 */
export function declaredMcpServers(content: string): string[] {
  if (content.trim() === "") {
    return [];
  }
  const config = McpConfigSchema.parse(JSON.parse(content));
  return Object.keys(config.mcpServers ?? {});
}

/** Lo que se sabe de `.mcp.json` en disco; `read` solo se llama si hace falta. */
export interface McpFileProbe {
  exists: boolean;
  isNullDevice: boolean;
  read: () => string;
}

/**
 * Servidores MCP declarados según el estado del archivo.
 * - No existe → ninguno.
 * - Es `/dev/null` (lo que monta el sandbox encima) → ninguno, sin leerlo.
 * - Cualquier otro caso (incluido otro dispositivo) → se lee; si no se puede leer o el JSON es inválido, lanza.
 */
export function mcpServersFromFile(probe: McpFileProbe): string[] {
  if (!probe.exists) {
    return [];
  }
  if (probe.isNullDevice) {
    return [];
  }
  return declaredMcpServers(probe.read());
}

/** `true` solo si `path` es el mismo dispositivo de caracteres que `/dev/null` (mismo `rdev`). */
export function isNullDevice(path: string): boolean {
  const stats = statSync(path);
  return stats.isCharacterDevice() && stats.rdev === statSync("/dev/null").rdev;
}
