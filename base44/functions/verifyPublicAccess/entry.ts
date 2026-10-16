import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Verifies public page access without ever exposing access_password to the client.
// Returns only non-sensitive booleans: isPasswordProtected, hasAccess, allowPublicBooking.
// Failed password attempts are rate-limited per IP to prevent brute-forcing.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // failed attempts are counted within 15 minutes
const LOCK_MS = 15 * 60 * 1000;   // lockout duration once the limit is reached

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'unknown';
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

    const records = await base44.asServiceRole.entities.PublicAccessAttempt.filter({ ip });
    const record = records[0] || null;

    // Temporarily locked out after too many failed attempts?
    const lockedUntilMs = record?.locked_until ? new Date(record.locked_until).getTime() : 0;
    if (lockedUntilMs > now) {
      const retryAfterSeconds = Math.ceil((lockedUntilMs - now) / 1000);
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
    if (password === settings.access_password) {
      if (record) {
        await base44.asServiceRole.entities.PublicAccessAttempt.delete(record.id);
      }
      return Response.json({ isPasswordProtected, hasAccess: true, allowPublicBooking });
    }

    // Failed attempt: count it within the rolling window and lock when exceeded.
    const windowStartMs = record?.window_start ? new Date(record.window_start).getTime() : 0;
    const withinWindow = windowStartMs > 0 && now - windowStartMs < WINDOW_MS;
    const attempts = withinWindow ? (record.attempts || 0) + 1 : 1;
    const windowStart = withinWindow ? record.window_start : new Date(now).toISOString();
    const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now + LOCK_MS).toISOString() : null;

    if (record) {
      await base44.asServiceRole.entities.PublicAccessAttempt.update(record.id, {
        attempts,
        window_start: windowStart,
        locked_until: lockedUntil,
      });
    } else {
      await base44.asServiceRole.entities.PublicAccessAttempt.create({
        ip,
        attempts,
        window_start: windowStart,
        locked_until: lockedUntil,
      });
    }

    return Response.json({
      isPasswordProtected,
      hasAccess: false,
      allowPublicBooking,
      locked: !!lockedUntil,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - attempts),
      retryAfterSeconds: lockedUntil ? Math.ceil(LOCK_MS / 1000) : 0,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}