self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'RateMySportsTake', {
      body: data.body || "You're in!",
      icon: '/icon.png', // swap for whatever icon exists in /public
      badge: '/icon.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});