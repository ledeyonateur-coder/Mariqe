// Service worker : l'application fonctionne hors connexion une fois installée.
const CACHE = "filtrace-v11";
const FILES = [
  "./",
  "index.html",
  "app.html",
  "manifest.webmanifest",
  "css/style.css",
  "css/app.css",
  "js/app.js",
  "js/machines.js",
  "js/crop.js",
  "js/fabrics.js",
  "js/photo.js",
  "js/text.js",
  "js/projects.js",
  "js/core/satin.js",
  "js/formats/readers.js",
  "js/engine.js",
  "js/worker.js",
  "js/core/checks.js",
  "js/cloud.js",
  "js/i18n.js",
  "js/community.js",
  "communaute.html",
  "en/index.html",
  "assets/modeles/coeur.svg",
  "js/core/pipeline.js",
  "js/core/quantize.js",
  "js/core/stitch.js",
  "js/core/threads.js",
  "js/core/trace.js",
  "js/core/zip.js",
  "js/formats/writers.js",
  "assets/favicon.svg",
  "assets/exemple.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Les données en ligne (synchronisation, galerie) ne passent jamais par le cache.
  if (new URL(e.request.url).pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
