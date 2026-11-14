import https from "node:https";
import net from "node:net";
import tls from "node:tls";
import { describe, expect, it } from "vitest";

describe("Pruebas sin red (regla 32)", () => {
  it("una prueba que llama a fetch recibe «Red prohibida en pruebas»", () => {
    expect(() => fetch("https://example.com")).toThrow("Red prohibida en pruebas");
  });

  it("una prueba que abre un socket con net.connect recibe «Red prohibida en pruebas»", () => {
    expect(() => net.connect(8080, "127.0.0.1")).toThrow("Red prohibida en pruebas");
  });

  it("una prueba que abre un socket con net.createConnection recibe «Red prohibida en pruebas»", () => {
    expect(() => net.createConnection(9099, "127.0.0.1")).toThrow("Red prohibida en pruebas");
  });

  it("una prueba que conecta un net.Socket nuevo recibe «Red prohibida en pruebas»", () => {
    expect(() => new net.Socket().connect(1, "127.0.0.1")).toThrow("Red prohibida en pruebas");
  });

  it("una prueba que abre una conexión TLS recibe «Red prohibida en pruebas»", () => {
    expect(() => tls.connect(1, "127.0.0.1")).toThrow("Red prohibida en pruebas");
  });

  it("una prueba que hace https.get recibe «Red prohibida en pruebas»", () => {
    expect(() => https.get("https://example.com")).toThrow("Red prohibida en pruebas");
  });
});
