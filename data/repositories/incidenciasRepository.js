// data/repositories/incidenciasRepository.js
import client from '../api/client';

/** ---- Utilidades ---- */
function withApiKey(params = {}) {
  return { ...(params || {}), apiKey: client.API_KEY }; // el client expone API_KEY en tu implementación
}

function mapServerError(error) {
  // Normaliza .code desde la respuesta de Apps Script
  const code = error?.code || error?.message || 'UNKNOWN';
  const err = new Error(error?.message || code);
  err.code = code;
  return err;
}

async function _handle(resp) {
  if (!resp?.ok) throw mapServerError({ code: resp?.error || 'UNKNOWN' });
  return resp;
}

/** ---- Repositorio público ---- */
export const incidenciasRepository = {
  /**
   * list({ estado?, severidad?, equipo_id?, from?, to?, has_ot?, search?, page=1, page_size=50 })
   * -> { items, total, page, fromCache?:boolean }
   */
  async list(filters = {}) {
    try {
      const qs = withApiKey({
        route: 'incidencias/list',
        estado: filters.estado ?? '',
        severidad: filters.severidad ?? '',
        equipo_id: filters.equipo_id ?? '',
        from: filters.from ?? '',
        to: filters.to ?? '',
        has_ot: typeof filters.has_ot === 'boolean' ? String(filters.has_ot) : '',
        search: filters.search ?? '',
        page: filters.page ?? 1,
        page_size: filters.page_size ?? 50,
      });

      // client.get agrega BASE_URL y serializa query params
      const resp = await client.get('', qs);
      const ok = await _handle(resp);
      return { items: ok.items ?? [], total: ok.total ?? 0, page: ok.page ?? 1, fromCache: !!ok.fromCache };
    } catch (e) {
      // Pasar códigos conocidos hacia arriba
      e.code = e.code || 'NETWORK_ERROR';
      throw e;
    }
  },

  /**
   * create(payload) -> { id }
   * payload: { equipo_id, fecha_reporte, reportado_por, severidad, descripcion, fotos_urls?, estado="abierta", sla_horas? }
   */
  async create(payload) {
    try {
      const body = { ...(payload || {}) };
      const resp = await client.post(
        '',
        withApiKey({ route: 'incidencias/create' }),
        body
      );
      const ok = await _handle(resp);
      return { id: ok?.data?.id };
    } catch (e) {
      e.code = e.code || 'NETWORK_ERROR';
      throw e;
    }
  },

  /**
   * update(id, partial) -> void
   */
  async update(id, partial) {
    try {
      const resp = await client.post(
        '',
        withApiKey({ route: 'incidencias/update' }),
        { id, ...(partial || {}) }
      );
      await _handle(resp);
    } catch (e) {
      e.code = e.code || 'NETWORK_ERROR';
      throw e;
    }
  },

  /**
   * close(id, { causa_raiz, cerrado_por, fecha_cierre }) -> void
   */
  async close(id, closing) {
    try {
      const resp = await client.post(
        '',
        withApiKey({ route: 'incidencias/close' }),
        { id, ...(closing || {}) }
      );
      await _handle(resp);
    } catch (e) {
      e.code = e.code || 'NETWORK_ERROR';
      throw e;
    }
  },
};

export default incidenciasRepository;
