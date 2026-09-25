// Synchronisation chiffrée et galerie communautaire (fonctions Vercel /api).
// Le code de synchronisation ne quitte jamais l'appareil : le serveur ne
// reçoit que son empreinte (SHA-256) et des projets chiffrés (AES-GCM).

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

async function gzip(text) {
  if (!("CompressionStream" in window)) return enc.encode(text);
  const s = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function gunzip(bytes) {
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return dec.decode(bytes);
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(s).text();
}

/** Code lisible : 4 groupes de 4 caractères sans lettres ambiguës. */
export function newSyncCode() {
  const A = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(16));
  const c = [...r].map((v) => A[v % A.length]).join("");
  return c.match(/.{4}/g).join("-");
}
export const normalizeCode = (c) => String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function syncId(code) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode("filtrace-sync:" + normalizeCode(code)));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function syncKey(code) {
  const base = await crypto.subtle.importKey("raw", enc.encode(normalizeCode(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("filtrace-v1"), iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  } catch {
    throw new Error("Pas de connexion internet.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (res.status === 404 && !data) throw new Error("Service en ligne indisponible sur ce site (fonctions Vercel absentes).");
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data;
}

/** Envoie un projet (objet) chiffré. */
export async function pushProject(code, pid, project) {
  const [id, key] = await Promise.all([syncId(code), syncKey(code)]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const packed = await gzip(JSON.stringify(project));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, packed));
  const blob = new Uint8Array(iv.length + cipher.length);
  blob.set(iv);
  blob.set(cipher, iv.length);
  await api("/api/sync", { method: "POST", body: JSON.stringify({ id, pid, data: b64(blob) }) });
}

/** Récupère et déchiffre tous les projets du code. */
export async function pullProjects(code) {
  const [id, key] = await Promise.all([syncId(code), syncKey(code)]);
  const { items } = await api(`/api/sync?id=${id}`);
  const out = [];
  for (const [pid, data] of Object.entries(items || {})) {
    try {
      const blob = unb64(data);
      const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: blob.subarray(0, 12) }, key, blob.subarray(12)));
      out.push({ pid, project: JSON.parse(await gunzip(plain)) });
    } catch {
      // Projet illisible (autre code) : ignoré.
    }
  }
  return out;
}

export async function deleteRemote(code, pid) {
  const id = await syncId(code);
  await api("/api/sync", { method: "DELETE", body: JSON.stringify({ id, pid }) });
}

// ---------------------------------------------------------------- galerie

export const galleryList = () => api("/api/gallery").then((d) => d.items || []);
export const galleryGet = (id) => api(`/api/gallery?id=${encodeURIComponent(id)}`);
export const galleryShare = (payload) => api("/api/gallery", { method: "POST", body: JSON.stringify(payload) });
export const galleryReport = (id) => api("/api/gallery", { method: "POST", body: JSON.stringify({ report: id }) });
export const galleryDelete = (id, token) => api("/api/gallery", { method: "DELETE", body: JSON.stringify({ id, token }) });
export const thumbUrl = (id) => `/api/gallery?thumb=${encodeURIComponent(id)}`;
export { b64, unb64 };
