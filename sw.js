// Offline cache so the app still opens with weak signal in Jeju.
const CACHE = "jeju-trip-v16";
const FILES = ["./", "index.html", "data/itinerary.json", "manifest.json", "icon.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png",
  "js/main.js", "js/store.js", "js/views.js", "js/util.js", "js/art.js", "js/config.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so edits show up; fall back to cache offline. Only our own files and the supabase library are cached.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const cacheable = url.origin === location.origin || url.hostname === "cdn.jsdelivr.net" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com";
  if (!cacheable) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
