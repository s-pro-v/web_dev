const CACHE_NAME = "oxy-os-cache-v1";

const PRECACHE_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./mobile.css",
    "./index.js",
    "./icons.js",
    "./manifest.webmanifest",
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css",
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
];

// Instalacja i precache kluczowych zasobów
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (const asset of PRECACHE_ASSETS) {
                try {
                    await cache.add(asset);
                } catch (err) {
                    console.warn(`[SW] Precache pominięty dla: ${asset}`, err);
                }
            }
        })
    );
    self.skipWaiting();
});

// Czyszczenie starych wersji cache
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

// Strategia Cache-First (sieć jako fallback z doładowaniem do cache)
self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    // Wykluczanie dynamicznego API GitHub z cache Service Workera (aplikacja sama obsługuje localStorage)
    if (requestUrl.hostname.includes("raw.githubusercontent.com")) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: "Offline mode - sync unavailable" }), {
                    status: 503,
                    headers: { "Content-Type": "application/json" }
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "opaque") {
                        return networkResponse;
                    }

                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });

                    return networkResponse;
                })
                .catch(() => {
                    if (event.request.headers.get("accept")?.includes("text/html")) {
                        return caches.match("./index.html");
                    }
                });
        })
    );
});