import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { publicSettings, signedInUser, validPublicSession } from '../../shared/publicAccess.ts';
import { validBookingDate } from '../../shared/bookingWrites.ts';
import { publicOccupancy } from '../../shared/publicAvailability.ts';

const ROOM_FIELDS = ['site_id', 'number', 'name', 'capacity_max', 'type_label', 'bed_configuration_ids', 'is_active'];
const SITE_FIELDS = ['name', 'slug', 'is_active'];
const BED_FIELDS = ['name', 'max_occupancy', 'sort_order'];
const pick = (record, fields) => Object.fromEntries(['id', ...fields].filter(field => record[field] !== undefined).map(field => [field, record[field]]));

// Deliberately public availability lookup. Private entity access remains restricted:
// when the public page has a password, its verified session is required server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken, startDate, siteName = 'all', bedConfigId = 'all', cursor } = await req.json();
    if (!validBookingDate(startDate) || !['all', 'Serengeti', 'Tarangire'].includes(siteName) ||
        typeof bedConfigId !== 'string' || bedConfigId.length > 64 ||
        (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 4096))) {
      return Response.json({ error: 'Invalid availability request' }, { status: 400 });
    }

    const settings = await publicSettings(base44);
    const user = await signedInUser(base44, req);
    if (!user && settings.is_password_protected && !(await validPublicSession(base44, settings, accessToken))) {
      return Response.json({ error: 'Public access required' }, { status: 403 });
    }

    const [sitePage, bedPage, notificationPage] = await Promise.all([
      base44.asServiceRole.entities.Site.filter({ is_active: true }, { sort: 'name', limit: 50, fields: SITE_FIELDS }),
      base44.asServiceRole.entities.BedConfiguration.filter({}, { sort: 'sort_order', limit: 50, fields: BED_FIELDS }),
      base44.asServiceRole.entities.NotificationSettings.filter({}, { sort: '-updated_date', limit: 1, fields: ['booking_request_confirm_title', 'booking_request_confirm_message'] }),
    ]);
    const sites = sitePage.items.map(site => pick(site, SITE_FIELDS));
    const siteIds = sites.filter(site => siteName === 'all' || site.name === siteName).map(site => site.id);
    const roomQuery = { is_active: true, site_id: { $in: siteIds } };
    if (bedConfigId !== 'all') roomQuery.bed_configuration_ids = bedConfigId;
    const roomPage = siteIds.length ? await base44.asServiceRole.entities.Room.filter(roomQuery, {
      sort: 'number', limit: 50, fields: ROOM_FIELDS, ...(cursor ? { cursor } : {}),
    }) : { items: [], has_more: false, next_cursor: null };
    const rooms = roomPage.items.map(room => pick(room, ROOM_FIELDS));
    const reservations = await publicOccupancy(base44, rooms.map(room => room.id), startDate);
    const notification = notificationPage.items[0];

    return Response.json({
      rooms, sites, reservations,
      bedConfigurations: bedPage.items.map(bed => pick(bed, BED_FIELDS)),
      confirmation: {
        title: notification?.booking_request_confirm_title || 'Request received',
        message: notification?.booking_request_confirm_message || 'We will get back to you shortly.',
      },
      has_more: roomPage.has_more,
      next_cursor: roomPage.next_cursor || null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('getPublicAvailability error:', error);
    return Response.json({ error: 'Unable to load availability' }, { status: 500 });
  }
}