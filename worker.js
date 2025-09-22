// Cloudflare Worker – CORS proxy para Apps Script (GET/POST/OPTIONS)
// Uso: https://tu-proxy.workers.dev/?u=<URL-ENCODED-DESTINO>
// Opcional: limitar orígenes con env CORS_ORIGINS y proteger con WORKER_KEY

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = req.headers.get("origin") || "";
    const cors = makeCorsHeaders(origin, env);

    // Preflight CORS
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // (Opcional) API key simple para evitar abuso
    if (env.WORKER_KEY) {
      const k = url.searchParams.get("key") || req.headers.get("x-worker-key");
      if (k !== env.WORKER_KEY) {
        return new Response("Forbidden", { status: 403, headers: cors });
      }
    }

    // URL destino
    const target = url.searchParams.get("u");
    if (!target) {
      return new Response("Missing ?u", { status: 400, headers: cors });
    }

    // Validaciones básicas anti-SSRF (ajústalas si quieres permitir otros hosts)
    let t;
    try {
      t = new URL(target);
      if (t.protocol !== "https:") {
        return new Response("Only https is allowed", { status: 400, headers: cors });
      }
      // Permitir Apps Script y su CDN (descomenta para restringir estrictamente)
      // const allowedHosts = ["script.google.com", "script.googleusercontent.com"];
      // if (!allowedHosts.includes(t.hostname)) {
      //   return new Response("Host not allowed", { status: 400, headers: cors });
      // }
    } catch {
      return new Response("Bad target URL", { status: 400, headers: cors });
    }

    // Construir init para reenviar la request
    const init = {
      method: req.method,
      headers: new Headers(req.headers),
      body: undefined,
      redirect: "follow",
      // cf: { cacheTtl: 0 } // si quieres controlar cache
    };

    // Quitar cabeceras que no deben reenviarse
    ["host", "origin", "referer", "cf-connecting-ip", "x-forwarded-for", "x-real-ip"]
      .forEach(h => init.headers.delete(h));

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = await req.arrayBuffer();
    }

    // Reenviar a upstream
    let upstream;
    try {
      upstream = await fetch(t.toString(), init);
    } catch (e) {
      return new Response("Upstream fetch error: " + (e?.message || e), { status: 502, headers: cors });
    }

    // Preparar respuesta: conservar content-type y agregar CORS
    const resHeaders = new Headers(upstream.headers);
    const contentType = resHeaders.get("content-type") || "application/json; charset=utf-8";

    const out = new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
    });

    // Copia cabeceras útiles del upstream
    out.headers.set("content-type", contentType);
    const cache = resHeaders.get("cache-control");
    if (cache) out.headers.set("cache-control", cache);

    // CORS
    cors.forEach((v, k) => out.headers.set(k, v));
    return out;
  }
};

// ---------- helpers ----------
function makeCorsHeaders(origin, env) {
  // CORS_ORIGINS: "*" o lista separada por comas (ej: "http://localhost:8081,https://snack.expo.dev")
  const allowList = (env?.CORS_ORIGINS || "*")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  let allowOrigin = "*";
  if (allowList[0] !== "*") {
    allowOrigin = allowList.includes(origin) ? origin : ""; // si no coincide, no ponemos ACAO
  }

  const h = new Headers();
  if (allowOrigin) h.set("access-control-allow-origin", allowOrigin);
  h.set("access-control-allow-methods", "GET,POST,OPTIONS");
  h.set("access-control-allow-headers", "*");
  h.set("access-control-expose-headers", "content-type,cache-control");
  h.set("vary", "origin");
  return h;
}
