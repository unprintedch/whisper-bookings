import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { hardenPublicPassword, publicPasswordMatches } from '../../shared/publicPassword.ts';
import { publicSettings, issuePublicSession } from '../../shared/publicAccess.ts';

// Verifies public page access without ever exposing the password to the client: only a
// slow, salted derivation is stored, and the comparison happens here. Records saved with
// an older scheme are hardened on the way in (see shared/publicPassword.ts), so a fast
// verifier never stays in storage. Returns isPasswordProtected, allowPublicBooking and,
// on success, the session token the public booking endpoint requires. Failed attempts are
// rate-limited per client; a correct answer never wipes the counters, so guessing cannot
// be used to clear them.

const MAX_ATTEMPTS = 5;
const MAX_GLOBAL_ATTEMPTS = 50;   // failed attempts overall before responses are slowed down
const GLOBAL_DELAY_MS = 2000;     // slowdown applied above that threshold (never a lock)
const GLOBAL_KEY = '__global__';
const WINDOW_MS = 15 * 60 * 1000; // failed attempts are counted within 15 minutes
const LOCK_MS = 15 * 60 * 1000;   // lockout duration once the limit is reached

// Only the header set by the platform edge is trusted to identify a client.
// x-forwarded-for and x-real-ip are controlled by the caller: trusting them lets an
// attacker send a different value on every request and get a fresh attempt counter.
function getClientIp(req) {
  return req.headers.get('cf-connecting-ip') || null;
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

    // Any legacy record is upgraded here, before the submitted password is looked at.
    const settings = await hardenPublicPassword(base44, await publicSettings(base44));

    const isPasswordProtected = settings.is_password_protected === true;
    const allowPublicBooking = isPasswordProtected && settings.allow_public_booking === true;

    // Without password protection, availability may be viewed but booking is disabled.
    // No booking session is issued on this branch.
    if (!isPasswordProtected) {
      return Response.json({ isPasswordProtected, hasAccess: true, canViewAvailability: true, allowPublicBooking, accessToken: null });
    }

    const ip = getClientIp(req);
    const now = Date.now();

    // Only the per-client counter can lock an attempt. A global lock would let an
    // anonymous visitor take the public booking page down for every legitimate guest,
    // so the global counter is only ever used to slow responses down.
    const keys = [GLOBAL_KEY, ...(ip ? [ip] : [])];
    const { items: records } = await base44.asServiceRole.entities.PublicAccessAttempt.filter({ ip: { $in: keys } }, { limit: 10 });
    const record = ip ? records.find(r => r.ip === ip) || null : null;
    const globalRecord = records.find(r => r.ip === GLOBAL_KEY) || null;

    // Temporarily locked out after too many failed attempts from this client?
    const lockUntil = lockedUntilMs(record);
    if (lockUntil > now) {
      const retryAfterSeconds = Math.ceil((lockUntil - now) / 1000);
      return Response.json({
        isPasswordProtected,
        hasAccess: false,
        canViewAvailability: false,
        allowPublicBooking,
        locked: true,
        retryAfterSeconds,
      });
    }

    // A probe without a password (initial page load) never counts as an attempt.
    if (!password) {
      return Response.json({ isPasswordProtected, hasAccess: false, canViewAvailability: false, allowPublicBooking });
    }

    // Correct password: open a session. The failure counters are deliberately kept, so a
    // repeated guess cannot clear the lockout state.
    if (await publicPasswordMatches(base44, settings, password)) {
      const accessToken = await issuePublicSession(base44, settings);
      return Response.json({ isPasswordProtected, hasAccess: true, canViewAvailability: true, allowPublicBooking, accessToken });
    }

    // Failed attempt: count it within the rolling window and lock when exceeded.
    const state = nextAttemptState(record, now, MAX_ATTEMPTS);
    const globalState = nextAttemptState(globalRecord, now, MAX_GLOBAL_ATTEMPTS);

    await Promise.all([
      saveAttempt(base44, record, ip, state),
      saveAttempt(base44, globalRecord, GLOBAL_KEY, globalState),
    ]);

    // Past the global threshold, slow anonymous attempts down instead of blocking
    // everyone: automated guessing becomes expensive, legitimate guests are unaffected.
    if (globalState.attempts >= MAX_GLOBAL_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, GLOBAL_DELAY_MS));
    }

    return Response.json({
      isPasswordProtected,
      hasAccess: false,
      canViewAvailability: false,
      allowPublicBooking,
      locked: !!state.locked_until,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - state.attempts),
      retryAfterSeconds: state.locked_until ? Math.ceil(LOCK_MS / 1000) : 0,
    });
  } catch (error) {
    // Log the details server-side only: this endpoint is public and its response
    // must never carry internal error text back to an anonymous caller.
    console.error('verifyPublicAccess error:', error);
    return Response.json({ error: 'Unable to verify access' }, { status: 500 });
  }
}