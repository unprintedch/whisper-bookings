import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { escapeHtml, stripHtml } from "../../shared/escapeHtml.ts";
import { consumePublicQuota } from "../../shared/publicAccess.ts";

// This endpoint is intentionally public, so it only accepts calls coming from the app's
// own pages carrying the shared form token, and is throttled per client and globally to
// stop anonymous callers from flooding the admin inboxes. The counters are fixed windows
// that count every request: a blocked caller cannot reset its own quota.
const RATE_WINDOW_MS = 60 * 60 * 1000; // counts are kept over one hour
const MAX_REQUESTS_PER_IP = 5;         // rates requests allowed per client per hour
const MAX_REQUESTS_GLOBAL = 30;        // rates requests allowed overall per hour
const RATE_KEY_PREFIX = 'rates:';

// Hosts allowed to trigger a rates request. A script calling the URL directly sends
// neither Origin nor Referer, so it is refused before any email is sent; a request
// forged with a fake Origin remains possible, this only stops the casual case.
const ALLOWED_HOSTS = ['whisper-tanzania.ch', 'base44.app', 'base44.com', 'localhost', '127.0.0.1'];

function isFromAppPage(req) {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return ALLOWED_HOSTS.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

// The public page sends this token with every rates request, so knowing the function URL
// is not enough to trigger an email. The token is readable in the page's own code: it
// filters out direct automated calls, while the volume cap below remains the guard that
// limits a flood. Keep in sync with src/lib/publicFormToken.js.
const FORM_TOKEN = 'wbr_9f4c2a7e13b8d605';

// Constant-time comparison so the answer does not reveal how much of the token matched.
function tokenMatches(value) {
  if (typeof value !== 'string' || value.length !== FORM_TOKEN.length) return false;
  let diff = 0;
  for (let i = 0; i < FORM_TOKEN.length; i++) diff |= value.charCodeAt(i) ^ FORM_TOKEN.charCodeAt(i);
  return diff === 0;
}

// Only the header set by the platform edge is trusted: x-forwarded-for and x-real-ip
// are controlled by the caller and could be rotated to bypass the limit.
function getClientIp(req) {
  return req.headers.get('cf-connecting-ip') || null;
}

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
    // The caller must be one of the app's own pages.
    if (!isFromAppPage(req)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { contactName, contactEmail, formToken } = await req.json();

    // The caller must prove it is the app's own page, not just a copy of its address.
    if (!tokenMatches(formToken)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!contactName || !contactEmail) {
      return Response.json({ error: 'Missing contactName or contactEmail' }, { status: 400 });
    }

    // Validate email format to prevent injection of arbitrary reply-to addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Throttle before doing any work. The per-client counter is checked first so a
    // blocked caller cannot consume the shared quota.
    const ip = getClientIp(req);
    if (ip && !(await consumePublicQuota(base44, `${RATE_KEY_PREFIX}${ip}`, MAX_REQUESTS_PER_IP, RATE_WINDOW_MS))) {
      return Response.json({ error: 'Too many rate requests. Please try again later.' }, { status: 429 });
    }
    if (!(await consumePublicQuota(base44, `${RATE_KEY_PREFIX}global`, MAX_REQUESTS_GLOBAL, RATE_WINDOW_MS))) {
      return Response.json({ error: 'Too many rate requests. Please try again later.' }, { status: 429 });
    }

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
    // Log the details server-side only: this endpoint is public and its response
    // must never carry internal error text back to an anonymous caller.
    console.error('sendRatesRequest error:', error);
    return Response.json({ success: true });
  }
}