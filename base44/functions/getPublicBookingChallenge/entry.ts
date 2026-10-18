import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { consumePublicQuota, clientIp } from '../../shared/publicAccess.ts';
import { issueChallenge } from '../../shared/publicChallenge.ts';

// Hands the public booking form a fresh anti-robot challenge to solve. Public by design:
// the token is worthless without the work of solving it, and issuing stays capped so the
// table cannot be filled with unsolved challenges.

const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 40;
const MAX_GLOBAL = 400;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const ip = clientIp(req);
    if (ip && !(await consumePublicQuota(base44, `challenge:${ip}`, MAX_PER_IP, RATE_WINDOW_MS))) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    if (!(await consumePublicQuota(base44, 'challenge:global', MAX_GLOBAL, RATE_WINDOW_MS))) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    return Response.json(await issueChallenge(base44));
  } catch (error) {
    console.error('getPublicBookingChallenge error:', error);
    return Response.json({ error: 'Unable to issue a challenge' }, { status: 500 });
  }
}