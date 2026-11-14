import net from "node:net";
import tls from "node:tls";

/**
 * Pruebas sin red (F0, regla 32): `fetch`, `net.connect`, `net.createConnection`,
 * `net.Socket.prototype.connect` y `tls.connect` lanzan siempre. Así quedan cubiertos también
 * `http`, `https` y `http2`, y ninguna prueba unitaria puede hablar con el emulador, Firebase ni internet.
 */
export const NETWORK_BLOCKED_MESSAGE = "Red prohibida en pruebas";

function blockNetwork(): never {
  throw new Error(NETWORK_BLOCKED_MESSAGE);
}

globalThis.fetch = blockNetwork;
net.connect = blockNetwork;
net.createConnection = blockNetwork;
net.Socket.prototype.connect = blockNetwork;
tls.connect = blockNetwork;
