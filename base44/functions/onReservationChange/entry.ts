import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// This function is called by an entity automation on Reservation create/update.
// It sends admin notification emails automatically.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
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

    // Invoke the centralized sendBookingNotification function with automation secret
    const automationSecret = Deno.env.get('AUTOMATION_SECRET');
    const result = await base44.asServiceRole.functions.invoke('sendBookingNotification', {
      bookingId: event.entity_id,
      bookingType,
      _automationSecret: automationSecret,
    });

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('onReservationChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}