// Service Worker for Street Dog App PWA

const CACHE_NAME = "streetdog-v4";
const STATIC_ASSETS = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/offline.html", "/logo.png", "/leaflet/marker-icon.png", "/leaflet/marker-icon-2x.png", "/leaflet/marker-shadow.png"];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log("[SW] Cache addAll error (non-fatal):", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME && name !== "map-tiles-cache") {
            return caches.delete(name);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Pre-cache key app pages when requested by the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PRECACHE_PAGES") {
    const pages = event.data.pages || [];
    caches.open(CACHE_NAME).then((cache) => {
      pages.forEach((url) => {
        fetch(url, { credentials: "same-origin" })
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(url, response);
            }
          })
          .catch(() => {}); // Ignore failures
      });
    });
  }
});

// Fetch — strategy router
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache map tiles (cache-first)
  if (
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("openstreetmap.org")
  ) {
    event.respondWith(
      caches.open("map-tiles-cache").then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => new Response("", { status: 503 }));
        })
      )
    );
    return;
  }

  // Skip non-same-origin requests (except tiles handled above)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Network-first for API calls
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) =>
          cached || new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
        )
      )
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|eot|png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first for HTML/pages, offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache final 200 responses, never redirects (Safari rejects SW redirects)
          if (response && response.status === 200 && !response.redirected) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            // Never serve cached redirects — Safari throws on SW redirect responses
            if (cached && cached.redirected) return caches.match("/offline.html");
            return cached || caches.match("/offline.html");
          })
        )
    );
    return;
  }

  // Network-first for other same-origin GET requests (Cache API doesn't support POST)
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background sync — sync offline dogs
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-dogs") {
    event.waitUntil(syncOfflineDogs());
  }
});

async function syncOfflineDogs() {
  try {
    const db = await openDB();
    const tx = db.transaction("offlineDogs", "readonly");
    const store = tx.objectStore("offlineDogs");
    const allDogs = await getAllFromStore(store);

    for (const entry of allDogs) {
      try {
        const formData = new FormData();
        formData.append("dogImage", entry.dogImage, "dog_image.jpg");
        if (entry.earTagImage) {
          formData.append("earTagImage", entry.earTagImage, "ear_tag.jpg");
        }
        if (entry.earTagId) formData.append("earTagId", entry.earTagId);
        formData.append("latitude", String(entry.latitude));
        formData.append("longitude", String(entry.longitude));
        formData.append("character", entry.character);
        formData.append("size", String(entry.size));
        formData.append("gender", entry.gender);
        formData.append("age", entry.age);
        if (entry.notes) formData.append("notes", entry.notes);

        const response = await fetch("/api/sightings", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        if (response.ok) {
          await removeFromDB(entry.id);
        }
      } catch (err) {
        console.error("[SW] Error syncing dog:", err);
      }
    }

    // Notify clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_COMPLETE" });
    });
  } catch (error) {
    console.error("[SW] Sync error:", error);
    throw error;
  }
}

// IndexedDB helpers for service worker
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StreetDogDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offlineDogs")) {
        db.createObjectStore("offlineDogs", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromDB(id) {
  const db = await openDB();
  const tx = db.transaction("offlineDogs", "readwrite");
  tx.objectStore("offlineDogs").delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
