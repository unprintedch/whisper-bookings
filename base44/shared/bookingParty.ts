import { cleanText } from './bookingWrites.ts';

// A bounded allowlist, never an arbitrary entity or payload forwarded by the caller.
export function bookingPartyData(kind, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return { error: 'Invalid client details' };
  const limits = { name: 200, contact_name: 200, contact_email: 254, contact_phone: 100, notes: 10000, color_hex: 7 };
  if (kind === 'client') Object.assign(limits, { client_number: 100, agency_contact_id: 20 });
  const data = {};
  for (const [field, limit] of Object.entries(limits)) {
    if (!Object.hasOwn(source, field)) continue;
    const value = source[field];
    if (value !== null && typeof value !== 'string') return { error: 'Invalid client details' };
    if (typeof value === 'string' && value.length > limit) return { error: 'Client details too long' };
    data[field] = cleanText(value, limit) || '';
  }
  if (Object.hasOwn(data, 'name') && !data.name) return { error: 'Name is required' };
  if (data.contact_email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.contact_email)) return { error: 'Invalid contact email' };
  if (data.color_hex && !/^#[a-f0-9]{6}$/i.test(data.color_hex)) return { error: 'Invalid color' };
  return { data };
}