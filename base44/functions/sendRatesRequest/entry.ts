import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { escapeHtml, stripHtml } from "../../shared/escapeHtml.ts";

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

export default async function(req) {
  try {
    const { contactName, contactEmail } = await req.json();

    if (!contactName || !contactEmail) {
      return Response.json({ error: 'Missing contactName or contactEmail' }, { status: 400 });
    }

    // Validate email format to prevent injection of arbitrary reply-to addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    let settings = {};
    try {
      const settingsList = await base44.asServiceRole.entities.NotificationSettings.list();
      settings = settingsList[0] || {};
    } catch (e) {
      console.warn('Could not load notification settings:', e.message);
    }

    const isTestMode = !!settings.test_mode;

    // Escape user-controlled values before inserting into HTML (prevents HTML injection in admin emails)
    const safeName = escapeHtml(contactName);
    const safeEmail = escapeHtml(contactEmail);

    const defaultTemplate = `<p>Hello,</p><p><strong>[CONTACT_NAME]</strong> (<a href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>) has requested rates information via the online booking system.</p><p>Please reply to them directly.</p>`;
    const template = settings.template_rates_request || defaultTemplate;
    const emailBody = template
      .replace(/\[CONTACT_NAME\]/g, safeName)
      .replace(/\[CONTACT_EMAIL\]/g, safeEmail);

    // Strip HTML from subject line — no markup should survive in email subjects
    const subject = `Rate Request from ${stripHtml(contactName)}`;

    let recipients = [];
    (settings.site_configs || []).forEach((sc) => {
      (sc.admin_emails || []).forEach((email) => { if (email) recipients.push(email); });
    });
    if (recipients.length === 0) {
      recipients = (settings.admin_emails || []).filter(Boolean);
    }
    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      console.warn('No admin recipients configured, skipping email send.');
      return Response.json({ success: true, skipped: true });
    }

    const logEmail = async (to, status, errorMessage = null) => {
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          recipient: to,
          recipient_type: 'admin',
          subject,
          body: emailBody,
          booking_type: 'rates_request',
          status,
          error_message: errorMessage,
          client_name: stripHtml(contactName),
        });
      } catch (e) {
        console.warn('Could not log email:', e.message);
      }
    };

    for (const to of uniqueRecipients) {
      if (isTestMode) {
        console.log(`[TEST MODE] Would send rates request email to ${to}`);
        await logEmail(to, 'skipped', 'Test mode active — email not sent');
        continue;
      }

      try {
        await sendEmail(base44, settings.email_provider || 'native', to, subject, emailBody, contactEmail);
        await logEmail(to, 'sent');
      } catch (err) {
        console.warn(`Failed to send email to ${to}:`, err.message);
        await logEmail(to, 'failed', err.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendRatesRequest error:', error);
    return Response.json({ success: true, warning: error.message });
  }
}