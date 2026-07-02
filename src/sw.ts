/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Service Worker custom (VitePWA injectManifest mode).
 *
 * Reproduit le comportement precedent (precache + runtime cache) et ajoute
 * les handlers push + notificationclick pour les notifications Web Push.
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { createHandlerBoundToURL } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// ============================================================================
// Precache (app shell) + auto-update
// ============================================================================
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Force update immediat quand un nouveau SW est disponible
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// SPA fallback : toute navigation vers une route inconnue renvoie index.html
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api/, /^\/functions/, /^\/storage/],
  }),
)

// ============================================================================
// Runtime cache : Mapbox + Supabase storage
// ============================================================================
registerRoute(
  /^https:\/\/api\.mapbox\.com\//,
  new CacheFirst({
    cacheName: 'mapbox-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
)

registerRoute(
  /^https:\/\/.*\.supabase\.co\/storage\//,
  new StaleWhileRevalidate({
    cacheName: 'supabase-storage',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 2,
      }),
    ],
  }),
)

// ============================================================================
// Web Push
// ============================================================================

interface PushPayload {
  title: string
  body: string
  link?: string
  notification_id?: string
  icon?: string
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: PushPayload
  try {
    payload = event.data.json() as PushPayload
  } catch {
    payload = {
      title: 'Notification',
      body: event.data.text(),
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.notification_id ?? 'default',
      data: {
        link: payload.link ?? '/',
        notification_id: payload.notification_id,
      },
    } as any),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data as { link?: string } | undefined)?.link ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus onglet existant si possible + navigate
        for (const client of clients) {
          if ('focus' in client) {
            const c = client as WindowClient
            if ('navigate' in c) c.navigate(target).catch(() => {})
            return c.focus()
          }
        }
        // Sinon ouvre nouvel onglet
        if (self.clients.openWindow) return self.clients.openWindow(target)
      }),
  )
})
