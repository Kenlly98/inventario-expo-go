// data/repositories/catalogsRepository.js
// Carga /catalogs/all desde tu Apps Script, cachea 24h y entrega mapas ID→objeto

import client from '../api/client';
import { getCache, setCache } from '../cache/storage';

const KEY_ALL = 'inv.catalogs.all.v1';
const TTL_24H = 24 * 60 * 60 * 1000; // ms

export const catalogsRepository = {
  /**
   * Devuelve todos los catálogos (array por tabla), con cache de 24h.
   * @param {boolean} force - si true, ignora cache y recarga del server.
   */
  async all(force = false) {
    if (!force) {
      const cached = await getCache(KEY_ALL);
      if (cached?.v) return cached.v;
    }
    const res = await client.get('/catalogs/all');
    if (!res?.ok) throw new Error(res?.error || 'No se pudieron cargar catálogos');

    const catalogs = res.data || {
      marcas: [],
      modelos: [],
      proveedores: [],
      ubicaciones: [],
      estados: [],
      causas_falla: [], // por si luego lo añades en el endpoint
    };

    await setCache(KEY_ALL, catalogs, TTL_24H);
    return catalogs;
  },

  /**
   * Devuelve diccionarios por id para resolver *_id → nombre/objeto.
   * { proveedores: { 'P-01': {...} }, ubicaciones: {...}, ... }
   */
  async maps(force = false) {
    const cat = await this.all(force);
    const toMap = (arr = []) => Object.fromEntries(arr.map(x => [x.id, x]));
    return {
      marcas: toMap(cat.marcas),
      modelos: toMap(cat.modelos),
      proveedores: toMap(cat.proveedores),
      ubicaciones: toMap(cat.ubicaciones),
      estados: toMap(cat.estados),
      causas_falla: toMap(cat.causas_falla),
    };
  },
};

export default catalogsRepository;
