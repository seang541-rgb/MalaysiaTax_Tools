const CACHE_VERSION = "kill-v1";

self.addEventListener("install", (event) => {
  self.__MYTAX_SW_KILL_VERSION__ = CACHE_VERSION;
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("mytax-"))
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
      await self.registration.unregister();

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
