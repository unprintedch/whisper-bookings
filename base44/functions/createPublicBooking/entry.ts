import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Creates the booking requests submitted from the public page. The password gate of that
// page only lives in the browser, so it cannot protect a write that anyone could perform
// directly: this endpoint checks the access itself before creating anything. A visitor
// must present the session token issued by verifyPublicAccess after entering the
// password; staff members are recognised by their signed-in user token. The public
// channel can also be closed from the settings page, which is honoured here too.

const MAX_RESERVATIONS = 20;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLIENT_FIELDS = ['contact_name', 'contact_email', 'contact_phone'];

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

    // Authentication is not ownership: retain the verified user for all later checks.
    let appUser = null;
    if (req.headers.get('authorization')) {
      try {
        appUser = await base44.auth.me();
      } catch {
        appUser = null;
      }
    }
    const isAppUser = !!appUser;
    if (isAppUser && !['admin', 'user'].includes(appUser.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isAppUser) {
      const settingsList = await base44.asServiceRole.entities.PublicAccessSettings.list();
      const settings = settingsList[0] || {};

      // Public booking switched off in the settings page: the switch must stop the write
      // here as well, not only hide the form.
      if (settings.allow_public_booking !== true) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      // Neither a shared password nor knowledge of a contact email proves ownership.
      // Visitors may create a new request, never select an existing client file.
      if (clientId !== undefined && clientId !== null && clientId !== '') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

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
    // An existing file is never selected by an identifier the caller supplies. It is read
    // with the signed-in caller's own permissions, and reused only when that caller really
    // owns it (administrator, full-access staff, creator, or same agency).
    let targetClientId = cleanText(clientId, 64);

    if (targetClientId) {
      let existingClient;
      try {
        existingClient = await base44.entities.Client.get(targetClientId);
      } catch {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const mayUseClient = isAppUser && existingClient && (
        appUser.role === 'admin' || appUser.custom_role === 'full_access' ||
        existingClient.created_by_id === appUser.id ||
        (appUser.agency_id && existingClient.agency_id === appUser.agency_id)
      );
      if (!mayUseClient) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      targetClientId = existingClient.id;
    } else {
      const name = cleanText(client?.name, 200);
      if (!name) {
        return Response.json({ error: 'Client name is required' }, { status: 400 });
      }
      const clientData = { name };
      for (const field of CLIENT_FIELDS) {
        const value = cleanText(client?.[field], 200);
        if (value) clientData[field] = value;
      }

      // An agency chosen by a visitor is ignored outright. Staff may attach an agency,
      // but an agency user only the one they belong to.
      const agencyId = cleanText(client?.agency_id, 64);
      if (isAppUser && agencyId) {
        const mayUseAgency = appUser.role === 'admin' || appUser.custom_role === 'full_access' ||
          (!!appUser.agency_id && appUser.agency_id === agencyId);
        if (!mayUseAgency) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        let agency;
        try {
          agency = await base44.asServiceRole.entities.Agency.get(agencyId);
        } catch {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!agency || agency.is_active === false) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        clientData.agency_id = agency.id;
        const contact = client?.agency_contact_id;
        if (contact !== undefined && contact !== null && contact !== '') {
          const contactIndex = Number(contact);
          if (!Number.isInteger(contactIndex) || contactIndex < 0 || contactIndex >= (agency.contacts || []).length) {
            return Response.json({ error: 'Invalid agency contact' }, { status: 400 });
          }
          clientData.agency_contact_id = String(contactIndex);
        }
      }

      // The write runs with the caller's own permissions, so the row-level rules stay in
      // force; only the anonymous public submission, already gated above, is elevated.
      const createdClient = isAppUser
        ? await base44.entities.Client.create(clientData)
        : await base44.asServiceRole.entities.Client.create(clientData);
      targetClientId = createdClient.id;
    }

    // Same rule for the reservations: a signed-in caller writes under their own rules, and
    // the service role is used only for the public submission identified above.
    const reservationEntity = isAppUser
      ? base44.entities.Reservation
      : base44.asServiceRole.entities.Reservation;
    await reservationEntity.bulkCreate(
      rows.map((row) => ({ ...row, client_id: targetClientId }))
    );

    return Response.json({ success: true, clientId: targetClientId, created: rows.length });
  } catch (error) {
    console.error('createPublicBooking error:', error);
    return Response.json({ error: 'Unable to submit request' }, { status: 500 });
  }
}