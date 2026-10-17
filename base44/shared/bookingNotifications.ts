import { escapeHtml, stripHtml } from "./escapeHtml.ts";

async function sendViaResend(to, subject, html, replyTo) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const payload = {
    from: 'Whisper Bookings <notifications@whisper-tanzania.ch>',
    to,
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error sending to ${to}: ${err}`);
  }
}

async function sendEmail(base44, provider, to, subject, body, replyTo) {
  if (provider === 'resend') {
    await sendViaResend(to, subject, body, replyTo);
  } else {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body });
  }
}

// Builds and sends the notification emails for one booking. Shared by
// sendBookingNotification (manual sends from the app) and onReservationChange
// (automatic sends from the Reservation workflow), so both paths stay identical.
//
// dataClient reads the booking data: the manual path passes the caller's own client
// so row-level security decides which bookings the caller may act on, while the
// automatic path passes the service-role client.
export async function sendBookingNotifications(base44, {
  dataClient,
  bookingId,
  bookingType,
  notifications,
  requestedById,
}) {
  const settingsList = await base44.asServiceRole.entities.NotificationSettings.list();
  const settings = settingsList[0] || {};
  const isTestMode = !!settings.test_mode;

  const booking = await dataClient.entities.Reservation.get(bookingId);
  if (!booking) return { error: 'Booking not found', status: 404 };

  const [client, room] = await Promise.all([
    dataClient.entities.Client.get(booking.client_id),
    base44.asServiceRole.entities.Room.get(booking.room_id),
  ]);

  if (!client || !room) return { error: 'Client or Room not found', status: 404 };

  let agency = null;
  if (client.agency_id) {
    agency = await base44.asServiceRole.entities.Agency.get(client.agency_id);
  }

  let agencyContact = null;
  if (agency?.contacts?.length && client.agency_contact_id != null) {
    const idx = parseInt(client.agency_contact_id, 10);
    if (!Number.isNaN(idx)) agencyContact = agency.contacts[idx] || null;
  }
  const contactName = client.contact_name || agencyContact?.name || agency?.name || client.name;
  const contactEmail = client.contact_email || agencyContact?.email || agency?.email || '';
  const contactPhone = client.contact_phone || agencyContact?.phone || agency?.phone || '';

  let site = null;
  if (room.site_id) {
    site = await base44.asServiceRole.entities.Site.get(room.site_id);
  }

  const siteName = site?.name || '';
  const siteConfig = (settings.site_configs || []).find(sc => sc.site_name === siteName);
  const hotelName = siteConfig?.hotel_name || siteName || 'Whisper B.';

  let template = '';
  if (bookingType === 'new') {
    template = settings.template_new_booking || '<p>New booking for [CLIENT_NAME].</p>';
  } else if (bookingType === 'update') {
    template = settings.template_update_booking || '<p>Booking updated for [CLIENT_NAME].</p>';
  } else if (bookingType === 'cancellation') {
    template = settings.template_cancellation || '<p>Booking cancelled for [CLIENT_NAME].</p>';
  }

  const checkinDate = new Date(booking.date_checkin + 'T00:00:00');
  const checkoutDate = new Date(booking.date_checkout + 'T00:00:00');
  const formatDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const bookingUrl = `https://booking.whisper-tanzania.ch/Clients?bookingId=${bookingId}`;

  // Escape all user-controlled values before inserting into HTML templates (prevents stored XSS)
  const placeholders = {
    '[HOTEL_NAME]': escapeHtml(hotelName),
    '[CLIENT_NAME]': escapeHtml(client.name),
    '[ROOM_NAME]': escapeHtml(`${room.number} – ${room.name}`),
    '[CHECKIN_DATE]': formatDate(checkinDate),
    '[CHECKOUT_DATE]': formatDate(checkoutDate),
    '[STATUS]': escapeHtml(booking.status),
    '[AGENCY_NAME]': escapeHtml(agency?.name || 'N/A'),
    '[BOOKING_LINK]': bookingUrl,
    '[CONTACT_NAME]': escapeHtml(contactName),
    '[CONTACT_EMAIL]': escapeHtml(contactEmail),
    '[CONTACT_PHONE]': escapeHtml(contactPhone),
  };

  let emailBody = template;
  for (const [key, value] of Object.entries(placeholders)) {
    emailBody = emailBody.replace(new RegExp(key.replace('[', '\\[').replace(']', '\\]'), 'g'), value);
  }

  let clientBody = emailBody;
  if (bookingType === 'new' && settings.template_client_booking_request) {
    clientBody = settings.template_client_booking_request;
    for (const [key, value] of Object.entries(placeholders)) {
      clientBody = clientBody.replace(new RegExp(key.replace('[', '\\[').replace(']', '\\]'), 'g'), value);
    }
  }

  const contactInfoBlock = `
<div style="margin-top:16px;padding:12px;border-top:1px solid #eee;font-size:13px;color:#444;">
<strong>Contact:</strong> ${escapeHtml(contactName)}${contactEmail ? ` &middot; <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>` : ''}${contactPhone ? ` &middot; ${escapeHtml(contactPhone)}` : ''}
</div>`;

  const subject =
    bookingType === 'cancellation'
      ? `Booking Cancellation: ${stripHtml(client.name)} – ${stripHtml(room.name)} (${stripHtml(hotelName)})`
      : bookingType === 'update'
      ? `Booking Update: ${stripHtml(client.name)} – ${stripHtml(room.name)} (${stripHtml(hotelName)})`
      : `New Booking: ${stripHtml(client.name)} – ${stripHtml(room.name)} (${stripHtml(hotelName)})`;

  const notifOptions = notifications || { toAdmin: true, toAgency: false, toClient: false };

  if (
    bookingType === 'new' &&
    booking.status === 'REQUEST' &&
    settings.notify_client_on_request &&
    (client.contact_email || (agency && agency.email))
  ) {
    notifOptions.toClient = true;
  }

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

  if (notifOptions.toClient) {
    const clientEmail = client.contact_email || agencyContact?.email || agency?.email;
    if (clientEmail) {
      emailTasks.push({ to: clientEmail, recipientType: 'client' });
    }
  }

  if (emailTasks.length === 0) {
    return { success: true, skipped: true, reason: 'No recipients configured' };
  }

  let sent = 0;
  await Promise.allSettled(
    emailTasks.map(async ({ to, recipientType }) => {
      const isAdmin = recipientType === 'admin';
      const finalBody = isAdmin
        ? emailBody + contactInfoBlock
        : (recipientType === 'client' ? clientBody : emailBody);
      const replyTo = isAdmin && contactEmail ? contactEmail : undefined;
      let status = 'sent';
      let errorMessage = null;
      if (isTestMode) {
        status = 'skipped';
        errorMessage = 'Test mode active — email not sent';
        console.log(`[TEST MODE] Would send email to ${to}: ${subject}`);
      } else {
        try {
          await sendEmail(base44, settings.email_provider || 'native', to, subject, finalBody, replyTo);
          sent++;
        } catch (err) {
          console.warn(`Failed to send email to ${to}:`, err.message);
          status = 'failed';
          errorMessage = err.message;
        }
      }
      await base44.asServiceRole.entities.EmailLog.create({
        booking_id: bookingId,
        recipient: to,
        recipient_type: recipientType,
        subject,
        body: finalBody,
        booking_type: bookingType,
        status,
        error_message: errorMessage,
        client_name: client.name,
        site_name: siteName,
        requested_by_id: requestedById || undefined,
      }).catch(logErr => console.warn('Failed to save email log:', logErr.message));
    })
  );

  return { success: true, sent };
}