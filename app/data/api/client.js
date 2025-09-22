// app/data/api/client.js
const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
const API_KEY  = process.env.EXPO_PUBLIC_API_KEY;

function withApiKey(route) {
  const r = encodeURIComponent(route);
  const k = encodeURIComponent(API_KEY || '');
  return `${API_BASE}?route=${r}&apiKey=${k}`;
}

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error('NETWORK_ERROR')), ms));
}

async function handle(res) {
  let json = {};
  try {
    json = await res.json();
  } catch (e) {
    // Respuesta sin cuerpo JSON: usamos objeto vacío
    json = {};
  }
  if (!res.ok || json?.ok === false) {
    const err = new Error(json?.error || `HTTP_${res.status}`);
    err.code = json?.error || `HTTP_${res.status}`;
    throw err;
  }
  return json;
}

/**
 * client.request('auth/login', { method:'POST', body:{...}, ignoreErrors?:boolean })
 */
const client = {
  async request(route, { method = 'GET', body, headers, ignoreErrors = false } = {}) {
    if (!API_BASE || !API_KEY) {
      const e = new Error('UNAUTHORIZED');
      e.code = 'UNAUTHORIZED';
      throw e;
    }
    const url = withApiKey(route);
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
    };
    try {
      const res = await Promise.race([fetch(url, opts), timeout(15000)]);
      return await handle(res);
    } catch (err) {
      if (ignoreErrors) return { ok: false, error: err?.code || err?.message || 'REQUEST_ERROR' };
      if (err?.message === 'NETWORK_ERROR') {
        const e = new Error('NETWORK_ERROR');
        e.code = 'NETWORK_ERROR';
        throw e;
      }
      throw err;
    }
  },
};

export default client;
