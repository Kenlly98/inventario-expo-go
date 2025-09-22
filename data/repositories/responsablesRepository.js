// data/repositories/responsablesRepository.js
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import { enqueueJob } from '../offline/queue';

const KEY_CACHE_PREFIX = 'resp.cache.list.'; // + hash

function hashFilters(f = {}) {
  const s = JSON.stringify({
    usuario_id: f.usuario_id || '',
    familia: f.familia || '',
    search: f.search || '',
    page: f.page ?? 1,
    page_size: f.page_size ?? 50,
  });
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

function toApiParams(f = {}) {
  const p = new URLSearchParams();
  p.set('route', 'responsables/list');
  if (f.usuario_id) p.set('usuario_id', String(f.usuario_id).trim());
  if (f.familia) p.set('familia', String(f.familia).trim());
  if (f.search) p.set('search', String(f.search).trim());
  p.set('page', String(f.page ?? 1));
  p.set('page_size', String(f.page_size ?? 50));
  p.set('apiKey', client.API_KEY);
  return p;
}

function throwFromError(code = 'UNKNOWN', message = 'No se pudo completar la acción.') {
  const e = new Error(message);
  e.code = code;
  throw e;
}

function mapError(err) {
  const code = err?.error || err?.code || 'UNKNOWN';
  const messages = {
    MISSING_FIELDS: 'Faltan campos obligatorios.',
    NOT_FOUND_USER: 'Usuario no encontrado.',
    INVALID_FAMILIA: 'Familia inválida.',
    INVALID_MODELO: 'Uno o más modelos no pertenecen a la familia.',
    UNAUTHORIZED: 'No autorizado. Revisa tu configuración.',
    SHEETS_ERROR: 'Error de datos (Sheets). Intenta más tarde.',
    NETWORK_ERROR: 'Sin conexión. Inténtalo de nuevo.',
  };
  throwFromError(code, messages[code] || 'No se pudo completar la acción.');
}

export async function list(filters = {}) {
  const state = await NetInfo.fetch();
  const isOnline = !!state.isConnected;

  const key = KEY_CACHE_PREFIX + hashFilters(filters);

  if (!isOnline) {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw);
      return { ...cached, _fromCache: true };
    }
    mapError({ code: 'NETWORK_ERROR' });
  }

  try {
    const params = toApiParams(filters);
    const res = await client.get('?' + params.toString());
    if (!res?.ok) mapError(res);

    const payload = {
      items: res.items || [],
      total: res.total ?? (res.items?.length ?? 0),
      page: res.page ?? (filters.page ?? 1),
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch (e) {
    mapError(e);
  }
}

export async function create(payload = {}) {
  const body = { ...payload };
  ['usuario_id', 'familia', 'modelos_asignados'].forEach(k => {
    if (body[k] != null) body[k] = String(body[k]).trim();
  });

  const state = await NetInfo.fetch();
  const isOnline = !!state.isConnected;

  if (!isOnline) {
    await enqueueJob({
      type: 'responsables/create',
      route: 'responsables/create',
      method: 'POST',
      body,
    });
    return;
  }

  try {
    const res = await client.post(
      '?route=responsables/create&apiKey=' + encodeURIComponent(client.API_KEY),
      body
    );
    if (!res?.ok) mapError(res);
    return;
  } catch (e) {
    mapError(e);
  }
}

export async function update(key, partial = {}) {
  const body = {
    usuario_id: String(key?.usuario_id || '').trim(),
    familia: String(key?.familia || '').trim(),
    ...partial,
  };
  ['usuario_id', 'familia', 'modelos_asignados'].forEach(k => {
    if (body[k] != null) body[k] = String(body[k]).trim();
  });

  const state = await NetInfo.fetch();
  const isOnline = !!state.isConnected;

  if (!isOnline) {
    await enqueueJob({
      type: 'responsables/update',
      route: 'responsables/update',
      method: 'POST',
      body,
    });
    return;
  }

  try {
    const res = await client.post(
      '?route=responsables/update&apiKey=' + encodeURIComponent(client.API_KEY),
      body
    );
    if (!res?.ok) mapError(res);
    return;
  } catch (e) {
    mapError(e);
  }
}

export async function remove(key) {
  const body = {
    usuario_id: String(key?.usuario_id || '').trim(),
    familia: String(key?.familia || '').trim(),
  };

  const state = await NetInfo.fetch();
  const isOnline = !!state.isConnected;

  if (!isOnline) {
    await enqueueJob({
      type: 'responsables/delete',
      route: 'responsables/delete',
      method: 'POST',
      body,
    });
    return;
  }

  try {
    const res = await client.post(
      '?route=responsables/delete&apiKey=' + encodeURIComponent(client.API_KEY),
      body
    );
    if (!res?.ok) mapError(res);
    return;
  } catch (e) {
    mapError(e);
  }
}
