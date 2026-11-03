import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    if (!req.headers.get('authorization')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { search = '', offset = 0 } = await req.json().catch(() => ({}));
    if (typeof search !== 'string' || search.length > 200 || !Number.isInteger(offset) || offset < 0 || offset > 10000) {
      return Response.json({ error: 'Invalid search or offset' }, { status: 400 });
    }
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = escapedSearch ? {
      $or: [
        { full_name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ],
    } : {};
    const pageSize = 50;
    // Only the authenticated admin checked above may read the account directory.
    // User does not support cursor pages or count; use bounded offset pagination.
    const rows = await base44.asServiceRole.entities.User.filter(query, '-created_date', pageSize + 1, offset);
    const users = rows.slice(0, pageSize).map((record) => ({
      id: record.id,
      full_name: record.full_name,
      email: record.email,
      role: record.role,
      custom_role: record.custom_role,
      agency_id: record.agency_id,
      created_date: record.created_date,
    }));
    return Response.json({
      users,
      displayed_count: offset + users.length,
      next_offset: rows.length > pageSize ? offset + pageSize : null,
    });
  } catch (error) {
    console.error('listBookingUsers:', error.message);
    return Response.json({ error: 'Unable to load the user list' }, { status: 500 });
  }
}