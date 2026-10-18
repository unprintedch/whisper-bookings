import { addDays, format, parseISO } from 'npm:date-fns@3.6.0';

// A bounded calendar window, never client identities, booking IDs or payment statuses.
export async function publicOccupancy(base44, roomIds, startDate) {
  if (!roomIds.length) return [];
  const dates = Array.from({ length: 31 }, (_, i) => format(addDays(parseISO(startDate), i), 'yyyy-MM-dd'));
  const occupied = new Set();
  let cursor;
  do {
    const page = await base44.asServiceRole.entities.Reservation.filter({
      room_id: { $in: roomIds },
      status: { $in: ['RESERVE', 'CONFIRME', 'PAYE'] },
      date_checkin: { $lt: dates[30] },
      date_checkout: { $gt: startDate },
    }, { sort: 'id', limit: 500, fields: ['room_id', 'date_checkin', 'date_checkout'], ...(cursor ? { cursor } : {}) });
    for (const reservation of page.items) {
      for (const night of dates.slice(0, 30)) {
        if (night >= reservation.date_checkin && night < reservation.date_checkout) occupied.add(`${reservation.room_id}:${night}`);
      }
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);

  const intervals = [];
  for (const roomId of roomIds) {
    let beginning = null;
    for (let i = 0; i <= 30; i++) {
      const busy = i < 30 && occupied.has(`${roomId}:${dates[i]}`);
      if (busy && !beginning) beginning = dates[i];
      if (!busy && beginning) {
        intervals.push({ id: `busy-${roomId}-${beginning}`, room_id: roomId, date_checkin: beginning, date_checkout: dates[i], status: 'RESERVE' });
        beginning = null;
      }
    }
  }
  return intervals;
}