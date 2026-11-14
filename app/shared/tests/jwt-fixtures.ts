/** Codifica un texto en base64url (sin relleno), como las partes de un JWT. */
export function base64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

/** Une cabecera, payload y firma (textos crudos) en un token con forma de JWT. */
export function jwtFrom(header: string, payload: string, signature: string = "x"): string {
  return `${base64url(header)}.${base64url(payload)}.${base64url(signature)}`;
}

const HEADER = JSON.stringify({ alg: "RS256", typ: "JWT" });

/** ID token con forma de JWT correcta (la firma es falsa: solo sirve con dobles, nunca contra el SDK real). */
export const SHAPED_ID_TOKEN = jwtFrom(HEADER, JSON.stringify({ sub: "uid-ana" }));

/** Cookie de sesión con forma de JWT correcta (firma falsa: solo para dobles). */
export const SHAPED_SESSION_COOKIE = jwtFrom(HEADER, JSON.stringify({ sub: "uid-ana", typ: "cookie" }));

/** Tokens malformados que reportó security (R1): el SDK lanza SyntaxError/TypeError con ellos. */
const SECURITY_HEADER = base64url(JSON.stringify({ typ: "JWT", alg: "RS256" }));
export const MALFORMED_TOKENS = [
  { label: "payload que no es JSON", token: `${SECURITY_HEADER}.${base64url("no-json")}.x` },
  { label: "payload null", token: `${SECURITY_HEADER}.${base64url("null")}.x` },
];
