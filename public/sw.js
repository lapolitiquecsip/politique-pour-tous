// Service worker de « La Politique C Simple » — rend l'app installable et utilisable hors-ligne.
// Stratégie : navigations en réseau-d'abord (contenu frais) avec repli cache/offline ; assets
// same-origin en cache-d'abord. Les appels externes (Supabase, EUR-Lex, YouTube…) ne sont
// JAMAIS interceptés → les données restent toujours en direct.
const CACHE = "lpcs-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // externe (API) → on laisse passer, live

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)); return res; })
        .catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        if (res.ok && (res.type === "basic")) { const c = res.clone(); caches.open(CACHE).then((ca) => ca.put(req, c)); }
        return res;
      }).catch(() => cached)
    )
  );
});
