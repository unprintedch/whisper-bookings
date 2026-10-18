// Validation and shaping shared by the two booking entry points: createPublicBooking
// (anonymous visitors) and createBookingRequests (signed-in staff and agency users).
// Keeping it here means the rules cannot drift apart between the two channels.

export const MAX_RESERVATIONS = 20;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const CLIENT_FIELDS = ['contact_name', 'contact_email', 'contact_phone'];
export const STATUSES = ['REQUEST', 'OPTION', 'RESERVE', 'CONFIRME', 'PAYE', 'ANNULE'];

export function cleanText(value, maxLength) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export function toCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 99) : 0;
}

// Returns either { rows } or { error, status }. Public callers may not choose a status:
// a visitor always files a request, staff may set one explicitly.
export function buildReservationRows(reservations, { allowStatus = false } = {}) {
  if (!Array.isArray(reservations) || reservations.length === 0 || reservations.length > MAX_RESERVATIONS) {
    return { error: 'Invalid reservation list', status: 400 };
  }
  const rows = [];
  for (const item of reservations) {
    const roomId = cleanText(item?.room_id, 64);
    const checkin = cleanText(item?.date_checkin, 10);
    const checkout = cleanText(item?.date_checkout, 10);
    if (!roomId || !DATE_PATTERN.test(checkin || '') || !DATE_PATTERN.test(checkout || '') || checkin >= checkout) {
      return { error: 'Invalid reservation details', status: 400 };
    }
    const status = allowStatus && STATUSES.includes(item?.status) ? item.status : 'REQUEST';
    rows.push({
      room_id: roomId,
      date_checkin: checkin,
      date_checkout: checkout,
      bed_configuration: cleanText(item.bed_configuration, 120) || '',
      adults_count: toCount(item.adults_count),
      children_count: toCount(item.children_count),
      infants_count: toCount(item.infants_count),
      group_pax: toCount(item.group_pax) || undefined,
      comment: cleanText(item.comment, 1000) || '',
      status,
      ...(status === 'OPTION' && typeof item?.hold_expires_at === 'string' && !Number.isNaN(Date.parse(item.hold_expires_at))
        ? { hold_expires_at: new Date(item.hold_expires_at).toISOString() }
        : {}),
    });
  }
  return { rows };
}

export function buildNewClient(client, agency) {
  const name = cleanText(client?.name, 200);
  if (!name) return { error: 'Client name is required', status: 400 };
  const data = { name };
  for (const field of CLIENT_FIELDS) {
    const value = cleanText(client?.[field], 200);
    if (value) data[field] = value;
  }
  if (agency) {
    data.agency_id = agency.id;
    const contact = client?.agency_contact_id;
    if (contact !== undefined && contact !== null && contact !== '') {
      const index = Number(contact);
      if (!Number.isInteger(index) || index < 0 || index >= (agency.contacts || []).length) {
        return { error: 'Invalid agency contact', status: 400 };
      }
      data.agency_contact_id = String(index);
    }
  }
  return { data };
}