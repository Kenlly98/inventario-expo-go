import { Platform } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_API_BASE;
const KEY  = process.env.EXPO_PUBLIC_API_KEY;

async function http(method, url, body){
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) {
    const err = new Error(json.error || 'SERVER_ERROR');
    err.code = json.error || 'SERVER_ERROR';
    throw err;
  }
  return json;
}

export async function list(params = {}) {
  const q = new URLSearchParams({ ...(params || {}), apiKey: KEY }).toString();
  const url = `${BASE}/?route=evaluaciones/list&${q}`;
  const { items = [], total = 0, page = 1 } = await http('GET', url);
  return { items, total, page };
}

export async function create(payload) {
  const url = `${BASE}/?route=evaluaciones/create&apiKey=${KEY}`;
  const { data } = await http('POST', url, payload);
  return data; // { id }
}
