export async function readSecurityBody(req, maxBytes = 65536) {
  if (req.method !== 'POST') throw Object.assign(new Error('Method not allowed'), { status: 405 });
  if (Number(req.headers.get('content-length') || 0) > maxBytes) {
    throw Object.assign(new Error('Request too large'), { status: 413 });
  }
  const reader = req.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw Object.assign(new Error('Request too large'), { status: 413 });
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes) || '{}'); }
  catch { throw Object.assign(new Error('Invalid request'), { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Object.assign(new Error('Invalid request'), { status: 400 });
  }
  return body;
}

export function securityFailure(error, fallback) {
  const status = [400, 405, 413].includes(error?.status) ? error.status : 500;
  return Response.json({ error: status === 500 ? fallback : error.message }, { status });
}