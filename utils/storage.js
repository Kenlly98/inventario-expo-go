// utils/storage.js
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "inv:";
const DEV = typeof __DEV__ !== "undefined" && __DEV__;

const toKey = (k) => `${PREFIX}${k}`;
function debug(msg, e) {
  if (DEV) {
    // eslint-disable-next-line no-console
    console.debug(msg, e?.message || e);
  }
}

function makeLocalStorageBackend() {
  return {
    async getItem(key) {
      try { return localStorage.getItem(toKey(key)); }
      catch (e) { debug("[storage] getItem localStorage failed", e); return null; }
    },
    async setItem(key, value) {
      try { localStorage.setItem(toKey(key), String(value ?? "")); }
      catch (e) { debug("[storage] setItem localStorage failed", e); return; }
    },
    async removeItem(key) {
      try { localStorage.removeItem(toKey(key)); }
      catch (e) { debug("[storage] removeItem localStorage failed", e); return; }
    },
    async clear() {
      try {
        const keys = Object.keys(localStorage);
        for (const k of keys) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
      } catch (e) { debug("[storage] clear localStorage failed", e); return; }
    },
    async getAllKeys() {
      try {
        return Object
          .keys(localStorage)
          .filter((k) => k.startsWith(PREFIX))
          .map((k) => k.slice(PREFIX.length));
      } catch (e) { debug("[storage] getAllKeys localStorage failed", e); return []; }
    },
    async multiSet(pairs = []) { for (const [k, v] of pairs) await this.setItem(k, v); },
    async multiGet(keys = []) { const out = []; for (const k of keys) out.push([k, await this.getItem(k)]); return out; },
    async multiRemove(keys = []) { for (const k of keys) await this.removeItem(k); },
  };
}

function makeMemoryBackend() {
  const map = new Map();
  return {
    async getItem(key) { return map.has(key) ? map.get(key) : null; },
    async setItem(key, value) { map.set(key, String(value ?? "")); },
    async removeItem(key) { map.delete(key); },
    async clear() { map.clear(); },
    async getAllKeys() { return Array.from(map.keys()); },
    async multiSet(pairs = []) { for (const [k, v] of pairs) map.set(k, String(v ?? "")); },
    async multiGet(keys = []) { return keys.map((k) => [k, map.has(k) ? map.get(k) : null]); },
    async multiRemove(keys = []) { for (const k of keys) map.delete(k); },
  };
}

let Storage = AsyncStorage;

if (Platform.OS === "web") {
  let canUseLocal = false;
  try {
    localStorage.setItem("__probe__", "1");
    localStorage.removeItem("__probe__");
    canUseLocal = true;
  } catch (e) {
    debug("[storage] localStorage probe failed", e);
    canUseLocal = false;
  }

  if (canUseLocal) {
    // eslint-disable-next-line no-console
    console.warn("[storage] Usando localStorage en Web.");
    Storage = makeLocalStorageBackend();
  } else {
    // eslint-disable-next-line no-console
    console.warn("[storage] Sin localStorage/IDB. Usando storage en memoria (no persistente).");
    Storage = makeMemoryBackend();
  }
}

export async function setJSON(key, obj) {
  try { await Storage.setItem(key, JSON.stringify(obj ?? null)); }
  catch (e) { debug("[storage] setJSON failed", e); }
}

export async function getJSON(key, fallback = null) {
  try {
    const s = await Storage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch (e) {
    debug("[storage] getJSON failed", e);
    return fallback;
  }
}

export default Storage;
