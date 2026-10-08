/* 时光电台 — Service Worker（应用外壳离线缓存） */
const CACHE = 'fm891-v66';

const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './request.js',
  './mqtt.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 只处理同源请求：直播流、CDN 脚本不拦截
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 导航请求（打开/刷新 App）走**网络优先**：index.html 决定整个外壳，
     最该先拿到新的；拿不到才退回缓存，断网也能开。 */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((k) => k.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* 静态资源走 stale-while-revalidate：先用缓存出声（秒开），
     **同时后台回源校验并更新缓存**，下次打开就是新的。

     这里原来只有 `if (cached) return cached` —— 纯 cache-first，命中就永不
     回源。后果不是「慢一点」，而是**发版后用户反复拿到旧 app.js/style.css**：
     新 SW 要等浏览器重新拉 sw.js 才装上，装上前一直吃老缓存。
     这正是网页版「明明改了，点歌台还是乱的」的一大来源。
     （APK 走 file:// 装不了 SW，不受影响；网页版受影响。） */
  event.respondWith(
    caches.match(req).then((cached) => {
      const fromNet = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type !== 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((k) => k.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => null);
      // cached 已经在手上就直接出声；回源请求照样发出去了（上面已启动）
      return (
        cached ||
        fromNet.then((r) => r || new Response('', { status: 504, statusText: 'Offline' }))
      );
    })
  );
});
