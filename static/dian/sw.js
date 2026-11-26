/* 点名器离线缓存 — 每日 24:00（本地时间）后首次访问时自动刷新缓存 */
var CACHE = 'dianmingqi-v2';
var DAY_KEY = 'dianmingqi-fetched-day';
var ASSETS = ['./', './index.html', './sw.js'];
var refreshing = false;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
      .then(function () { return refreshIfNewDay(); })
  );
});

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

/* 跨过一天后的首次 SW 活动：后台重新拉取全部资源刷新缓存。
   全部成功才写日期标记；有失败则不写，下次请求继续重试。 */
function refreshIfNewDay() {
  if (refreshing) return Promise.resolve();
  refreshing = true;
  var ok = true;
  return caches.open(CACHE).then(function (cache) {
    return cache.match(DAY_KEY).then(function (mark) {
      return mark && mark.text ? mark.text() : null;
    }).then(function (day) {
      if (day === todayStr()) return;
      return Promise.all(ASSETS.map(function (path) {
        return fetch(path, { cache: 'reload' }).then(function (res) {
          if (!res || !res.ok) { ok = false; return; }
          return cache.put(path, res);
        }).catch(function () { ok = false; });
      })).then(function () {
        if (ok) return cache.put(DAY_KEY, new Response(todayStr()));
      });
    });
  }).catch(function () { /* 离线等场景：静默放弃，下次请求再试 */ })
    .then(function () { refreshing = false; });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      refreshIfNewDay(); // 每天第一次取资源时顺带后台刷新，不阻塞响应
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html'); // 断网时回退到缓存首页
      });
    })
  );
});
