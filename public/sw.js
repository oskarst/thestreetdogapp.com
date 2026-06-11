// Service Worker for Street Dog App PWA

const CACHE_NAME = "streetdog-v13";
// Dedicated cache for Supabase Storage public objects (dog photos +
// thumbnails). Stays out of CACHE_NAME so deploys don't have to evict
// the user's photo cache.
const SUPABASE_IMAGES_CACHE = "supabase-images-v1";

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

function uploadFileName(blob, fallback) {
  if (blob && typeof blob.name === "string" && blob.name) return blob.name;
  const ext = (blob && MIME_EXT[blob.type]) || "jpg";
  return `${fallback}.${ext}`;
}
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
          if (
            name !== CACHE_NAME &&
            name !== "map-tiles-cache" &&
            name !== SUPABASE_IMAGES_CACHE
          ) {
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

  // Bypass Next.js RSC navigation fetches. The Next RSC client streams
  // a custom payload format and is sensitive to any header/body
  // manipulation by intermediaries — letting the browser handle these
  // natively avoids the "access control checks" / "Failed to fetch RSC
  // payload" errors that result when our cache-then-replay path
  // round-trips the response.
  if (url.searchParams.has("_rsc")) {
    return;
  }

  // Map tiles: do NOT intercept. The browser's native HTTP cache handles
  // these correctly (tile servers send cache-control: public,max-age=...).
  // Earlier we used a cache-first SW strategy here, but on transient fetch
  // failures the catch handler synthesised a 503 response — which Leaflet
  // then logged as a tile error even though the upstream server was fine.
  // Letting the browser handle tile requests directly means Leaflet sees
  // the real network result and can retry.
  if (
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("openstreetmap.org")
  ) {
    return;
  }

  // Supabase Storage public objects (dog photos, ear-tag photos,
  // thumbnails). Cache-first with a 30d TTL inside a dedicated cache
  // namespace. Paths embed Date.now() so URLs are content-addressed —
  // safe to cache aggressively. User-agnostic content; no
  // cross-user-contamination risk.
  if (
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/storage/v1/object/public/")
  ) {
    event.respondWith(
      caches.open(SUPABASE_IMAGES_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          });
        })
      )
    );
    return;
  }

  // Skip non-same-origin requests
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

  // HTML / page navigations.
  //
  // Caching authenticated HTML in the SW caused a cross-user contamination
  // bug — on a shared device, user A's cached /dashboard could render for
  // user B before the network response arrived. So most authenticated
  // routes go network-only with /offline.html as the offline fallback.
  //
  // Exception: /add-dog. The form is *designed* to work offline — it
  // saves to IndexedDB and replays on reconnect — so showing the offline
  // page there breaks the headline feature. The shared-device concern
  // is bounded: only the layout's TopNav avatar+nickname are
  // user-specific; the form itself contains no other user data, and
  // submissions use the live session via the API, not the cached HTML.
  if (event.request.mode === "navigate") {
    const url = new URL(event.request.url);
    const isPublicHtml =
      url.pathname === "/login" ||
      url.pathname === "/register" ||
      url.pathname === "/reset-password" ||
      url.pathname === "/offline.html";
    const isOfflineCapable = url.pathname === "/add-dog";

    if (isPublicHtml || isOfflineCapable) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response && response.status === 200 && !response.redirected) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(event.request, clone)
              );
            }
            return response;
          })
          .catch(() =>
            caches.match(event.request).then(
              (cached) => cached || caches.match("/offline.html")
            )
          )
      );
    } else {
      // Other authenticated paths: network-only, never cache.
      // /offline.html is shown if the network is down — preferable to
      // serving the previous user's session HTML.
      event.respondWith(
        fetch(event.request).catch(() => caches.match("/offline.html"))
      );
    }
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

// Max consecutive 4xx attempts before an entry is flagged `dead` and
// stops being retried. Matches MAX_PERMANENT_FAILURES in offline-db.ts.
const SW_MAX_PERMANENT_FAILURES = 3;

async function runSyncOfflineDogs() {
  try {
    const allDogs = await getAllOfflineDogs();

    for (const entry of allDogs) {
      if (entry.dead || entry.id == null) continue;

      const formData = new FormData();
      formData.append(
        "dogImage",
        entry.dogImage,
        uploadFileName(entry.dogImage, "dog_image")
      );
      if (entry.earTagImage) {
        formData.append(
          "earTagImage",
          entry.earTagImage,
          uploadFileName(entry.earTagImage, "ear_tag")
        );
      }
      if (entry.earTagId) formData.append("earTagId", entry.earTagId);
      formData.append("latitude", String(entry.latitude));
      formData.append("longitude", String(entry.longitude));
      formData.append("character", entry.character);
      formData.append("size", String(entry.size));
      formData.append("gender", entry.gender);
      formData.append("age", entry.age);
      if (entry.notes) formData.append("notes", entry.notes);
      if (entry.clientUuid) formData.append("clientUuid", entry.clientUuid);

      try {
        const response = await fetch("/api/sightings", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        if (response.ok) {
          await removeFromDB(entry.id);
          continue;
        }

        const isPermanent = response.status >= 400 && response.status < 500;
        const newCount = (entry.failureCount || 0) + (isPermanent ? 1 : 0);
        const becomesDead =
          isPermanent && newCount >= SW_MAX_PERMANENT_FAILURES;
        let errorText = "";
        try {
          const cloned = response.clone();
          const body = await cloned.text();
          if (body.length < 400) errorText = body;
        } catch (_) {
          /* ignore */
        }
        await updateOfflineDog(entry.id, {
          failureCount: newCount,
          lastFailureStatus: response.status,
          lastFailureMessage: errorText || undefined,
          lastAttemptAt: new Date().toISOString(),
          dead: becomesDead,
        });
      } catch (err) {
        console.error("[SW] Network error syncing dog:", err);
        try {
          await updateOfflineDog(entry.id, {
            lastFailureStatus: 0,
            lastAttemptAt: new Date().toISOString(),
          });
        } catch (_) {
          /* ignore */
        }
      }
    }

    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_COMPLETE" });
    });
  } catch (error) {
    console.error("[SW] Sync error:", error);
    throw error;
  }
}

async function syncOfflineDogs() {
  // Serialise with any manual "Sync Now" running in a page client so the
  // clientUuid-dedupe window in /api/sightings stays safe.
  if (self.locks && self.locks.request) {
    return self.locks.request("sync-dogs", runSyncOfflineDogs);
  }
  return runSyncOfflineDogs();
}

// IndexedDB helpers for service worker. DB_VERSION must match
// offline-db.ts; mismatch triggers VersionError on the SW side after a
// page has upgraded.
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StreetDogDB", 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const target = event.target;
      const db = target.result;
      const tx = target.transaction;
      if (!db.objectStoreNames.contains("offlineDogs")) {
        db.createObjectStore("offlineDogs", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      // v1 → v2: backfill retry metadata on existing rows so the sync
      // loop can rely on .failureCount + .dead always being defined.
      if (event.oldVersion < 2) {
        const store = tx.objectStore("offlineDogs");
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (!cursor) return;
          const v = cursor.value;
          let dirty = false;
          if (v.failureCount === undefined) {
            v.failureCount = 0;
            dirty = true;
          }
          if (v.dead === undefined) {
            v.dead = false;
            dirty = true;
          }
          if (dirty) cursor.update(v);
          cursor.continue();
        };
      }
    };
  });
}

async function getAllOfflineDogs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineDogs", "readonly");
    const store = tx.objectStore("offlineDogs");
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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

async function updateOfflineDog(id, patch) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offlineDogs", "readwrite");
    const store = tx.objectStore("offlineDogs");
    const req = store.get(id);
    req.onsuccess = () => {
      const current = req.result;
      if (!current) {
        resolve();
        return;
      }
      store.put({ ...current, ...patch });
    };
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
