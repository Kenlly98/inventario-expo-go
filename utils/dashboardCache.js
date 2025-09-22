// utils/dashboardCache.js
// Helpers de caché para el Dashboard (Home): guarda/carga por widget
// Estructura de data esperada (server):
// {
//   period: "YYYY-MM",
//   kpis: {...},
//   deltas: {...},
//   series: {...},
//   proximos_eventos: [...],
//   alertas: {...},
//   meta: { generated_at, source, version }
// }

import { getJSON, setJSON, removeItem } from './storage';
import { CACHE_KEYS } from '../data/repositories/cacheKeys';

/**
 * Guarda en caché por widget (keys separadas).
 * @param {string} period YYYY-MM
 * @param {object} data payload completo del endpoint dashboard/owners
 */
export async function saveDashboard(period, data = {}) {
  const {
    kpis = {},
    deltas = {},
    series = {},
    proximos_eventos = [],
    alertas = {},
    meta = {},
  } = data;

  await Promise.all([
    setJSON(CACHE_KEYS.KPI(period), { kpis, deltas, series }),
    setJSON(CACHE_KEYS.EVENTS_NEXT14D, proximos_eventos || []),
    setJSON(CACHE_KEYS.ALERTS_LAST, alertas || {}),
    setJSON(CACHE_KEYS.META(period), meta || {}),
  ]);
}

/**
 * Carga el contenido del dashboard desde caché.
 * @param {string} period YYYY-MM
 * @returns {{ kpi: {kpis:Object, deltas:Object, series:Object }|null,
 *            events: Array,
 *            alerts: Object,
 *            meta: Object|null }}
 */
export async function loadDashboard(period) {
  const [kpi, events, alerts, meta] = await Promise.all([
    getJSON(CACHE_KEYS.KPI(period), null),
    getJSON(CACHE_KEYS.EVENTS_NEXT14D, []),
    getJSON(CACHE_KEYS.ALERTS_LAST, {}),
    getJSON(CACHE_KEYS.META(period), null),
  ]);

  return { kpi, events, alerts, meta };
}

/**
 * Limpia la caché del dashboard para un periodo dado.
 * Útil en escenarios de logout o refresh forzado de mes.
 * @param {string} period YYYY-MM
 */
export async function clearDashboard(period) {
  await Promise.all([
    removeItem(CACHE_KEYS.KPI(period)),
    removeItem(CACHE_KEYS.META(period)),
    // Nota: events/alerts son globales a la vista, opcional limpiar:
    // removeItem(CACHE_KEYS.EVENTS_NEXT14D),
    // removeItem(CACHE_KEYS.ALERTS_LAST),
  ]);
}

/**
 * Rehidrata un objeto de UI “completo” cuando vienes de caché,
 * mimetizando el shape del server para simplificar el render.
 * @param {string} period YYYY-MM
 * @returns {object|null} payload estilo server (o null si incompleto)
 */
export async function hydrateDashboardPayloadFromCache(period) {
  const { kpi, events, alerts, meta } = await loadDashboard(period);
  if (!kpi) return null; // sin KPIs no tiene sentido rehidratar
  return {
    period,
    kpis: kpi.kpis || {},
    deltas: kpi.deltas || {},
    series: kpi.series || {},
    proximos_eventos: events || [],
    alertas: alerts || {},
    meta: meta || {},
  };
}
