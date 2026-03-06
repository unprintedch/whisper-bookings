import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    const defaultTemplate = `<p>Hello,</p><p><strong>[CONTACT_NAME]</strong> (<a href="mailto:[CONTACT_EMAIL]">[CONTACT_EMAIL]</a>) has requested rates information via the online booking system.</p><p>Please reply to them directly.</p>`;
    const template = settings.template_rates_request || defaultTemplate;
    const body = template
      .replace(/\[CONTACT_NAME\]/g, contactName)
      .replace(/\[CONTACT_EMAIL\]/g, contactEmail);

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

    await Promise.all(uniqueRecipients.map((to) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Whisper Bookings <onboarding@resend.dev>',
          to,
          subject: `Rate Request from ${contactName}`,
          html: body,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Resend error: ${err}`);
        }
      })
    ));

    return Response.json({ success: true });
  } catch (error) {
    console.error('sendRatesRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});