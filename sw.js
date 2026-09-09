/* Calder Studio PWA service worker.
 * The whole app is a single self-contained index.html (all JS/CSS/assets are
 * inlined), so caching index.html + the manifest + the icon is enough to run
 * fully offline. CACHE is stamped with the build id, so publishing a new build
 * (new cache name) drops the old cache on activate. Cache-first: once installed
 * the app opens instantly with no network. __CS_BUILD__ is replaced at pack time. */
var CACHE = "celstudio-b283";
var ASSETS = ["./", "./index.html", "./manifest.json", "./icon.png", "./apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request).catch(function () {
        /* offline and not cached: fall back to the app shell for navigations */
        if (e.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
