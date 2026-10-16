import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// This function is called only by the "Reservation Email Notifications" workflow
// on Reservation create/update. It sends admin notification emails automatically.
// The workflow invokes it as its creator (an app admin), so any direct anonymous
// call is rejected and visitors cannot trigger notification emails themselves.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch {}
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = await req.json();

    const { event } = payload;

    if (!event?.entity_id) {
      return Response.json({ skipped: true, reason: 'No entity_id in event' });
    }

    let bookingType;
    if (event.type === 'create') {
      bookingType = 'new';
    } else if (event.type === 'update') {
      bookingType = 'update';
    } else if (event.type === 'delete') {
      return Response.json({ skipped: true, reason: 'Delete events not handled automatically' });
    } else {
      return Response.json({ skipped: true, reason: `Unknown event type: ${event.type}` });
    }

    // Verify the reservation exists and was recently modified (within 5 minutes).
    // This prevents stale replay attacks from direct anonymous calls.
    const reservation = await base44.asServiceRole.entities.Reservation.get(event.entity_id);
    if (!reservation) {
      return Response.json({ skipped: true, reason: 'Reservation not found' });
    }
    const updatedDate = new Date(reservation.updated_date);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (updatedDate < fiveMinAgo) {
      return Response.json({ skipped: true, reason: 'Reservation not recently modified' });
    }

    // Invoke the centralized sendBookingNotification function (service-role call is authenticated)
    const result = await base44.asServiceRole.functions.invoke('sendBookingNotification', {
      bookingId: event.entity_id,
      bookingType,
    });

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('onReservationChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}