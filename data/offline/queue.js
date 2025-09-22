// data/offline/queue.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { client } from '../api/client';

/**
 * Job shape:
 * {
 *   id: string,
 *   endpoint: 'documentos/link' | 'evaluaciones/create' | 'eventos/create' | 'incidencias/create' | string,
 *   method: 'GET' | 'POST',
 *   payload: any,
 *   type?: string,                // etiqueta opcional
 *   createdAt: ISOString,
 *   tries: number,                // incrementa en cada intento
 *   maxRetries: number,           // por defecto 5
 *   backoffMs: number,            // por defecto 2000
 *   nextAt?: ISOString            // no procesar antes de esta fecha
 * }
 */

const KEY = 'offline.queue.v1';
const LOCK_KEY = 'offline.queue.lock';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BACKOFF = 2000; // ms

// ───────────────────────────────────────────────────────────
// Subscriptions (NEW)
// ───────────────────────────────────────────────────────────
const listeners = new Set();

export function onQueueChange(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of Array.from(listeners)) {
    try {
      fn();
    } catch (e) {
      // evita bloque vacío y no rompas al resto de listeners
      console.warn('queue listener error:', e?.message || e);
    }
  }
}

// ───────────────────────────────────────────────────────────
// Storage helpers
// ───────────────────────────────────────────────────────────
async function read() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function write(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
  notify(); // NEW: dispara listeners cuando cambia la cola
}

async function getLock() {
  const v = await AsyncStorage.getItem(LOCK_KEY);
  return v === '1';
}

async function setLock(on) {
  await AsyncStorage.setItem(LOCK_KEY, on ? '1' : '0');
}

// ───────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────

export async function enqueue(job) {
  const list = await read();
  const now = new Date().toISOString();
  const j = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method: 'POST',
    maxRetries: DEFAULT_MAX_RETRIES,
    backoffMs: DEFAULT_BACKOFF,
    tries: 0,
    createdAt: now,
    ...job,
  };
  list.push(j);
  await write(list);
  return j.id;
}

// Alias para compatibilidad con imports existentes
export const enqueueJob = enqueue;

/** Procesa toda la cola (respeta backoff/nextAt). Evita corridas en paralelo con un lock. */
export async function processAll({ onSuccess, onError } = {}) {
  // lock simple para evitar dobles ejecuciones
  if (await getLock()) {
    return { processed: 0, remaining: (await read()).length, locked: true };
  }
  await setLock(true);

  try {
    let list = await read();
    if (!list.length) return { processed: 0, remaining: 0 };

    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      const err = new Error('OFFLINE');
      err.code = 'OFFLINE';
      throw err;
    }

    const nowTs = Date.now();
    let processed = 0;
    const keep = [];

    for (const job of list) {
      // respeta ventana de backoff (si definida)
      if (job.nextAt && new Date(job.nextAt).getTime() > nowTs) {
        keep.push(job);
        continue;
      }

      try {
        // Ejecuta
        await execJob(job);
        processed++;
        onSuccess?.(job);
      } catch (e) {
        const code = String(e.code || e.message || '');

        // Decidir si reintentar o descartar
        const shouldRetry =
          code === 'OFFLINE' ||
          code === 'UNAUTHORIZED' ||                       // p.ej. el usuario re-iniciará sesión
          code.startsWith('HTTP_5') ||                     // 5xx
          code === 'HTTP_429';                             // rate limit

        const isClientLogicalError =
          code.startsWith('HTTP_4') && code !== 'HTTP_429'; // 4xx diferente a 429

        if (shouldRetry && (job.tries || 0) < (job.maxRetries || DEFAULT_MAX_RETRIES)) {
          const tries = (job.tries || 0) + 1;
          const delay = (job.backoffMs || DEFAULT_BACKOFF) * Math.pow(2, tries - 1); // exponencial
          keep.push({
            ...job,
            tries,
            nextAt: new Date(Date.now() + delay).toISOString(),
          });
        } else if (isClientLogicalError) {
          // error lógico: lo descartamos pero avisamos
          onError?.(job, e);
          // no se re-encola
        } else {
          // agotó reintentos o error desconocido: reportamos y no re-encolamos para evitar loops
          onError?.(job, e);
        }
      }
    }

    await write(keep);
    return { processed, remaining: keep.length };
  } finally {
    await setLock(false);
    notify(); // NEW: notifica tras procesar (por si cambió el estado de “pendiente”)
  }
}

/** Suscribe autoflush: al iniciar la app y al recuperar conexión, intenta procesar la cola. */
export function initQueue({ onSuccess, onError } = {}) {
  // flush al iniciar (no bloquear UI; fire-and-forget)
  setTimeout(() => {
    processAll({ onSuccess, onError })
      .catch((e) => console.warn('queue init processAll error:', e?.message || e))
      .finally(() => notify());
  }, 0);

  // flush al reconectar
  NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      processAll({ onSuccess, onError })
        .catch((e) => console.warn('queue reconnection processAll error:', e?.message || e))
        .finally(() => notify());
    }
  });
}

/** (NEW) Saber si hay jobs pendientes para un equipo_id concreto (para el badge en Detail) */
export async function hasPendingForEquipo(equipo_id) {
  const list = await read();
  return list.some(
    (j) => String(j?.payload?.equipo_id || j?.meta?.equipo_id || '') === String(equipo_id)
  );
}

// ───────────────────────────────────────────────────────────
// Helpers por tipo de job (Documentos / Evaluaciones / Eventos)
// ───────────────────────────────────────────────────────────

/** Documentos: POST documentos/link */
export async function enqueueDocumentoLink(payload) {
  return enqueue({
    endpoint: 'documentos/link',
    method: 'POST',
    payload,
    type: 'documento.link',
  });
}

/** Evaluaciones: POST evaluaciones/create */
export async function enqueueEvaluacionCreate(payload) {
  return enqueue({
    endpoint: 'evaluaciones/create',
    method: 'POST',
    payload,
    type: 'evaluaciones.create',
  });
}

/** Eventos: POST eventos/create */
export async function enqueueEventoCreate(payload) {
  return enqueue({
    endpoint: 'eventos/create',
    method: 'POST',
    payload,
    type: 'eventos.create',
  });
}

// ───────────────────────────────────────────────────────────
// Helpers por tipo de job (Incidencias)
// ───────────────────────────────────────────────────────────

/** Incidencias: POST incidencias/create */
export async function enqueueIncidenciaCreate(payload) {
  // payload esperado:
  // { equipo_id, fecha_reporte, reportado_por, severidad, descripcion, fotos_urls?, estado:'abierta', sla_horas? }
  return enqueue({
    endpoint: 'incidencias/create',
    method: 'POST',
    payload,
    type: 'incidencias.create',
  });
}

/** Incidencias: POST incidencias/update */
export async function enqueueIncidenciaUpdate({ id, partial }) {
  // partial puede incluir: { descripcion, estado, ot_id, ... }
  return enqueue({
    endpoint: 'incidencias/update',
    method: 'POST',
    payload: { id, ...(partial || {}) },
    type: 'incidencias.update',
  });
}

/** Incidencias: POST incidencias/close */
export async function enqueueIncidenciaClose({ id, closing }) {
  // closing: { causa_raiz, cerrado_por, fecha_cierre }
  return enqueue({
    endpoint: 'incidencias/close',
    method: 'POST',
    payload: { id, ...(closing || {}) },
    type: 'incidencias.close',
  });
}

// ───────────────────────────────────────────────────────────
// Ejecutor
// ───────────────────────────────────────────────────────────

/**
 * Normaliza rutas para soportar ambos estilos:
 * - 'eventos/create'  → '?route=eventos/create'
 * - '?route=eventos/create' (queda igual)
 */
function normalizePath(endpoint) {
  if (!endpoint) return '';
  const ep = String(endpoint).trim();
  if (ep.startsWith('?route=')) return ep;
  // evita doble '?'
  return `?route=${ep.replace(/^[?&]route=/, '')}`;
}

/** Garantiza que todos los jobs lleven apiKey (evita UNAUTHORIZED al procesar cola). */
function withApiKey(obj) {
  try {
    const k = client?.API_KEY || undefined;
    return k ? { ...(obj || {}), apiKey: k } : (obj || {});
  } catch (e) {
    console.warn('queue withApiKey error:', e?.message || e);
    return obj || {};
  }
}

async function execJob(job) {
  const path = normalizePath(job.endpoint);

  if (job.method === 'GET') {
    // GET con query en payload opcional (el client debe serializar payload como querystring)
    return client.get(path, withApiKey(job.payload));
  }
  // POST por defecto
  return client.post(path, withApiKey(job.payload));
}
