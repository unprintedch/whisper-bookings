// Hashes the public access password in the browser, so the clear value never reaches the
// database: only the salt and the hash are stored. The same algorithm is used by
// base44/functions/verifyPublicAccess/entry.ts — change both together.

export function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}