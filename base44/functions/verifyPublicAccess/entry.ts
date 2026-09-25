import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Verifies public page access without ever exposing access_password to the client.
// Returns only non-sensitive booleans: isPasswordProtected, hasAccess, allowPublicBooking.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { password } = body || {};

    const settingsList = await base44.asServiceRole.entities.PublicAccessSettings.list();
    const settings = settingsList[0] || {};

    const isPasswordProtected = !!settings.is_password_protected;
    const allowPublicBooking = !!settings.allow_public_booking;

    let hasAccess = false;
    if (!isPasswordProtected) {
      hasAccess = true;
    } else if (password && password === settings.access_password) {
      hasAccess = true;
    }

    // Never include access_password in the response
    return Response.json({ isPasswordProtected, hasAccess, allowPublicBooking });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}