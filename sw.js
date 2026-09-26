/* Balance service worker — เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดตไฟล์ เพื่อให้เครื่องผู้ใช้โหลดของใหม่ */
const VERSION = 'balance-v2.8.2';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-64.png', 'icons/logo-mark.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // หน้าเว็บของเราเอง: ลองเน็ตก่อน (ได้เวอร์ชันใหม่) ถ้าออฟไลน์ค่อยใช้ของในแคช
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined)))
    );
    return;
  }

  // ฟอนต์และไลบรารีสแกนบาร์โค้ด: ใช้แคชก่อน
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION + '-ext').then(c => c.put(req, copy)); return res;
    })));
  }
  // อย่างอื่น (เช่น Open Food Facts) ปล่อยผ่านเน็ตตามปกติ
});
