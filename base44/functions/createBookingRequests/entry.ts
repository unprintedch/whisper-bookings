import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { signedInUser, staffUser } from '../../shared/publicAccess.ts';
import { buildReservationRows, buildNewClient } from '../../shared/bookingWrites.ts';

// Single write path for bookings created inside the app (staff and agency users).
// The caller writes with their own permissions, so the row-level rules stay in force;
// the agency scope of every record is derived here from the client, never accepted from
// the caller. Agency users may only book for clients of their own agency.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await signedInUser(base44, req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = staffUser(user);
    const isAgency = user.role === 'user' && user.custom_role === 'agency';
    if (!isStaff && !isAgency) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { clientId, client, reservations } = body || {};

    const built = buildReservationRows(reservations, { allowStatus: true });
    if (built.error) return Response.json({ error: built.error }, { status: built.status });

    // --- Client ---
    let targetClient;
    const requestedClientId = typeof clientId === 'string' ? clientId.trim() : '';
    if (requestedClientId) {
      // Read with the caller's own permissions: row-level security decides whether this
      // client file is reachable at all.
      try {
        targetClient = await base44.entities.Client.get(requestedClientId);
      } catch {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!targetClient) return Response.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      // Only staff may open a new client file; an agency user books for existing clients.
      if (!isStaff) return Response.json({ error: 'Forbidden' }, { status: 403 });

      let agency = null;
      const agencyId = typeof client?.agency_id === 'string' ? client.agency_id.trim() : '';
      if (agencyId) {
        try {
          agency = await base44.asServiceRole.entities.Agency.get(agencyId);
        } catch {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!agency || agency.is_active === false) return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const newClient = buildNewClient(client, agency);
      if (newClient.error) return Response.json({ error: newClient.error }, { status: newClient.status });
      targetClient = await base44.entities.Client.create(newClient.data);
    }

    // --- Agency scope ---
    // Derived from the client file, so a caller cannot widen their own reach.
    const scopeAgencyId = targetClient.agency_id || null;
    if (!isStaff && scopeAgencyId !== user.agency_id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = built.rows.map((row) => ({
      ...row,
      client_id: targetClient.id,
      ...(scopeAgencyId ? { agency_id: scopeAgencyId } : {}),
    }));

    // Written with the caller's own permissions: the row-level rules check the agency
    // scope and the status/agency fields they may set.
    const created = await base44.entities.Reservation.bulkCreate(rows);

    return Response.json({ success: true, created: rows.length, ids: created.map((r) => r.id), clientId: targetClient.id });
  } catch (error) {
    console.error('createBookingRequests error:', error);
    return Response.json({ error: 'Unable to create booking' }, { status: 500 });
  }
}