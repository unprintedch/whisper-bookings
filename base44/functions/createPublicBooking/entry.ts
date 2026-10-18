import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { signedInUser, publicSettings, validPublicSession, consumePublicQuota, clientIp } from '../../shared/publicAccess.ts';
import { consumeChallenge } from '../../shared/publicChallenge.ts';
import { buildReservationRows, buildNewClient } from '../../shared/bookingWrites.ts';

// Files a booking request coming from the public page, with no account: the page is open
// on purpose, so the write is protected by an anti-robot challenge instead of a login.
// Every submission must carry a proof issued by getPublicBookingChallenge and solved in
// the visitor's browser. When the page is password protected, the session issued after the
// password was checked is required too. Signed-in users write through createBookingRequests.

// Anonymous booking requests allowed per client and overall, within one hour.
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 10;
const MAX_REQUESTS_GLOBAL = 60;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    if (await signedInUser(base44, req)) {
      return Response.json({ error: 'Signed-in users book from the app.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { accessToken, challengeToken, nonce, clientId, client, reservations } = body || {};

    const settings = await publicSettings(base44);

    // Public booking switched off in the settings page: the switch must stop the write
    // here as well, not only hide the form.
    if (settings.allow_public_booking !== true) {
      return Response.json({ error: 'Public booking is disabled.' }, { status: 403 });
    }

    // Neither a shared password nor knowledge of a contact email proves ownership:
    // a visitor may file a new request, never attach it to an existing client file.
    if (clientId !== undefined && clientId !== null && clientId !== '') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Password protection is optional. When it is on, availability was unlocked with a
    // session and the same session must accompany the write.
    if (settings.is_password_protected && !(await validPublicSession(base44, settings, accessToken))) {
      return Response.json({ error: 'Public access expired. Please refresh the page.' }, { status: 403 });
    }

    // Anti-robot gate: single use, short lived, so a captured proof cannot be replayed.
    if (!(await consumeChallenge(base44, challengeToken, nonce))) {
      return Response.json({ error: 'Verification failed. Please try again.' }, { status: 403 });
    }

    // Beyond the challenge, anonymous writes stay capped per visitor and overall.
    const ip = clientIp(req);
    if (ip && !(await consumePublicQuota(base44, `booking:${ip}`, MAX_REQUESTS_PER_IP, RATE_WINDOW_MS))) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    if (!(await consumePublicQuota(base44, 'booking:global', MAX_REQUESTS_GLOBAL, RATE_WINDOW_MS))) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const built = buildReservationRows(reservations);
    if (built.error) return Response.json({ error: built.error }, { status: built.status });

    // A visitor never picks an agency: any identifier sent along is ignored outright.
    const newClient = buildNewClient(client, null);
    if (newClient.error) return Response.json({ error: newClient.error }, { status: newClient.status });

    // Only this anonymous submission, already gated above, runs with the service role:
    // there is no signed-in user whose permissions could carry the write.
    const createdClient = await base44.asServiceRole.entities.Client.create(newClient.data);
    await base44.asServiceRole.entities.Reservation.bulkCreate(
      built.rows.map((row) => ({ ...row, client_id: createdClient.id }))
    );

    return Response.json({ success: true, created: built.rows.length });
  } catch (error) {
    console.error('createPublicBooking error:', error);
    return Response.json({ error: 'Unable to submit request' }, { status: 500 });
  }
}