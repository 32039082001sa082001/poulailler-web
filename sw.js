self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data.json(); } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.titre || 'Mon Poulailler', {
    body: d.corps || '',
    icon: '/poulailler-web/icon-192.png',
    badge: '/poulailler-web/icon-192.png',
    data: { url: d.url || '/poulailler-web/' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/poulailler-web/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (l) {
    for (var i = 0; i < l.length; i++) { if ('focus' in l[i]) return l[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname.indexOf('/poulailler-web/') !== 0) return;
  var nav = r.mode === 'navigate';
  if (!nav && u.pathname.indexOf('/poulailler-web/_expo/') !== 0) return;
  e.respondWith(caches.open('pl-app').then(function (c) {
    var garder = function (res) {
      if (res && res.status === 200) {
        c.put(nav ? '/poulailler-web/' : r, res.clone()).then(function () { return c.keys(); }).then(function (k) {
          var a = k.filter(function (x) { return x.url.indexOf('/_expo/') >= 0; });
          if (a.length > 60) c.delete(a[0]);
        }).catch(function () {});
      }
      return res;
    };
    if (nav) {
      return new Promise(function (ok) {
        var fini = false;
        var t = setTimeout(function () { c.match('/poulailler-web/').then(function (m) { if (m && !fini) { fini = true; ok(m); } }); }, 4000);
        fetch(r).then(function (res) { clearTimeout(t); if (!fini) { fini = true; ok(garder(res)); } else { garder(res); } }).catch(function () { clearTimeout(t); c.match('/poulailler-web/').then(function (m) { if (!fini) { fini = true; ok(m || Response.error()); } }); });
      });
    }
    return c.match(r).then(function (m) { return m || fetch(r).then(garder); });
  }));
});
