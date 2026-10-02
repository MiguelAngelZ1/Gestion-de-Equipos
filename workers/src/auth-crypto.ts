// Reemplazos WebCrypto/jose para jsonwebtoken + node:crypto del backend.
// Los JWT resultantes son estándar HS256: compatibles con los firmados por el backend.
import * as jose from 'jose';

const enc = new TextEncoder();

export async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(enc.encode(secret));
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, any>> {
  const { payload } = await jose.jwtVerify(token, enc.encode(secret));
  return payload as Record<string, any>;
}

export function randomHex(bytes = 32): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function random6(): string {
  return String(100000 + Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
}

export async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
