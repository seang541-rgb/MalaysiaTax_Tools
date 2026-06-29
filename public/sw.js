const CACHE_VERSION = "v3";
const RUNTIME_CACHE = `mytax-runtime-${CACHE_VERSION}`;
const STATIC_CACHE = `mytax-static-${CACHE_VERSION}`;

const STATIC_ASSET_PATTERN = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(["/manifest.json", "/icons/icon.svg"]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("mytax-"))
          .filter((key) => key !== RUNTIME_CACHE && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();

      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });

      await Promise.all(
        clients.map((client) => {
          if (!client.url || !client.url.startsWith(self.location.origin)) {
            return undefined;
          }

          return client.navigate(client.url);
        })
      );
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() => {
        return new Response("MYTax is temporarily offline.", {
          status: 503,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Static assets
  if (
    STATIC_ASSET_PATTERN.test(url.pathname) ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (!response.ok) return response;

          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;

        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
