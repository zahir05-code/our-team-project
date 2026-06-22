const CACHE = "athena-v5.70";
const STATIC = [
  "/",
  "/static/css/style.css?v=5.70",
  "/static/js/app.js?v=5.70",
  "/static/js/i18n.js",
  "/static/js/welfareDeepLinks.json",
  "/static/manifest.json",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // API 요청은 항상 네트워크 우선 (캐시 금지)
  if (url.pathname.startsWith("/welfare/") || url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => new Response(
      JSON.stringify({ error: "오프라인 상태입니다" }),
      { headers: { "Content-Type": "application/json" } }
    )));
    return;
  }

  // 정적 자원: 캐시 우선, 없으면 네트워크
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
