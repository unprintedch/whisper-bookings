import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const { contactName, contactEmail } = await req.json();

    if (!contactName || !contactEmail) {
      return Response.json({ error: 'Missing contactName or contactEmail' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Load notification settings as service role
    let settings = {};
    try {
      const settingsList = await base44.asServiceRole.entities.NotificationSettings.list();
      settings = settingsList[0] || {};
    } catch (e) {
      console.warn('Could not load notification settings:', e.message);
    }

    const isTestMode = !!settings.test_mode;

    const defaultTemplate = `<p>Hello,</p><p><strong>[CONTACT_NAME]</strong> (<a href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>) has requested rates information via the online booking system.</p><p>Please reply to them directly.</p>`;
    const template = settings.template_rates_request || defaultTemplate;
    const body = template
      .replace(/\[CONTACT_NAME\]/g, contactName)
      .replace(/\[CONTACT_EMAIL\]/g, contactEmail);

    const subject = `Rate Request from ${contactName}`;

    // Collect recipients
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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Log each email attempt
    const logEmail = async (to, status, errorMessage = null) => {
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          recipient: to,
          recipient_type: 'admin',
          subject,
          body,
          booking_type: 'rates_request',
          status,
          error_message: errorMessage,
          client_name: contactName,
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
            html: body,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Resend error: ${err}`);
        }
        await logEmail(to, 'sent');
      } catch (err) {
        console.warn(`Failed to send email to ${to}:`, err.message);
        await logEmail(to, 'failed', err.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendRatesRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});