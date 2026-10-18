import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { sendBookingNotifications } from "../../shared/bookingNotifications.ts";

// Maximum notification emails a non-admin caller may trigger per hour.
const MAX_EMAILS_PER_HOUR = 30;

// Custom roles allowed to send notification emails manually from the app.
const ALLOWED_CUSTOM_ROLES = ['full_access', 'agency'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // --- Authorization ---
    // This endpoint reaches a booking's client, room and agency, so the caller must be
    // an identified app user. Backend function URLs are public and the runtime falls
    // back to a privileged identity when no user token is supplied, so a request
    // without the signed-in user's token is rejected before any record is read.
    if (!req.headers.get('authorization')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {}
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.role === 'admin';
    if (!isAdmin && !ALLOWED_CUSTOM_ROLES.includes(user.custom_role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Volume cap for non-admin callers, so one account cannot generate an email flood.
    if (!isAdmin) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const recentEmails = await base44.asServiceRole.entities.EmailLog.count({
        requested_by_id: user.id,
        created_date: { $gte: hourAgo },
      });
      if (recentEmails >= MAX_EMAILS_PER_HOUR) {
        return Response.json(
          { error: 'Too many notification emails requested. Please try again later.' },
          { status: 429 }
        );
      }
    }

    const { bookingId, bookingType, notifications } = await req.json();

    if (!bookingId || !bookingType) {
      return Response.json({ error: 'Missing bookingId or bookingType' }, { status: 400 });
    }

    // The caller's own client reads the booking: row-level security decides whether this
    // user may act on that booking (an agency only reaches its own clients' bookings).
    let result;
    try {
      result = await sendBookingNotifications(base44, {
        dataClient: base44,
        bookingId,
        bookingType,
        notifications,
        requestedById: user.id,
      });
    } catch (accessError) {
      console.warn('Notification access denied:', accessError.message);
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (result.error) {
      return Response.json({ error: result.error }, { status: result.status || 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('sendBookingNotification error:', error);
    return Response.json({ error: 'Unable to send notification' }, { status: 500 });
  }
}