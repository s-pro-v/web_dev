const CACHE_NAME = "oxy-os-cache-v7";

const PRECACHE_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./mobile.css",
    "./index.js",
    "./icons.js",
    "./manifest.webmanifest",
    "https://raw.githubusercontent.com/s-pro-v/img/refs/heads/main/G%20img/ico.png",
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
    "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Share+Tech+Mono&display=swap"
];

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

self.addEventListener("fetch", (event) => {
    const requestUrl = new URL(event.request.url);

    // Zapytania do API serwera i synchronizacji nie mogą być keszowane
    if (requestUrl.pathname.startsWith("/api/") || requestUrl.hostname.includes("raw.githubusercontent.com")) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(JSON.stringify({ error: "Brak połączenia z siecią (tryb offline)." }), {
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