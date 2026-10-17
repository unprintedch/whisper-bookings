import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Verifies public page access without ever exposing the password to the client: only a
// salted hash is stored, and the comparison happens here.
// Returns isPasswordProtected, hasAccess, allowPublicBooking and, on success, the session
// token the public booking endpoint requires. Failed password attempts are rate-limited
// per client to prevent brute-forcing.

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

// The password is never stored in clear: only a salted SHA-256 hash is kept, so neither a
// database leak nor a log record hands out the shared password. The same algorithm runs
// in the admin page (src/lib/passwordHash.js) — change both together.
const SESSION_MS = 12 * 60 * 60 * 1000; // how long a public access token stays valid

function randomHex(byteCount) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Compares the submitted password to the stored hash. A record saved before hashing
// existed still holds a clear-text password: it is hashed and erased on first use.
async function passwordMatches(base44, settings, password) {
  let hash = settings.access_password_hash;
  let salt = settings.access_password_salt;

  if (!hash && settings.access_password) {
    salt = randomHex(16);
    hash = await hashPassword(settings.access_password, salt);
    await base44.asServiceRole.entities.PublicAccessSettings.update(settings.id, {
      access_password_hash: hash,
      access_password_salt: salt,
      access_password: '',
    });
  }

  if (!hash || !salt) return false;
  return timingSafeEqual(await hashPassword(password, salt), hash);
}

// Hands the visitor a token that proves the password was entered. The public booking
// endpoint requires it, so the page's password gate is enforced by the backend too.
async function createSession(base44) {
  const token = randomHex(32);
  const now = Date.now();
  await base44.asServiceRole.entities.PublicAccessSession.create({
    token,
    expires_at: new Date(now + SESSION_MS).toISOString(),
  });
  // Drop the tokens that have expired so the table does not grow forever.
  await base44.asServiceRole.entities.PublicAccessSession.deleteMany({
    expires_at: { $lt: new Date(now).toISOString() },
  });
  return token;
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
      return Response.json({ isPasswordProtected, hasAccess: true, allowPublicBooking, accessToken: null });
    }

    const ip = getClientIp(req);
    const now = Date.now();

    // Only the per-client counter can lock an attempt. A global lock would let an
    // anonymous visitor take the public booking page down for every legitimate guest,
    // so the global counter is only ever used to slow responses down.
    const keys = [GLOBAL_KEY, ...(ip ? [ip] : [])];
    const records = await base44.asServiceRole.entities.PublicAccessAttempt.filter({ ip: { $in: keys } });
    const record = ip ? records.find(r => r.ip === ip) || null : null;
    const globalRecord = records.find(r => r.ip === GLOBAL_KEY) || null;

    // Temporarily locked out after too many failed attempts from this client?
    const lockUntil = lockedUntilMs(record);
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

    // Correct password: clear any recorded failures and open a session.
    if (await passwordMatches(base44, settings, password)) {
      await Promise.all(
        [record, globalRecord]
          .filter(Boolean)
          .map(r => base44.asServiceRole.entities.PublicAccessAttempt.delete(r.id))
      );
      const accessToken = await createSession(base44);
      return Response.json({ isPasswordProtected, hasAccess: true, allowPublicBooking, accessToken });
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