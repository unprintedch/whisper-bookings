// Hashes the public access password in the browser, so the clear value never reaches the
// database: only the salt and the hash are stored. A plain digest would be cheap to crack
// offline, so PBKDF2 (100 000 iterations, SHA-256) is used; the same algorithm runs in
// base44/functions/verifyPublicAccess/entry.ts — change both together.
// Stored form: "pbkdf2$<iterations>$<hash>".

const PBKDF2_ITERATIONS = 100000;

export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  const hex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${hex}`;
}