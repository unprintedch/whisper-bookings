import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const ROLES = ['user', 'admin'];

// Changes an app user's base role. Administrators only, and never their own
// account, so an admin cannot remove their own access from the app.
export default async function(req) {
  try {
    if (!req.headers.get('authorization')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { user_id, role } = await req.json().catch(() => ({}));
    if (typeof user_id !== 'string' || !user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (!ROLES.includes(role)) {
      return Response.json({ error: 'role must be "user" or "admin"' }, { status: 400 });
    }
    if (user_id === caller.id) {
      return Response.json({ error: 'You cannot change your own base role.' }, { status: 400 });
    }

    const target = await base44.asServiceRole.entities.User.get(user_id)
      .catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    const updated = await base44.asServiceRole.entities.User.update(user_id, { role });
    return Response.json({ id: updated.id, role: updated.role });
  } catch (error) {
    console.error('updateBookingUser:', error.message);
    return Response.json({ error: 'Unable to update this user' }, { status: 500 });
  }
}