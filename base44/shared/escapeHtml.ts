// Shared HTML escaping utility — used by backend functions to sanitize
// user-controlled values before inserting them into email HTML templates.
// Prevents stored XSS via email body content rendered in EmailLogs.
export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip all HTML tags — used for email subject lines where no markup should survive.
export function stripHtml(str) {
  if (str == null) return '';
  return String(str).replace(/<[^>]*>/g, '');
}