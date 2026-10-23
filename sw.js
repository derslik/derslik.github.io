/* Servis çalışanı: uygulamayı çevrimdışı açar, sesleri ilk kullanımda önbelleğe alır.
   20261023144614 yayın sırasında zaman damgasıyla değişir; yeni sürüm gelince eski kabuk silinir. */
const SURUM = "20261023144614";
const KABUK = "mv-kabuk-" + SURUM, SES = "mv-ses", YAZI = "mv-yazi";
const KABUK_DOSYALARI = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "fonts/yazi.css", "audio/manifest.js", "audio/manifest3.js", "audio-erkek/manifest.js", "audio-erkek/manifest3.js", "audio-gk/manifest.js", "audio-gk/manifest2.js", "audio-ge/manifest.js", "audio-ge/manifest2.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(KABUK).then(c => Promise.all(KABUK_DOSYALARI.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("mv-kabuk-") && k !== KABUK).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function sesYanit(req) {
  const c = await caches.open(SES);
  let hit = await c.match(req.url);
  if (!hit) {
    const tam = await fetch(req.url);
    if (!tam.ok) return tam;
    c.put(req.url, tam.clone());
    hit = tam;
  }
  const aralik = req.headers.get("range");
  if (!aralik) return hit;
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(aralik);
  const bas = m && m[1] ? parseInt(m[1], 10) : 0;
  const son = m && m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  const dilim = buf.slice(bas, son + 1);
  return new Response(dilim, { status: 206, headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes " + bas + "-" + son + "/" + buf.byteLength, "Content-Length": String(dilim.byteLength), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(YAZI).then(c => c.match(req).then(h => {
      const ag = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => h);
      return h || ag;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  if (/\/audio(-erkek|-gk|-ge)?\/.*\.mp3$/.test(url.pathname)) { e.respondWith(sesYanit(req)); return; }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => { const k = r.clone(); caches.open(KABUK).then(c => c.put("index.html", k)); return r; }).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(h => h || fetch(req).then(r => { const k = r.clone(); caches.open(KABUK).then(c => c.put(req, k)); return r; })));
});
