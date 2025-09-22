// data/repositories/index.js
import api from "../api/client";
import { getJSON, setJSON } from "../../utils/storage";
import { CACHE_KEYS } from "./cacheKeys";

/* --- normalizador base (compat texto) --- */
function normalizeEquipo(raw = {}) {
  const pick = (o, arr, def = "") => {
    const k = arr.find((k) => o?.[k] != null && String(o[k]).length);
    return k ? o[k] : def;
  };
  return {
    id_interno:     pick(raw, ["id_interno", "id", "equipo_id"]),
    serial:         pick(raw, ["serial", "n_serie", "serie"]),
    marca_original: pick(raw, ["marca_original", "marca"]),
    modelo:         pick(raw, ["modelo", "model"]),
    ubicacion:      pick(raw, ["ubicacion", "location"]),
    estado:         pick(raw, ["estado", "status"]),
    ...raw,
  };
}

/* --- helper para agregar nombres desde catálogos (IDs → nombres) --- */
function withCatalogNames(eq, maps) {
  const r = { ...eq };
  const modelo = maps.modelos?.[eq.modelo_id];
  const marca  = modelo ? maps.marcas?.[modelo.marca_id] : maps.marcas?.[eq.marca_id];
  const prov   = maps.proveedores?.[eq.proveedor_id];
  const ubi    = maps.ubicaciones?.[eq.ubicacion_id];
  const est    = maps.estados?.[eq.estado_id];

  r.modelo_name    = (modelo?.modelo   ?? eq.modelo         ?? "");
  r.marca_name     = (marca?.nombre    ?? eq.marca_original ?? "");
  r.proveedor_name = (prov?.nombre     ?? eq.proveedor      ?? "");
  r.ubicacion_name = (ubi?.nombre      ?? eq.ubicacion      ?? "");
  r.estado_name    = (est?.estado      ?? eq.estado         ?? "");

  return r;
}

/* --- cache local de equipos (tus utils) --- */
async function cacheEquiposSave(arr) {
  await setJSON(CACHE_KEYS.EQUIPOS, arr);
}
async function cacheEquiposLoad() {
  const d = await getJSON(CACHE_KEYS.EQUIPOS, []);
  return Array.isArray(d) ? d : [];
}

/* ====================== CATÁLOGOS ======================
   Paso 2: cache de 24h y maps() para resolver IDs → objeto
======================================================== */
export const catalogsRepository = {
  /**
   * Carga /catalogs/all vía tu api.catalogs() y cachea 24h.
   * @param {boolean} force - true para ignorar cache y recargar del server.
   */
  async all(force = false) {
    const TTL_24H = 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (!force) {
      const cached = await getJSON(CACHE_KEYS.CATALOGS, null);
      if (cached?.data && cached?.ts && (now - cached.ts) < TTL_24H) {
        return cached.data;
      }
    }

    const r = await api.catalogs(); // tu endpoint actual
    if (!r.ok) throw new Error(r.error || "API_ERROR");

    const data = r.data || {
      marcas: [], modelos: [], proveedores: [], ubicaciones: [], estados: [], causas_falla: [],
    };

    await setJSON(CACHE_KEYS.CATALOGS, { ts: now, data });
    return data;
  },

  /**
   * Devuelve diccionarios por id, p.ej. maps.proveedores['P-01'] → {id:'P-01', nombre:'Dinamika', ...}
   */
  async maps(force = false) {
    const cat = await this.all(force);
    const toMap = (arr = []) => Object.fromEntries(arr.map((x) => [x.id, x]));
    return {
      marcas:       toMap(cat.marcas),
      modelos:      toMap(cat.modelos),
      proveedores:  toMap(cat.proveedores),
      ubicaciones:  toMap(cat.ubicaciones),
      estados:      toMap(cat.estados),
      causas_falla: toMap(cat.causas_falla),
    };
  },
};

/* ===================== E Q U I P O S ===================== */
export const equiposRepository = {
  /**
   * SWR: retorna cache inmediato y refresca en background.
   * Al refrescar, normaliza y guarda nombres por catálogo en cache.
   */
  async listSWR({ page = 1, page_size = 200 } = {}) {
    const cached = await cacheEquiposLoad();

    (async () => {
      const [fresh, maps] = await Promise.all([
        api.equipos.list({ page, page_size }),
        catalogsRepository.maps(),
      ]);
      if (fresh.ok) {
        const arr = (fresh.data || [])
          .map(normalizeEquipo)
          .map((eq) => withCatalogNames(eq, maps));
        await cacheEquiposSave(arr);
      }
    })().catch(() => {});

    return { data: cached, fromCache: true };
  },

  /**
   * Siempre pide al server, normaliza y resuelve nombres por catálogo.
   */
  async listFresh({ page = 1, page_size = 200 } = {}) {
    const [fresh, maps] = await Promise.all([
      api.equipos.list({ page, page_size }),
      catalogsRepository.maps(),
    ]);
    if (!fresh.ok) throw new Error(fresh.error || "API_ERROR");

    const arr = (fresh.data || [])
      .map(normalizeEquipo)
      .map((eq) => withCatalogNames(eq, maps));

    await cacheEquiposSave(arr);
    return { data: arr, fromCache: false };
  },

  // compat con tu ListScreen actual (si no quieres tocar mucho)
  async list({ page = 1, page_size = 200 } = {}) {
    const res = await this.listFresh({ page, page_size });
    return { data: res.data, total: res.data.length, page };
  },

  async getById(id) {
    const [r, maps] = await Promise.all([
      api.equipos.getById(id),
      catalogsRepository.maps(),
    ]);
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    const eq = normalizeEquipo(r.data);
    return withCatalogNames(eq, maps);
  },

  async updateState({ equipo_id, new_state, motivo, evento_id, usuario_id }) {
    const r = await api.equipos.updateState({ equipo_id, new_state, motivo, evento_id, usuario_id });
    if (!r.ok) throw new Error(r.error || "API_ERROR");

    // actualizar cache local
    const cache = await cacheEquiposLoad();
    const i = cache.findIndex((x) => String(x.id_interno) === String(equipo_id));
    if (i >= 0) {
      cache[i] = { ...cache[i], estado: new_state, estado_name: new_state }; // estado_name se actualizará bien en próximo fetch
      await cacheEquiposSave(cache);
    }
    return true;
  },

  /**
   * Actualiza un equipo completo (guardar IDs + campos opcionales).
   * payload:
   *  { equipo_id, modelo_id?, proveedor_id?, ubicacion_id?, estado_id?,
   *    serial?, qr?, notas?, potencia_w?, peso_kg?, dmx_canales?, firmware? }
   */
  async update(payload) {
    const r = await api.post("equipos/update", payload);
    if (!r.ok) {
      const map = {
        UNAUTHORIZED: 'No autorizado. Revisa tu configuración.',
        NOT_FOUND_EQUIPO: 'Equipo no encontrado.',
        INVALID_MODELO_ID: 'Modelo inválido.',
        INVALID_PROVEEDOR_ID: 'Proveedor inválido.',
        INVALID_UBICACION_ID: 'Ubicación inválida.',
        INVALID_ESTADO_ID: 'Estado inválido.',
        SHEETS_ERROR: 'Error de datos (Sheets). Intenta más tarde.',
      };
      const msg = map[r.error] || (r.error || 'No se pudo actualizar el equipo');
      const err = new Error(msg);
      err.code = r.error || 'API_ERROR';
      throw err;
    }

    // Actualiza cache local con payload + *_name resuelto (para UX inmediata)
    try {
      const [cache, maps] = await Promise.all([cacheEquiposLoad(), catalogsRepository.maps()]);
      const i = cache.findIndex((x) => String(x.id_interno) === String(payload.equipo_id));
      if (i >= 0) {
        const merged = { ...cache[i], ...payload };
        cache[i] = withCatalogNames(merged, maps);
        await cacheEquiposSave(cache);
      }
    } catch {
      // si falla actualizar cache, no rompemos el flujo
    }

    return true;
  },
};

/* =================== INCIDENCIAS =================== */
export const incidenciasRepository = {
  async create({ equipo_id, reportado_por, severidad = "menor", descripcion = "", fotos_urls = [], sla_horas = 48 }) {
    const r = await api.incidencias.create({ equipo_id, reportado_por, severidad, descripcion, fotos_urls, sla_horas });
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    return r.data ?? true;
  },
  async list({ estado, equipo, from, to, search, page = 1, page_size = 50 } = {}) {
    const r = await api.incidencias.list({ estado, equipo, from, to, search, page, page_size });
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    const items = Array.isArray(r.data) ? r.data : [];
    return { data: items, total: items.length, page, page_size };
  },
};

/* ================== ÓRDENES DE TRABAJO ================== */
export const otsRepository = {
  async create(body) { const r = await api.post("ots/create", body);   if (!r.ok) throw new Error(r.error || "API_ERROR"); return r.data; },
  async approve(p)  { const r = await api.post("ots/approve", p);      if (!r.ok) throw new Error(r.error || "API_ERROR"); return true; },
  async close(p)    { const r = await api.post("ots/close", p);        if (!r.ok) throw new Error(r.error || "API_ERROR"); return true; },
};

/* ===================== DOCUMENTOS ===================== */
export const documentosRepository = {
  async link(body) { const r = await api.docs.link(body); if (!r.ok) throw new Error(r.error || "API_ERROR"); return true; },
};

/* ====================== DASHBOARD ====================== */
export const dashboardRepository = {
  async owners(period) {
    const r = await (api.dashboard?.owners ? api.dashboard.owners(period) : api.kpis(period));
    if (!r?.ok) {
      const e = new Error(r?.error || "API_ERROR");
      e.code = r?.error || "API_ERROR";
      throw e;
    }
    return r.data; // contrato completo { period, kpis, deltas, series, proximos_eventos, alertas, meta }
  },
};
