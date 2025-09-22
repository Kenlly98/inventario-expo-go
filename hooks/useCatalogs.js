// hooks/useCatalogs.js
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { catalogsRepository } from '../data/repositories/catalogsRepository';

/**
 * Hook para un catálogo: useCatalog('responsables')
 * - Lee cache rápido
 * - Si hay red, refresca silencioso
 * - Si no hay nada, usa fallback mínimo
 * - Expone { items, ts, offline }
 */
export function useCatalog(name) {
  const [items, setItems] = useState([]);
  const [ts, setTs] = useState(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      let gotAny = false;

      // 1) cache rápido
      try {
        const cache = await catalogsRepository.getCache?.();
        if (mounted && cache?.data?.[name]?.length) {
          setItems(cache.data[name]);
          setTs(cache.ts);
          gotAny = true;
        }
      } catch (e) {
        // no rompas el flujo si el cache está corrupto
      }

      // 2) network refresh (si hay)
      try {
        const { isConnected } = await NetInfo.fetch();
        if (isConnected) {
          const fresh = await catalogsRepository.all();
          if (mounted && fresh?.data?.[name]?.length) {
            setItems(fresh.data[name]);
            setTs(fresh.ts);
            setOffline(!!fresh.offline);
            gotAny = true;
          }
        } else {
          if (mounted) setOffline(true);
        }
      } catch {
        // si falla server, seguimos con lo que hay
      }

      // 3) fallback mínimo si aún no hay nada
      if (mounted && !gotAny) {
        try {
          const fb = await catalogsRepository.getCatalog(name);
          setItems(Array.isArray(fb) ? fb : []);
        } catch {
          setItems([]);
        }
      }
    })();

    return () => { mounted = false; };
  }, [name]); // ← no usamos `items` dentro, así no marca missing deps

  return { items, ts, offline };
}

// Default export para compatibilidad si alguien usa import default
export default useCatalog;
