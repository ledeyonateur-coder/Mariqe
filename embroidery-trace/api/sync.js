// Synchronisation des projets entre appareils.
// Les projets arrivent déjà chiffrés par le navigateur (AES-GCM, clé tirée
// du code personnel) : le serveur ne voit jamais leur contenu ni le code.
import { configured, redis, rateLimit, send } from "./_redis.js";

const MAX_ITEM = 950_000; // caractères base64 par projet
const TTL = 60 * 60 * 24 * 400; // un peu plus d'un an sans activité

export default async function handler(req, res) {
  if (!configured) return send(res, 503, { error: "Synchronisation non configurée sur ce site." });
  try {
    if (!(await rateLimit(req, "sync", 60))) return send(res, 429, { error: "Trop de requêtes, réessayez dans une minute." });
    const q = req.method === "GET" ? req.query : req.body || {};
    const id = String(q.id || "");
    if (!/^[a-f0-9]{64}$/.test(id)) return send(res, 400, { error: "Identifiant invalide." });
    const key = `sync:${id}`;

    if (req.method === "GET") {
      const [flat] = await redis(["HGETALL", key]);
      const items = {};
      for (let i = 0; i + 1 < (flat || []).length; i += 2) items[flat[i]] = flat[i + 1];
      return send(res, 200, { items });
    }
    const pid = String(q.pid || "");
    if (!/^[a-z0-9]{1,40}$/i.test(pid)) return send(res, 400, { error: "Projet invalide." });
    if (req.method === "POST") {
      const data = String(q.data || "");
      if (!data || data.length > MAX_ITEM) return send(res, 413, { error: "Projet trop lourd pour la synchronisation (image trop grande)." });
      const [count] = await redis(["HLEN", key]);
      if (count >= 200) return send(res, 413, { error: "200 projets maximum par code." });
      await redis(["HSET", key, pid, data], ["EXPIRE", key, TTL]);
      return send(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      await redis(["HDEL", key, pid]);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: "Méthode non prise en charge." });
  } catch (e) {
    return send(res, 500, { error: "Erreur du serveur : " + e.message });
  }
}
