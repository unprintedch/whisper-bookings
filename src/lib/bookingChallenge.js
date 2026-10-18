// Anti-robot proof for the public booking form. The backend issues a random token and
// asks for a value whose digest starts with a set number of zeros; finding it takes a
// moment of real work, which is what makes scripted floods expensive. The proof is then
// checked once, server-side, before the booking is written. Signed-in staff skip this
// entirely: their request is authenticated by their own account.

import { getPublicBookingChallenge } from "@/functions/getPublicBookingChallenge";

const MAX_NONCE = 50000000;

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Returns the proof to attach to a booking payload, or an empty object for signed-in users.
export async function anonymousBookingProof(isAuthenticated) {
  if (isAuthenticated) return {};

  const response = await getPublicBookingChallenge({});
  const { token, difficulty } = response?.data ?? response ?? {};
  if (!token || !difficulty) throw new Error('challenge_unavailable');

  const target = '0'.repeat(difficulty);
  for (let nonce = 0; nonce < MAX_NONCE; nonce++) {
    if ((await sha256Hex(`${token}:${nonce}`)).startsWith(target)) {
      return { challengeToken: token, nonce };
    }
  }
  throw new Error('challenge_unsolved');
}