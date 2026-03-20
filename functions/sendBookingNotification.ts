import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Whisper Bookings <notifications@whisper-bookings.com>',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error sending to ${to}: ${err}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const {
      bookingId,
      bookingType, // 'new' | 'update' | 'cancellation'
      notifications, // { toAdmin, toAgency, toClient } — optional, for manual sends
    } = await req.json();

    if (!bookingId || !bookingType) {
      return Response.json({ error: 'Missing bookingId or bookingType' }, { status: 400 });
    }

    // Load all needed data
    const [booking, settingsList] = await Promise.all([
      base44.asServiceRole.entities.Reservation.get(bookingId),
      base44.asServiceRole.entities.NotificationSettings.list(),
    ]);

    if (!booking) {
      return Response.json({ error: 'Booking not found' }, { status: 404 });
    }

    const settings = settingsList[0] || {};
    const isTestMode = !!settings.test_mode;

    const [client, room] = await Promise.all([
      base44.asServiceRole.entities.Client.get(booking.client_id),
      base44.asServiceRole.entities.Room.get(booking.room_id),
    ]);

    if (!client || !room) {
      return Response.json({ error: 'Client or Room not found' }, { status: 404 });
    }

    let agency = null;
    if (client.agency_id) {
      agency = await base44.asServiceRole.entities.Agency.get(client.agency_id);
    }

    let site = null;
    if (room.site_id) {
      site = await base44.asServiceRole.entities.Site.get(room.site_id);
    }

    const siteName = site?.name || '';
    const siteConfig = (settings.site_configs || []).find(sc => sc.site_name === siteName);
    const hotelName = siteConfig?.hotel_name || siteName || 'Whisper B.';

    // Select template
    let template = '';
    if (bookingType === 'new') {
      template = settings.template_new_booking || '<p>New booking for [CLIENT_NAME].</p>';
    } else if (bookingType === 'update') {
      template = settings.template_update_booking || '<p>Booking updated for [CLIENT_NAME].</p>';
    } else if (bookingType === 'cancellation') {
      template = settings.template_cancellation || '<p>Booking cancelled for [CLIENT_NAME].</p>';
    }

    // Format dates
    const checkinDate = new Date(booking.date_checkin + 'T00:00:00');
    const checkoutDate = new Date(booking.date_checkout + 'T00:00:00');
    const formatDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const bookingUrl = `https://preview--whisper-bookings-b975b3db.base44.app/Clients?bookingId=${bookingId}`;

    const placeholders = {
      '[HOTEL_NAME]': hotelName,
      '[CLIENT_NAME]': client.name,
      '[ROOM_NAME]': `${room.number} – ${room.name}`,
      '[CHECKIN_DATE]': formatDate(checkinDate),
      '[CHECKOUT_DATE]': formatDate(checkoutDate),
      '[STATUS]': booking.status,
      '[AGENCY_NAME]': agency?.name || 'N/A',
      '[BOOKING_LINK]': bookingUrl,
    };

    let body = template;
    for (const [key, value] of Object.entries(placeholders)) {
      body = body.replace(new RegExp(key.replace('[', '\\[').replace(']', '\\]'), 'g'), value);
    }

    const subject =
      bookingType === 'cancellation'
        ? `Booking Cancellation: ${client.name} – ${room.name} (${hotelName})`
        : bookingType === 'update'
        ? `Booking Update: ${client.name} – ${room.name} (${hotelName})`
        : `New Booking: ${client.name} – ${room.name} (${hotelName})`;

    // Determine recipients
    const notifOptions = notifications || { toAdmin: true, toAgency: false, toClient: false };

    const emailTasks = [];

    if (notifOptions.toAdmin) {
      const siteAdminEmails =
        siteConfig?.admin_emails?.length > 0
          ? siteConfig.admin_emails
          : settings.admin_emails || [];

      for (const email of siteAdminEmails) {
        emailTasks.push({ to: email, recipientType: 'admin' });
      }
    }

    if (notifOptions.toAgency && agency?.email) {
      emailTasks.push({ to: agency.email, recipientType: 'agency' });
    }

    if (notifOptions.toClient && client.contact_email) {
      emailTasks.push({ to: client.contact_email, recipientType: 'client' });
    }

    if (emailTasks.length === 0) {
      return Response.json({ success: true, skipped: true, reason: 'No recipients configured' });
    }

    let sent = 0;
    await Promise.allSettled(
      emailTasks.map(async ({ to, recipientType }) => {
        let status = 'sent';
        let errorMessage = null;
        if (isTestMode) {
          status = 'skipped';
          errorMessage = 'Test mode active — email not sent';
          console.log(`[TEST MODE] Would send email to ${to}: ${subject}`);
        } else {
          try {
            await sendEmail(to, subject, body);
            sent++;
          } catch (err) {
            console.warn(`Failed to send email to ${to}:`, err.message);
            status = 'failed';
            errorMessage = err.message;
          }
        }
        // Log every attempt
        await base44.asServiceRole.entities.EmailLog.create({
          booking_id: bookingId,
          recipient: to,
          recipient_type: recipientType,
          subject,
          body,
          booking_type: bookingType,
          status,
          error_message: errorMessage,
          client_name: client.name,
          site_name: siteName,
        }).catch(logErr => console.warn('Failed to save email log:', logErr.message));
      })
    );

    return Response.json({ success: true, sent });
  } catch (error) {
    console.error('sendBookingNotification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});