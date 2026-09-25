// « Mes projets » : sauvegarde des motifs dans le navigateur (IndexedDB),
// sans rien envoyer sur internet.

const DB = "filtrace";
const STORE = "projects";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export const saveProject = (p) => tx("readwrite", (s) => s.put(p));
export const deleteProject = (id) => tx("readwrite", (s) => s.delete(id));
export const getProject = (id) => tx("readonly", (s) => s.get(id));

/** Liste légère (sans les données lourdes), du plus récent au plus ancien. */
export async function listProjects() {
  const all = await tx("readonly", (s) => s.getAll());
  return (all || [])
    .map(({ id, name, updatedAt, thumb, widthMm, heightMm, stitchCount }) => ({ id, name, updatedAt, thumb, widthMm, heightMm, stitchCount }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
