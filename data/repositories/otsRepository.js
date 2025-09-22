// data/repositories/otsRepository.js
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import robusto del client (soporta default o named export)
import * as clientMod from '../../data/api/client';
const client = clientMod.client || clientMod.default || clientMod;

// Cola offline
import { enqueueJob, listJobsByType } from '../../data/offline/queue';
import { catalogsRepository } from './catalogsRepository';

const KEY_LAST_SYNC = 'cache.ots.last_sync.v1';

function normalizeOT(input = {}) {
  const o = { ...input };
  ['titulo','equipo_id','responsable','proveedor','estado','notas'].forEach(k=>{
    if (o[k] != null) o[k] = String(o[k]).trim();
  });
  if (!Array.isArray(o.repuestos)) o.repuestos = [];
  return o;
}

async function assertCatalogsForOT(payload) {
  const p = normalizeOT(payload);
  // Responsable (si viene)
  if (p.responsable) {
    const responsables = await catalogsRepository.getCatalog('responsables');
    if (!responsables.includes(p.responsable)) {
      const e = new Error('Responsable inválido'); e.code = 'CATALOG_INVALID'; throw e;
    }
  }
  // Proveedor (si viene)
  if (p.proveedor) {
    const proveedores = await catalogsRepository.getCatalog('proveedores');
    if (!proveedores.includes(p.proveedor)) {
      const e = new Error('Proveedor inválido'); e.code = 'CATALOG_INVALID'; throw e;
    }
  }
  // Repuestos (si vienen)
  if (p.repuestos?.length) {
    const repuestos = await catalogsRepository.getCatalog('repuestos');
    const bad = p.repuestos.filter(r => !repuestos.includes(String(r)));
    if (bad.length) {
      const e = new Error('Repuestos inválidos: ' + bad.join(', ')); e.code = 'CATALOG_INVALID'; throw e;
    }
  }
  return p;
}

export const otsRepository = {
  /** Lista desde el server */
  async list({ page=1, page_size=100, q='', estado='', responsable='' } = {}) {
    const res = await client.get('ots/list', { page, page_size, q, estado, responsable });
    if (!res?.ok) { const e = new Error(res?.error || 'NETWORK_ERROR'); e.code = res?.error || 'NETWORK_ERROR'; throw e; }
    await AsyncStorage.setItem(KEY_LAST_SYNC, new Date().toISOString());
    return res; // { ok:true, data:[...] }
  },

  /** Crea OT (con validación de catálogos) */
  async create(payload) {
    const { isConnected } = await NetInfo.fetch();
    const p = await assertCatalogsForOT(payload);
    if (!p.responsable) { const e = new Error('Responsable es obligatorio'); e.code = 'CATALOG_INVALID'; throw e; }

    if (!isConnected) {
      await enqueueJob({ endpoint:'ots/create', method:'POST', payload:p, type:'OT_CREATE' });
      return { ok:true, queued:true, offline:true };
    }
    const res = await client.post('ots/create', p);
    if (!res?.ok) { const e = new Error(res?.error || 'SHEETS_ERROR'); e.code = res?.error || 'SHEETS_ERROR'; throw e; }
    return res;
  },

  /** Actualiza (valida sólo campos que cambian) */
  async update(id, patch) {
    const { isConnected } = await NetInfo.fetch();
    const p = normalizeOT(patch);
    await assertCatalogsForOT(p); // valida sólo lo presente

    if (!isConnected) {
      await enqueueJob({ endpoint:'ots/update', method:'POST', payload:{ id, ...p }, type:'OT_UPDATE' });
      return { ok:true, queued:true, offline:true };
    }
    const res = await client.post('ots/update', { id, ...p });
    if (!res?.ok) { const e = new Error(res?.error || 'SHEETS_ERROR'); e.code = res?.error || 'SHEETS_ERROR'; throw e; }
    return res;
  },

  /** Cierra OT */
  async close(id, { notas_cierre = '', causa = '' } = {}) {
    const { isConnected } = await NetInfo.fetch();
    const payload = { id, notas_cierre: String(notas_cierre||''), causa: String(causa||'') };
    if (!isConnected) {
      await enqueueJob({ endpoint:'ots/close', method:'POST', payload, type:'OT_CLOSE' });
      return { ok:true, queued:true, offline:true };
    }
    const res = await client.post('ots/close', payload);
    if (!res?.ok) { const e = new Error(res?.error || 'SHEETS_ERROR'); e.code = res?.error || 'SHEETS_ERROR'; throw e; }
    return res;
  },

  /** Detalle OT (para OTDetail) */
  async get(id) {
    const res = await client.get('ots/get', { id });
    if (!res?.ok) { const e = new Error(res?.error || 'NETWORK_ERROR'); e.code = res?.error || 'NETWORK_ERROR'; throw e; }
    return res; // { ok:true, data:{...} }
  },

  /** Historial (para OTDetail) */
  async history(id) {
    const res = await client.get('ots/history', { id });
    if (!res?.ok) {
      // Fallback básico si aún no hay endpoint
      try {
        const ot = await this.get(id);
        const base = ot?.data || {};
        const timeline = [];
        if (base.createdAt) timeline.push({ at: base.createdAt, action: 'creada', by: base.creado_por || 'sistema' });
        if (base.updatedAt && base.updatedAt !== base.createdAt) {
          timeline.push({ at: base.updatedAt, action: 'actualizada', by: base.actualizado_por || 'sistema' });
        }
        return { ok: true, data: timeline };
      } catch {
        const e = new Error('NETWORK_ERROR'); e.code = 'NETWORK_ERROR'; throw e;
      }
    }
    return res; // { ok:true, data:[ ... ] }
  },

  /** (Opcional) Mezcla OTs del server + encoladas offline (optimista) */
  async listWithPending(params = {}) {
    const { data: remote = [] } = await this.list(params);
    const pendingCreates = await listJobsByType?.('OT_CREATE');
    const pend = (pendingCreates || []).map(j => ({
      id: `pending_${j.id}`,
      titulo: j.payload?.titulo || '(pendiente)',
      equipo_id: j.payload?.equipo_id || '',
      responsable: j.payload?.responsable || '',
      proveedor: j.payload?.proveedor || '',
      repuestos: j.payload?.repuestos || [],
      estado: 'pendiente_sync',
      fecha_programada: j.payload?.fecha_programada || '',
      notas: j.payload?.notas || '',
      _pending: true,
    }));
    return { ok: true, data: [...pend, ...remote] };
  },
};
