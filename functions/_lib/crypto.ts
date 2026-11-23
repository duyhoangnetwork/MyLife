const PBKDF2_ITERATIONS = 100_000;
export const CURRENT_PASSWORD_ALGORITHM = `pbkdf2-sha256:v1:${PBKDF2_ITERATIONS}`;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function generateRandomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function parseIterations(algorithm: string): number {
  const parts = algorithm.split(':');
  const parsed = Number(parts[2]);
  if (Number.isFinite(parsed) && parsed >= 10_000 && parsed <= 100_000) {
    return parsed;
  }
  return PBKDF2_ITERATIONS;
}

export async function hashPassword(
  password: string,
  saltHex?: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<{hashHex: string; saltHex: string; algorithm: string}> {
  const saltBytes = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const actualSaltHex = saltHex || bytesToHex(saltBytes);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    {name: 'PBKDF2'},
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256,
  );

  return {
    hashHex: bytesToHex(new Uint8Array(derivedBits)),
    saltHex: actualSaltHex,
    algorithm: `pbkdf2-sha256:v1:${iterations}`,
  };
}

export async function verifyPassword(
  password: string,
  storedHashHex: string,
  storedSaltHex: string,
  algorithm: string,
): Promise<boolean> {
  if (!storedHashHex || !storedSaltHex) return false;
  const iterations = parseIterations(algorithm || CURRENT_PASSWORD_ALGORITHM);
  const candidate = await hashPassword(password, storedSaltHex, iterations);
  return timingSafeEqualBytes(hexToBytes(candidate.hashHex), hexToBytes(storedHashHex));
}
