export async function signedInUser(base44, req) {
  if (!/^Bearer\s+\S+$/i.test(req.headers.get('authorization') || '')) return null;
  try { return await base44.auth.me(); } catch { return null; }
}

export async function publicSettings(base44) {
  const { items } = await base44.asServiceRole.entities.PublicAccessSettings.filter({}, { sort: '-updated_date', limit: 1 });
  return items[0] || {};
}

export async function digest(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

export async function settingsFingerprint(settings) {
  return digest(JSON.stringify([settings.id, settings.is_password_protected, settings.access_password_hash, settings.access_password_salt]));
}

export async function issuePublicSession(base44, settings) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  await base44.asServiceRole.entities.PublicAccessSession.create({
    token_hash: await digest(token), settings_fingerprint: await settingsFingerprint(settings),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  });
  // Drop the tokens that have expired so the table does not grow forever.
  await base44.asServiceRole.entities.PublicAccessSession.deleteMany({ expires_at: { $lt: new Date().toISOString() } });
  return token;
}

export async function validPublicSession(base44, settings, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { items } = await base44.asServiceRole.entities.PublicAccessSession.filter({
    token_hash: await digest(token), settings_fingerprint: await settingsFingerprint(settings),
    expires_at: { $gt: new Date().toISOString() },
  }, { limit: 1, fields: ['expires_at'] });
  return items.length === 1;
}

export async function consumePublicQuota(base44, key, limit, windowMs) {
  const query = { ip: key, window_start: { $gte: new Date(Date.now() - windowMs).toISOString() } };
  if (await base44.asServiceRole.entities.PublicAccessAttempt.count(query) >= limit) return false;
  await base44.asServiceRole.entities.PublicAccessAttempt.create({ ip: key, window_start: new Date().toISOString(), attempts: 1 });
  return true;
}

export function staffUser(user) {
  return user?.role === 'admin' || (user?.role === 'user' && user.custom_role === 'full_access');
}