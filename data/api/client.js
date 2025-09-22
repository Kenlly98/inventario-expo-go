// data/api/client.js
import { Platform } from "react-native";
import Constants from "expo-constants";

/** ========= ENV + FALLBACKS ========= */
const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};

// ⚠️ Fallbacks “duros” para Snack / Web cuando extra/.env no cargan:
const FALLBACK_BASE   = "https://script.google.com/macros/s/AKfycbxggPgr4AH5Dope6izIGSEksdwxOqfwm1U8zgb1noCqLICD6_EclLYpuF2eTZqtUhU/exec";
const FALLBACK_KEY    = "KENLLY-INV-2025";
const FALLBACK_WORKER = "https://kenlly.kenllycalderonmorales.workers.dev/?u="; // tu Worker

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE ?? extra.apiBase ?? FALLBACK_BASE).trim();
const API_KEY  = (process.env.EXPO_PUBLIC_API_KEY  ?? extra.apiKey  ?? FALLBACK_KEY).trim();

// Worker solo Web (si tienes uno configurado en .env/extra lo usa; si no, usa FALLBACK_WORKER)
const CORS_WORKER = (process.env.EXPO_PUBLIC_CORS_WORKER ?? extra.corsWorker ?? FALLBACK_WORKER).trim();
const CORS_KEY    = (process.env.EXPO_PUBLIC_CORS_KEY    ?? extra.corsKey    ?? "").trim();

const isWeb = Platform.OS === "web";
const DEFAULT_TIMEOUT_MS = 15000;

/** ========= Utils ========= */
// Periodo YYYY-MM actual (fallback si no se pasa uno)
function toPeriod(d = new Date()) {
  try { return d.toISOString().slice(0, 7); } catch { return ""; }
}

function qs(params = {}) {
  const clean = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .reduce((acc, [k, v]) => ((acc[k] = String(v)), acc), {});
  return new URLSearchParams(clean).toString();
}

async function parseJSON(res) {
  const text = await res.text(); // tolerante al content-type
  try { return text ? JSON.parse(text) : {}; }
  catch { return { ok: false, error: "INVALID_JSON", status: res.status, raw: text }; }
}

function buildUrl(route, params) {
  const query = qs({ ...(params || {}), route, apiKey: API_KEY });
  const real  = `${BASE_URL}?${query}`;
  // Web → pasa por Worker; nativo → directo
  const final = isWeb && CORS_WORKER ? `${CORS_WORKER}${encodeURIComponent(real)}` : real;
  if (typeof __DEV__ !== "undefined" && __DEV__) console.debug("[client] URL →", final);
  return final;
}

/** ========= Core request ========= */
async function request(route, { method = "GET", params, body, timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const url = buildUrl(route, params);

    // headers base
    const headers = {};
    // Si protegiste el Worker con WORKER_KEY, mándala:
    if (isWeb && CORS_WORKER && CORS_KEY) headers["x-worker-key"] = CORS_KEY;

    if (method === "POST") {
      headers["Content-Type"] = isWeb ? "text/plain;charset=utf-8" : "application/json";
    }

    const payload = method === "POST" ? JSON.stringify({ ...(body || {}), apiKey: API_KEY }) : undefined;

    const res  = await fetch(url, { method, headers, body: payload, signal: controller.signal });
    const json = await parseJSON(res);

    return { ok: !!json.ok, data: json.data ?? json.items ?? json, error: json.ok ? null : json.error ?? null, status: res.status };
  } catch (err) {
    const isAbort = err?.name === "AbortError";
    return { ok:false, data:null, error: isAbort ? "TIMEOUT" : String(err?.message || err), status:0 };
  } finally {
    clearTimeout(timer);
  }
}

/** ========= API ========= */
export const api = {
  get:  (route, params) => request(route, { method: "GET",  params }),
  post: (route, body)   => request(route, { method: "POST", body }),

  // Dashboard Owners (contrato all-in-one)
  kpis: (period) => request("dashboard/owners", { method: "GET", params: { period: period || toPeriod() } }),
  dashboard: {
    owners: (period) => request("dashboard/owners", { method: "GET", params: { period: period || toPeriod() } }),
  },

  equipos: {
    list: (opts = {})       => request("equipos/list",         { method: "GET",  params: { page: 1, page_size: 100, ...opts } }),
    getById: (id)           => request("equipos",              { method: "GET",  params: { id } }),
    getBySerial: (serial)   => request("equipos",              { method: "GET",  params: { serial } }),
    getByQr: (qr)           => request("equipos",              { method: "GET",  params: { qr } }),
    updateState: (payload)  => request("equipos/update_state", { method: "POST", body: payload }),
  },

  incidencias: {
    list:   (opts = {})     => request("incidencias/list",     { method: "GET",  params: opts }),
    create: (payload)       => request("incidencias/create",   { method: "POST", body: payload }),
  },

  tareas: {
    list:   (opts = {})     => request("tareas/list",          { method: "GET",  params: opts }),
    create: (payload)       => request("tareas/create",        { method: "POST", body: payload }),
    updateState: (payload)  => request("tareas/update_state",  { method: "POST", body: payload }),
  },

  eventos: {
    list:   (opts = {})     => request("eventos/list",         { method: "GET",  params: opts }),
    get:    (id)            => request("eventos",              { method: "GET",  params: { id } }),
    equipos:(evento_id)     => request("eventos/equipos",      { method: "GET",  params: { evento_id } }),
    addEquipo:    (b)       => request("eventos/add_equipo",   { method: "POST", body: b }),
    removeEquipo: (b)       => request("eventos/remove_equipo",{ method: "POST", body: b }),
  },

  docs:  { link: (payload)  => request("documentos/link",      { method: "POST", body: payload }) },
  evals: { list:(opts = {}) => request("evaluaciones/list",    { method: "GET",  params: opts }),
           submit:(payload) => request("evaluaciones/submit",  { method: "POST", body: payload }) },

  catalogs: () => request("catalogs/all"),
  health:   () => request("health"),
  version:  () => request("version"),
};

/** ========= Compat con client.request("ruta&k=v", { method, body }) ========= */
function parseLegacyRouteAndParams(routeAndQuery) {
  const s = String(routeAndQuery || "");
  const parts = s.split("&");
  const route = parts.shift() || "";
  const params = {};
  for (const p of parts) {
    if (!p) continue;
    const [k, ...rest] = p.split("=");
    const v = rest.join("=");
    params[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return { route, params };
}
async function legacyRequest(routeAndQuery, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = options.body || {};
  const { route, params } = parseLegacyRouteAndParams(routeAndQuery);
  if (method === "GET") return api.get(route, params);
  return api.post(route, body);
}
api.request = legacyRequest;

export default api;
