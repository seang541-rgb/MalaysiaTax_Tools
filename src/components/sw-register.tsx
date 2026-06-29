"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      let reloaded = false;

      const reloadOnce = () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      };

      const clearCaches = () => {
        if (!("caches" in window)) return Promise.resolve();
        return caches.keys().then((keys) => {
          return Promise.all(
            keys
              .filter((key) => key.startsWith("mytax-"))
              .map((key) => caches.delete(key))
          ).then(() => undefined);
        });
      };

      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          return Promise.all(
            registrations.map((registration) => registration.unregister())
          );
        })
        .then(() => clearCaches())
        .then(() => {
          if (navigator.serviceWorker.controller) {
            reloadOnce();
          }
        })
        .catch(() => {
          clearCaches().catch(() => {
            // Cache cleanup failed silently.
          });
        });
    }
  }, []);

  return null;
}
