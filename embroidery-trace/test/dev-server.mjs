// Serveur de développement : fichiers statiques + fonctions /api comme sur
// Vercel. Sans variables Upstash, une base Redis en mémoire est utilisée.
//   node test/dev-server.mjs [port]
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.argv[2]) || 8787;

// ---- Redis en mémoire (sous-ensemble des commandes utilisées)
if (!process.env.UPSTASH_REDIS_REST_URL) {
  const db = new Map();
  const hash = (k) => (db.has(k) ? db.get(k) : db.set(k, new Map()).get(k));
  const run = ([cmd, ...a]) => {
    switch (cmd.toUpperCase()) {
      case "INCR": { const v = (Number(db.get(a[0])) || 0) + 1; db.set(a[0], v); return v; }
      case "EXPIRE": return 1;
      case "HSET": { const h = hash(a[0]); for (let i = 1; i < a.length; i += 2) h.set(String(a[i]), String(a[i + 1])); return 1; }
      case "HGET": return db.get(a[0])?.get(String(a[1])) ?? null;
      case "HMGET": return a.slice(1).map((f) => db.get(a[0])?.get(String(f)) ?? null);
      case "HGETALL": return [...(db.get(a[0]) || new Map())].flat();
      case "HLEN": return db.get(a[0])?.size || 0;
      case "HDEL": return db.get(a[0])?.delete(String(a[1])) ? 1 : 0;
      case "HINCRBY": { const h = hash(a[0]); const v = (Number(h.get(a[1])) || 0) + Number(a[2]); h.set(a[1], String(v)); return v; }
      case "ZADD": { const z = hash(a[0]); z.set(String(a[2]), Number(a[1])); return 1; }
      case "ZREM": return db.get(a[0])?.delete(String(a[1])) ? 1 : 0;
      case "ZREVRANGE": return [...(db.get(a[0]) || new Map())].sort((x, y) => y[1] - x[1]).slice(Number(a[1]), Number(a[2]) + 1).map((x) => x[0]);
      case "DEL": return db.delete(a[0]) ? 1 : 0;
      default: throw new Error("commande non simulée : " + cmd);
    }
  };
  process.env.UPSTASH_REDIS_REST_URL = "http://mock-redis";
  process.env.UPSTASH_REDIS_REST_TOKEN = "dev";
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith("http://mock-redis")) {
      const cmds = JSON.parse(opts.body);
      return new Response(JSON.stringify(cmds.map((c) => { try { return { result: run(c) }; } catch (e) { return { error: e.message }; } })));
    }
    return realFetch(url, opts);
  };
}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain" };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z]/g, "");
      let body = "";
      for await (const chunk of req) body += chunk;
      const vreq = Object.assign(req, { query: Object.fromEntries(url.searchParams), body: body ? JSON.parse(body) : {} });
      const vres = Object.assign(res, { status(c) { res.statusCode = c; return vres; } });
      try {
        const mod = await import(join(root, "api", name + ".js"));
        return await mod.default(vreq, vres);
      } catch (e) {
        res.statusCode = 404;
        return res.end(String(e));
      }
    }
    const path = normalize(join(root, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)));
    if (!path.startsWith(root)) return res.writeHead(403).end();
    try {
      const data = await readFile(path);
      res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404).end("introuvable");
    }
  })
  .listen(port, () => console.log(`FilTrace : http://localhost:${port}`));
