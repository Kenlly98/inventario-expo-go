// data/repositories/cacheKeys.js

// Claves de caché centralizadas para AsyncStorage / Storage.
// Nota: Evita cambiar estos nombres en producción para no invalidar cachés previas.
export const CACHE_KEYS = {
  // Inventario
  EQUIPOS: 'equipos.v1',
  CATALOGS: 'catalogs.v1',   // 👈 Nueva clave para catálogos (24h cache)

  // Dashboard (por periodo YYYY-MM)
  KPI: (period) => `cache.kpi.${period}`,          // { kpis, deltas, series }
  EVENTS_NEXT14D: 'cache.events.next14d',          // [ ...proximos_eventos ]
  ALERTS_LAST: 'cache.alerts.latest',              // { incidencias_criticas, ots_pendientes, ... }
  META: (period) => `cache.meta.${period}`,        // { generated_at, source, version }

  // (Opcional) agrega aquí otras claves si luego las necesitas:
  // QUEUE: 'offline.queue.v1',
  // USER_PREFS: 'user.prefs.v1',
};

export default CACHE_KEYS;
