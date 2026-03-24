import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// This function is called by an entity automation on Reservation create/update/delete.
// It sends admin notification emails automatically.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event } = payload;

    if (!event?.entity_id) {
      return Response.json({ skipped: true, reason: 'No entity_id in event' });
    }

    // Map event type to booking type
    let bookingType;
    if (event.type === 'create') {
      bookingType = 'new';
    } else if (event.type === 'update') {
      bookingType = 'update';
    } else if (event.type === 'delete') {
      // For deletes, we can't fetch the booking anymore — skip silently
      // (cancellation notifications are handled manually from the UI)
      return Response.json({ skipped: true, reason: 'Delete events not handled automatically' });
    } else {
      return Response.json({ skipped: true, reason: `Unknown event type: ${event.type}` });
    }

    // Invoke the centralized sendBookingNotification function
    const result = await base44.asServiceRole.functions.invoke('sendBookingNotification', {
      bookingId: event.entity_id,
      bookingType,
      // No notifications object = defaults to toAdmin: true
    });

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('onReservationChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});