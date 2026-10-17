import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Creates the booking requests submitted from the public page. The password gate of that
// page only lives in the browser, so it cannot protect a write that anyone could perform
// directly: this endpoint checks the access itself before creating anything. A visitor
// must present the session token issued by verifyPublicAccess after entering the
// password; staff members are recognised by their signed-in user token.

const MAX_RESERVATIONS = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLIENT_FIELDS = ['agency_id', 'agency_contact_id', 'contact_name', 'contact_email', 'contact_phone'];

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function toCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 99) : 0;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { accessToken, clientId, client, reservations } = body || {};

    // --- Access check ---
    let isAppUser = false;
    if (req.headers.get('authorization')) {
      try {
        isAppUser = !!(await base44.auth.me());
      } catch {
        isAppUser = false;
      }
    }

    if (!isAppUser) {
      const settingsList = await base44.asServiceRole.entities.PublicAccessSettings.list();
      const settings = settingsList[0] || {};

      if (settings.is_password_protected) {
        const token = cleanText(accessToken, 128);
        const sessions = token
          ? await base44.asServiceRole.entities.PublicAccessSession.filter({ token })
          : [];
        const session = sessions[0] || null;
        const sessionValid = !!session && new Date(session.expires_at).getTime() > Date.now();
        if (!sessionValid) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // --- Input validation ---
    if (!Array.isArray(reservations) || reservations.length === 0 || reservations.length > MAX_RESERVATIONS) {
      return Response.json({ error: 'Invalid reservation list' }, { status: 400 });
    }

    const rows = [];
    for (const item of reservations) {
      const roomId = cleanText(item?.room_id, 64);
      const checkin = cleanText(item?.date_checkin, 10);
      const checkout = cleanText(item?.date_checkout, 10);
      if (!roomId || !DATE_PATTERN.test(checkin || '') || !DATE_PATTERN.test(checkout || '') || checkin >= checkout) {
        return Response.json({ error: 'Invalid reservation details' }, { status: 400 });
      }
      rows.push({
        room_id: roomId,
        date_checkin: checkin,
        date_checkout: checkout,
        bed_configuration: cleanText(item.bed_configuration, 120) || '',
        adults_count: toCount(item.adults_count),
        children_count: toCount(item.children_count),
        infants_count: toCount(item.infants_count),
        group_pax: toCount(item.group_pax) || undefined,
        comment: cleanText(item.comment, 1000) || '',
        status: 'REQUEST',
      });
    }

    // --- Client ---
    let targetClientId = cleanText(clientId, 64);
    if (!targetClientId) {
      const name = cleanText(client?.name, 200);
      if (!name) {
        return Response.json({ error: 'Client name is required' }, { status: 400 });
      }
      const clientData = { name };
      for (const field of CLIENT_FIELDS) {
        const value = cleanText(client?.[field], 200);
        if (value) clientData[field] = value;
      }
      const createdClient = await base44.asServiceRole.entities.Client.create(clientData);
      targetClientId = createdClient.id;
    }

    // Writes run with the service role: the caller has been identified above (staff token
    // or visitor session token), and the public form must create records regardless of the
    // row-level rules that apply to anonymous callers.
    await base44.asServiceRole.entities.Reservation.bulkCreate(
      rows.map((row) => ({ ...row, client_id: targetClientId }))
    );

    return Response.json({ success: true, clientId: targetClientId, created: rows.length });
  } catch (error) {
    console.error('createPublicBooking error:', error);
    return Response.json({ error: 'Unable to submit request' }, { status: 500 });
  }
}