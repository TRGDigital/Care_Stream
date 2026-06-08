/* CareStream service worker.
 * Makes the hub installable and handles web-push notifications (the replacement for
 * the WhatsApp nudge). Kept dependency-free and minimal on purpose. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// A no-op fetch handler — its mere presence helps satisfy install criteria on some
// browsers. We don't cache yet (the hub is auth'd, live data), so just pass through.
self.addEventListener('fetch', () => {})

// Push: show a notification that deep-links back into the hub.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = { body: event.data && event.data.text() } }
  const title = data.title || 'CareStream'
  const options = {
    body:  data.body || '',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    tag:   data.tag || undefined,
    data:  { url: data.url || '/chat' },
    renotify: !!data.tag,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// Click: focus an existing hub tab or open one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/chat'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.includes(target.split('?')[0])) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})
