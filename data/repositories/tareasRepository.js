// data/repositories/tareasRepository.js
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../api/client';
import { enqueueJob } from '../offline/queue';

const KEY_LAST_SYNC = 'cache.tareas.last_sync.v1';

/* --------------------------- utils --------------------------- */
function normalizeTask(input = {}) {
  const o = { ...input };
  ['id','titulo','descripcion','asignado_a_usuario','equipo_id','evento_id','prioridad','estado','creado_por']
    .forEach(k => { if (o[k] != null) o[k] = String(o[k]).trim(); });
  if (o.fecha_limite) o.fecha_limite = String(o.fecha_limite).slice(0, 10);
  return o;
}
function qToHash(q = {}) {
  return JSON.stringify(Object.entries(q).sort());
}
function cacheKeyForList(q = {}) {
  return `tasks.cache.list.${qToHash(q)}`;
}
export const TASK_ERRORS = {
  MISSING_FIELDS: 'Faltan campos obligatorios.',
  NOT_FOUND_TASK: 'Tarea no encontrada.',
  UNAUTHORIZED : 'No autorizado. Revisa configuración.',
  INVALID_STATE : 'Estado de tarea inválido.',
  SHEETS_ERROR  : 'Error en datos (Sheets). Intenta luego.',
  NETWORK_ERROR : 'Sin conexión. Inténtalo de nuevo.',
};

/* --------------------------- list --------------------------- */
async function list(params = {}) {
  const query = {
    route: 'tareas/list',
    page: 1, page_size: 50,
    ...params,
  };
  const key = cacheKeyForList(query);
  // cache-first si no hay red
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    const cached = await AsyncStorage.getItem(key);
    const last = await AsyncStorage.getItem(KEY_LAST_SYNC);
    const payload = cached ? JSON.parse(cached) : { items: [], total: 0, page: 1, _fromCache: true, _lastSync:last };
    return payload;
  }
  const res = await client.get('', query);
  if (!res?.ok) {
    // devuelve cache si existe
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const last = await AsyncStorage.getItem(KEY_LAST_SYNC);
      const payload = { ...JSON.parse(cached), _fromCache: true, _lastSync:last };
      return payload;
    }
    const msg = TASK_ERRORS[res?.error] || 'Error al listar tareas.';
    const e = new Error(msg); e.code = res?.error || 'UNKNOWN'; throw e;
  }
  const data = {
    items: (res.items || []).map(normalizeTask),
    total: res.total || 0,
    page: res.page || 1,
    _fromCache: false,
  };
  await AsyncStorage.setItem(key, JSON.stringify(data));
  await AsyncStorage.setItem(KEY_LAST_SYNC, new Date().toISOString());
  return data;
}

/* -------------------------- create -------------------------- */
async function create(payload = {}, { offlineEnqueueIfNoNet = true } = {}) {
  const net = await NetInfo.fetch();
  const data = normalizeTask(payload);
  if (!net.isConnected && offlineEnqueueIfNoNet) {
    await enqueueJob({ type: 'tareas/create', payload: data });
    return { id: `offline_${Date.now()}` };
  }
  const res = await client.post('', { route: 'tareas/create', ...data });
  if (!res?.ok) {
    const e = new Error(TASK_ERRORS[res?.error] || 'No se pudo crear la tarea.');
    e.code = res?.error || 'UNKNOWN';
    throw e;
  }
  return res.data || { id: '' };
}

/* -------------------------- update -------------------------- */
async function update(id, partial = {}, { offlineEnqueueIfNoNet = true } = {}) {
  const net = await NetInfo.fetch();
  const data = { id: String(id), ...partial };
  if (!net.isConnected && offlineEnqueueIfNoNet) {
    await enqueueJob({ type: 'tareas/update', payload: data });
    return;
  }
  const res = await client.post('', { route: 'tareas/update', ...data });
  if (!res?.ok) {
    const e = new Error(TASK_ERRORS[res?.error] || 'No se pudo actualizar la tarea.');
    e.code = res?.error || 'UNKNOWN';
    throw e;
  }
}

/* ------------------------- complete ------------------------- */
async function complete(id, { completada_por, fecha_cierre }, { offlineEnqueueIfNoNet = true } = {}) {
  const net = await NetInfo.fetch();
  const data = { id: String(id), estado: 'completada', completada_por, fecha_cierre };
  if (!net.isConnected && offlineEnqueueIfNoNet) {
    await enqueueJob({ type: 'tareas/complete', payload: data });
    return;
  }
  const res = await client.post('', { route: 'tareas/complete', ...data });
  if (!res?.ok) {
    const e = new Error(TASK_ERRORS[res?.error] || 'No se pudo completar la tarea.');
    e.code = res?.error || 'UNKNOWN';
    throw e;
  }
}

/* -------------------------- remove -------------------------- */
async function remove(id, { offlineEnqueueIfNoNet = true } = {}) {
  const net = await NetInfo.fetch();
  const data = { id: String(id) };
  if (!net.isConnected && offlineEnqueueIfNoNet) {
    await enqueueJob({ type: 'tareas/delete', payload: data });
    return;
  }
  const res = await client.post('', { route: 'tareas/delete', ...data });
  if (!res?.ok) {
    const e = new Error(TASK_ERRORS[res?.error] || 'No se pudo eliminar la tarea.');
    e.code = res?.error || 'UNKNOWN';
    throw e;
  }
}

export const tareasRepository = { list, create, update, complete, remove };
