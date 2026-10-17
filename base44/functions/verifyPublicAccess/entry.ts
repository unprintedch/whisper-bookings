import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Verifies public page access without ever exposing access_password to the client.
// Returns only non-sensitive booleans: isPasswordProtected, hasAccess, allowPublicBooking.
// Failed password attempts are rate-limited per IP to prevent brute-forcing.

const MAX_ATTEMPTS = 5;
const MAX_GLOBAL_ATTEMPTS = 50;   // cap independent of the client IP, defeats IP spoofing
const GLOBAL_KEY = '__global__';
const WINDOW_MS = 15 * 60 * 1000; // failed attempts are counted within 15 minutes
const LOCK_MS = 15 * 60 * 1000;   // lockout duration once the limit is reached

// Only headers set by the platform edge are trusted to identify a client.
// x-forwarded-for is controlled by the caller: trusting it lets an attacker send a
// different first entry on every request and get a fresh attempt counter each time.
function getClientIp(req) {
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || null;
}

// Constant-time comparison so the password cannot be recovered from response timing.
function timingSafeEqual(a, b) {
  const aBytes = new TextEncoder().encode(String(a));
  const bBytes = new TextEncoder().encode(String(b));
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0);
  }
  return diff === 0;
}

// Next counter state for one rate-limit key, within the rolling window.
function nextAttemptState(record, now, maxAttempts) {
  const windowStartMs = record?.window_start ? new Date(record.window_start).getTime() : 0;
  const withinWindow = windowStartMs > 0 && now - windowStartMs < WINDOW_MS;
  const attempts = withinWindow ? (record?.attempts || 0) + 1 : 1;
  const window_start = withinWindow ? record.window_start : new Date(now).toISOString();
  const locked_until = attempts >= maxAttempts ? new Date(now + LOCK_MS).toISOString() : null;
  return { attempts, window_start, locked_until };
}

async function saveAttempt(base44, record, key, state) {
  if (!key) return;
  if (record) {
    await base44.asServiceRole.entities.PublicAccessAttempt.update(record.id, state);
  } else {
    await base44.asServiceRole.entities.PublicAccessAttempt.create({ ip: key, ...state });
  }
}

function lockedUntilMs(record) {
  return record?.locked_until ? new Date(record.locked_until).getTime() : 0;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { password } = body || {};

    const settingsList = await base44.asServiceRole.entities.PublicAccessSettings.list();
    const settings = settingsList[0] || {};

    const isPasswordProtected = !!settings.is_password_protected;
    const allowPublicBooking = !!settings.allow_public_booking;

    // No password configured: nothing to verify or brute-force.
    if (!isPasswordProtected) {
      return Response.json({ isPasswordProtected, hasAccess: true, allowPublicBooking });
    }

    const ip = getClientIp(req);
    const now = Date.now();

    // Both the per-client counter and a global counter are checked, so spoofing or
    // omitting the IP header no longer grants an unlimited number of attempts.
    const keys = [GLOBAL_KEY, ...(ip ? [ip] : [])];
    const records = await base44.asServiceRole.entities.PublicAccessAttempt.filter({ ip: { $in: keys } });
    const record = ip ? records.find(r => r.ip === ip) || null : null;
    const globalRecord = records.find(r => r.ip === GLOBAL_KEY) || null;

    // Temporarily locked out after too many failed attempts?
    const lockUntil = Math.max(lockedUntilMs(record), lockedUntilMs(globalRecord));
    if (lockUntil > now) {
      const retryAfterSeconds = Math.ceil((lockUntil - now) / 1000);
      return Response.json({
        isPasswordProtected,
        hasAccess: false,
        allowPublicBooking,
        locked: true,
        retryAfterSeconds,
      });
    }

    // A probe without a password (initial page load) never counts as an attempt.
    if (!password) {
      return Response.json({ isPasswordProtected, hasAccess: false, allowPublicBooking });
    }

    // Correct password: clear any recorded failures.
    if (timingSafeEqual(password, settings.access_password)) {
      await Promise.all(
        [record, globalRecord]
          .filter(Boolean)
          .map(r => base44.asServiceRole.entities.PublicAccessAttempt.delete(r.id))
      );
      return Response.json({ isPasswordProtected, hasAccess: true, allowPublicBooking });
    }

    // Failed attempt: count it within the rolling window and lock when exceeded.
    const state = nextAttemptState(record, now, MAX_ATTEMPTS);
    const globalState = nextAttemptState(globalRecord, now, MAX_GLOBAL_ATTEMPTS);

    await Promise.all([
      saveAttempt(base44, record, ip, state),
      saveAttempt(base44, globalRecord, GLOBAL_KEY, globalState),
    ]);

    const isLocked = !!state.locked_until || !!globalState.locked_until;

    return Response.json({
      isPasswordProtected,
      hasAccess: false,
      allowPublicBooking,
      locked: isLocked,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - state.attempts),
      retryAfterSeconds: isLocked ? Math.ceil(LOCK_MS / 1000) : 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}