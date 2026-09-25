// Accès à Upstash Redis par son API REST (aucune dépendance).
// Variables d'environnement Vercel : UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// (ou KV_REST_API_URL + KV_REST_API_TOKEN, noms donnés par l'intégration Vercel).

const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const configured = Boolean(URL_ && TOKEN);

/** Exécute plusieurs commandes Redis en une requête. */
export async function redis(...commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

/** Limite simple par adresse IP : `max` requêtes par minute. */
export async function rateLimit(req, scope, max) {
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "inconnu";
  const key = `rl:${scope}:${ip}:${Math.floor(Date.now() / 60000)}`;
  const [n] = await redis(["INCR", key], ["EXPIRE", key, 70]);
  return n <= max;
}

export function send(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export async function sha256hex(text) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text).digest("hex");
}
