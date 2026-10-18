const ITERATIONS = 100000;

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt() {
  return hex(crypto.getRandomValues(new Uint8Array(16)));
}

async function derive(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({
    name: 'PBKDF2', salt: encoder.encode(salt), iterations: ITERATIONS, hash: 'SHA-256',
  }, key, 256));
}

function equal(a, b) {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return difference === 0;
}

async function passwordFields(password) {
  const salt = randomSalt();
  return {
    access_password_hash: `pbkdf2$${ITERATIONS}$${await derive(password, salt)}`,
    access_password_salt: salt,
    access_password: '',
  };
}

// Harden old records before checking any submitted password, including on an empty probe.
// A legacy digest can be wrapped in PBKDF2 without knowing the original password: this
// removes the fast verifier from storage immediately, rather than waiting for a login.
export async function hardenPublicPassword(base44, settings) {
  if (!settings.id) return settings;
  let changes = null;
  const stored = settings.access_password_hash || '';
  const salt = settings.access_password_salt;
  if (!stored && settings.access_password) {
    changes = await passwordFields(settings.access_password);
  } else if (/^[a-f0-9]{64}$/i.test(stored) && salt) {
    changes = {
      access_password_hash: `pbkdf2-legacy$${ITERATIONS}$${await derive(stored.toLowerCase(), salt)}`,
      access_password: '',
    };
  } else if (stored && settings.access_password) {
    changes = { access_password: '' };
  }
  if (!changes) return settings;
  await base44.asServiceRole.entities.PublicAccessSettings.update(settings.id, changes);
  return { ...settings, ...changes };
}

export async function publicPasswordMatches(base44, settings, password) {
  const match = /^(pbkdf2|pbkdf2-legacy)\$100000\$([a-f0-9]{64})$/.exec(settings.access_password_hash || '');
  const salt = settings.access_password_salt;
  if (!match || !salt || typeof password !== 'string' || password.length > 1024) return false;
  let input = password;
  if (match[1] === 'pbkdf2-legacy') {
    // This digest is only a compatibility prehash, never a stored or compared verifier.
    // The password comparison below always runs the full PBKDF2 work factor.
    input = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`)));
  }
  if (!equal(await derive(input, salt), match[2])) return false;
  if (match[1] === 'pbkdf2-legacy') {
    const changes = await passwordFields(password);
    await base44.asServiceRole.entities.PublicAccessSettings.update(settings.id, changes);
    Object.assign(settings, changes);
  }
  return true;
}