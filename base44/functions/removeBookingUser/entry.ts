import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Removes an app user. Reachable only by a signed-in administrator, and never
// for the caller's own account, so an admin cannot sign themselves out by mistake.
export default async function(req) {
  try {
    if (!req.headers.get('authorization')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me().catch((error) => error.status === 401 ? null : Promise.reject(error));
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { user_id } = await req.json().catch(() => ({}));
    if (typeof user_id !== 'string' || !user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }
    if (user_id === caller.id) {
      return Response.json({ error: 'You cannot remove your own account.' }, { status: 400 });
    }

    const target = await base44.asServiceRole.entities.User.get(user_id)
      .catch((error) => error.status === 404 ? null : Promise.reject(error));
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    await base44.asServiceRole.entities.User.delete(user_id);
    return Response.json({ removed: true, email: target.email });
  } catch (error) {
    console.error('removeBookingUser:', error.message);
    return Response.json({ error: 'Unable to remove this user' }, { status: 500 });
  }
}