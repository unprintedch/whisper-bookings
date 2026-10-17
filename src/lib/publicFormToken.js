// Shared token expected by the backend functions called from the visitor-facing public
// page (rates request). It is NOT a secret: it only makes the function URL alone
// useless to an automated caller, since the page sends the token with every request.
// Keep it in sync with base44/functions/sendRatesRequest/entry.ts.
export const PUBLIC_FORM_TOKEN = 'wbr_9f4c2a7e13b8d605';