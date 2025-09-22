// data/cache/storage.js
// Helpers de cache simple usando AsyncStorage (con TTL opcional)

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Guarda un valor en cache.
 * @param {string} key - clave de almacenamiento
 * @param {any} value - valor a guardar
 * @param {number} ttlMs - tiempo de vida en ms (0 = infinito)
 */
export async function setCache(key, value, ttlMs = 0) {
  try {
    const payload = { v: value, ts: Date.now(), ttl: ttlMs };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn('setCache error', key, e?.message);
  }
}

/**
 * Recupera un valor del cache (o null si no existe / expiró).
 */
export async function getCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj?.ttl && obj.ts && Date.now() - obj.ts > obj.ttl) {
      return null; // expirado
    }
    return obj;
  } catch (e) {
    console.warn('getCache error', key, e?.message);
    return null;
  }
}

/**
 * Elimina un valor del cache.
 */
export async function delCache(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    // ignorar errores al borrar cache
    console.warn('delCache error', key, e?.message);
  }
}
