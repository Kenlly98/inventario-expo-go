// data/repositories/documentosRepository.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { client } from '../api/client';
import { enqueueDocumentoLink } from '../offline/queue';

const CACHE_PREFIX = 'docs.cache.';

function hashKey(obj) {
  // hash simple y estable
  const s = JSON.stringify(obj, Object.keys(obj).sort());
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

function mapError(code) {
  const map = {
    MISSING_FIELDS  : 'Faltan campos obligatorios.',
    INVALID_DATE    : 'Fecha inválida.',
    DUPLICATE_DOC   : 'Ya existe un documento con esa URL.',
    NOT_FOUND_EQUIPO: 'Equipo no encontrado.',
    UNAUTHORIZED    : 'No autorizado. Revisa tu configuración.',
    OFFLINE         : 'Sin conexión. Inténtalo de nuevo.',
  };
  return map[code] || 'No se pudo completar la acción';
}

export const documentosRepository = {
  async list(params = {}) {
    const state = await NetInfo.fetch();
    const page = params.page ?? 1;
    const page_size = params.page_size ?? 50;

    const filters = {
      equipo_id: params.equipo_id || '',
      tipo     : params.tipo || '',
      from     : params.from || '',
      to       : params.to || '',
      search   : params.search || '',
      page,
      page_size,
    };

    const cacheKey = `${CACHE_PREFIX}${hashKey(filters)}`;

    if (!state.isConnected) {
      const raw = await AsyncStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed._fromCache = true;
        return parsed; // { items, total, page, _fromCache:true }
      }
      // sin cache
      return { items: [], total: 0, page, _fromCache: true };
    }

    try {
      const json = await client.get('documentos/list', filters);
      const payload = { items: json.items || [], total: json.total || 0, page: json.page || page };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
      return payload;
    } catch (e) {
      const err = new Error(mapError(e.code));
      err.code = e.code;
      throw err;
    }
  },

  async link(payload, { allowOfflineEnqueue = true } = {}) {
    const required = ['equipo_id','tipo','archivo_url','fecha'];
    const missing = required.filter((k) => !payload?.[k]);
    if (missing.length) {
      const err = new Error('Faltan campos obligatorios.');
      err.code = 'MISSING_FIELDS';
      throw err;
    }
    const state = await NetInfo.fetch();
    if (!state.isConnected && allowOfflineEnqueue) {
      await enqueueDocumentoLink(payload);
      return { id: null, _enqueued: true };
    }

    try {
      const json = await client.post('documentos/link', payload);
      return { id: json?.data?.id || null };
    } catch (e) {
      const err = new Error(mapError(e.code));
      err.code = e.code;
      throw err;
    }
  },
};
