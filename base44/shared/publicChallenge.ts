import { digest } from './publicAccess.ts';

// Anti-robot challenge for the public booking form: the server issues a random token, the
// visitor's browser must find a value whose digest starts with a set number of zeros, and
// the booking endpoint accepts that pair exactly once, for a short while. No third-party
// captcha account is needed, and every scripted attempt costs real work.

const DIFFICULTY = 4;          // leading hexadecimal zeros required in the proof
const TTL_MS = 10 * 60 * 1000; // a challenge stays usable for ten minutes
const MAX_NONCE = 50000000;    // bound on the value the browser may search

export async function issueChallenge(base44) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  await base44.asServiceRole.entities.PublicChallenge.create({
    token_hash: await digest(token),
    difficulty: DIFFICULTY,
    expires_at: new Date(Date.now() + TTL_MS).toISOString(),
  });
  // Drop the challenges nobody solved so the table does not grow forever.
  await base44.asServiceRole.entities.PublicChallenge.deleteMany({ expires_at: { $lt: new Date().toISOString() } });
  return { token, difficulty: DIFFICULTY };
}

// A proof is valid only if it was issued here, has not expired, has not been used yet and
// actually solves the token. Marking it used is what stops a captured proof from replaying.
export async function consumeChallenge(base44, token, nonce) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  if (!Number.isInteger(nonce) || nonce < 0 || nonce > MAX_NONCE) return false;

  const { items } = await base44.asServiceRole.entities.PublicChallenge.filter(
    { token_hash: await digest(token) },
    { limit: 1, fields: ['difficulty', 'expires_at', 'used_at'] }
  );
  const record = items[0];
  if (!record || record.used_at) return false;
  if (new Date(record.expires_at).getTime() < Date.now()) return false;

  const proof = await digest(`${token}:${nonce}`);
  if (!proof.startsWith('0'.repeat(record.difficulty))) return false;

  await base44.asServiceRole.entities.PublicChallenge.update(record.id, { used_at: new Date().toISOString() });
  return true;
}