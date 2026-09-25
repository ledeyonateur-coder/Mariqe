// Galerie communautaire : motifs partagés gratuitement par les utilisateurs.
//   GET  /api/gallery              -> liste (métadonnées)
//   GET  /api/gallery?thumb=ID     -> vignette JPEG
//   GET  /api/gallery?id=ID        -> motif complet (DST en base64 + couleurs)
//   POST /api/gallery              -> partager {name, author, thumb, dst, threads, widthMm, heightMm, stitches}
//   POST /api/gallery {report: ID} -> signaler (masqué après 3 signalements)
//   DELETE /api/gallery {id, token} -> supprimer (code reçu au partage, ou clé admin)
import { configured, redis, rateLimit, send, sha256hex } from "./_redis.js";
import { randomBytes } from "node:crypto";

const MAX_THUMB = 160_000;
const MAX_DST = 700_000;
const HIDE_AFTER = 3;
const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

export default async function handler(req, res) {
  if (!configured) return send(res, 503, { error: "Galerie non configurée sur ce site." });
  try {
    if (req.method === "GET") {
      if (!(await rateLimit(req, "gal-get", 240))) return send(res, 429, { error: "Trop de requêtes." });
      const { id, thumb } = req.query;
      if (thumb) {
        if (!/^[a-z0-9]{12}$/.test(thumb)) return send(res, 400, { error: "Identifiant invalide." });
        const [data] = await redis(["HGET", `gal:${thumb}`, "thumb"]);
        if (!data) return send(res, 404, { error: "Introuvable." });
        const b64 = data.replace(/^data:image\/\w+;base64,/, "");
        res.status(200).setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.end(Buffer.from(b64, "base64"));
      }
      if (id) {
        if (!/^[a-z0-9]{12}$/.test(id)) return send(res, 400, { error: "Identifiant invalide." });
        const [f] = await redis(["HMGET", `gal:${id}`, "name", "author", "dst", "threads", "widthMm", "heightMm", "hidden"]);
        if (!f || !f[2] || f[6] === "1") return send(res, 404, { error: "Motif introuvable." });
        await redis(["HINCRBY", `gal:${id}`, "downloads", 1]);
        return send(res, 200, { id, name: f[0], author: f[1], dst: f[2], threads: JSON.parse(f[3] || "[]"), widthMm: Number(f[4]), heightMm: Number(f[5]) });
      }
      const ids = (await redis(["ZREVRANGE", "gal:list", 0, 119]))[0] || [];
      if (!ids.length) return send(res, 200, { items: [] });
      const rows = await redis(...ids.map((g) => ["HMGET", `gal:${g}`, "name", "author", "createdAt", "widthMm", "heightMm", "stitches", "colors", "hidden", "downloads"]));
      const items = rows
        .map((f, i) => ({ id: ids[i], name: f[0], author: f[1], createdAt: Number(f[2]), widthMm: Number(f[3]), heightMm: Number(f[4]), stitches: Number(f[5]), colors: Number(f[6]), hidden: f[7] === "1", downloads: Number(f[8] || 0) }))
        .filter((x) => x.name && !x.hidden);
      return send(res, 200, { items });
    }

    const body = req.body || {};
    if (req.method === "POST" && body.report) {
      if (!(await rateLimit(req, "gal-report", 10))) return send(res, 429, { error: "Trop de signalements." });
      const id = String(body.report);
      if (!/^[a-z0-9]{12}$/.test(id)) return send(res, 400, { error: "Identifiant invalide." });
      const [n] = await redis(["HINCRBY", `gal:${id}`, "reports", 1]);
      if (n >= HIDE_AFTER) await redis(["HSET", `gal:${id}`, "hidden", "1"]);
      return send(res, 200, { ok: true });
    }

    if (req.method === "POST") {
      if (!(await rateLimit(req, "gal-post", 5))) return send(res, 429, { error: "Trop de partages, réessayez plus tard." });
      const name = clean(body.name, 40);
      const author = clean(body.author, 30);
      const thumb = String(body.thumb || "");
      const dst = String(body.dst || "");
      const threads = Array.isArray(body.threads) ? body.threads.slice(0, 64).map((t) => ({ color: /^#[0-9a-f]{6}$/i.test(t.color) ? t.color : "#000000", name: clean(t.name, 40) })) : [];
      if (!name) return send(res, 400, { error: "Donnez un nom au motif." });
      if (!/^data:image\/jpeg;base64,/.test(thumb) || thumb.length > MAX_THUMB) return send(res, 400, { error: "Vignette invalide." });
      if (!dst || dst.length > MAX_DST || !/^[A-Za-z0-9+/=]+$/.test(dst)) return send(res, 400, { error: "Motif invalide ou trop lourd." });
      const id = randomBytes(9).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "a").slice(0, 12);
      const token = randomBytes(12).toString("hex");
      await redis(
        ["HSET", `gal:${id}`, "name", name, "author", author, "thumb", thumb, "dst", dst, "threads", JSON.stringify(threads), "widthMm", Number(body.widthMm) || 0, "heightMm", Number(body.heightMm) || 0, "stitches", Number(body.stitches) || 0, "colors", threads.length, "createdAt", Date.now(), "token", await sha256hex(token)],
        ["ZADD", "gal:list", Date.now(), id],
      );
      return send(res, 200, { id, token });
    }

    if (req.method === "DELETE") {
      const id = String(body.id || "");
      if (!/^[a-z0-9]{12}$/.test(id)) return send(res, 400, { error: "Identifiant invalide." });
      const [stored] = await redis(["HGET", `gal:${id}`, "token"]);
      const admin = process.env.GALLERY_ADMIN_KEY && body.token === process.env.GALLERY_ADMIN_KEY;
      if (!admin && (!stored || stored !== (await sha256hex(String(body.token || ""))))) return send(res, 403, { error: "Code de suppression incorrect." });
      await redis(["DEL", `gal:${id}`], ["ZREM", "gal:list", id]);
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: "Méthode non prise en charge." });
  } catch (e) {
    return send(res, 500, { error: "Erreur du serveur : " + e.message });
  }
}
