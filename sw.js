/* Service worker: chạy offline + tăng tốc. Đổi VERSION mỗi lần sửa code để người dùng nhận bản mới. */
const VERSION = 'atm-v1.1.0';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'lib.js', 'config.js', 'manifest.webmanifest',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/qrcode.js',
  'assets/logo.png', 'icons/icon-192.png', 'icons/favicon.png', 'data/atm.csv', 'data/pgd.csv'];
const TILES = 'atm-tiles', TILE_MAX = 400;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trimTiles(){
  const c = await caches.open(TILES), ks = await c.keys();
  for (let i = 0; i < ks.length - TILE_MAX; i++) await c.delete(ks[i]);
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Ô bản đồ: ưu tiên cache
  if (url.hostname.endsWith('tile.openstreetmap.org')){
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req); if (res.ok || res.type === 'opaque'){ c.put(req, res.clone()); trimTiles(); } return res;
    }));
    return;
  }
  // File của app: ưu tiên mạng (có giới hạn thời gian), lỗi thì dùng cache
  if (url.origin === location.origin){
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej('timeout'), 4000))]);
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch(err){
        const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' && await c.match('index.html'));
        if (hit) return hit; throw err;
      }
    })());
  }
  // Dữ liệu Google Sheets: để app tự xử lý (có lưu bản dự phòng trong máy)
});
