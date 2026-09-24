// Service worker : l'application fonctionne hors connexion une fois installée.
const CACHE = "filtrace-v2";
const FILES = [
  "./",
  "index.html",
  "app.html",
  "manifest.webmanifest",
  "css/style.css",
  "css/app.css",
  "js/app.js",
  "js/machines.js",
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
