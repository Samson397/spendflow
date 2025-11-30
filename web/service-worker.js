// SpendFlow Service Worker with Firebase Messaging
// Change this version number when you deploy updates!
const CACHE_VERSION = '3';
const CACHE_NAME = `spendflow-v${CACHE_VERSION}`;

// Import Firebase scripts for messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase for messaging
// Configuration is injected at build time from environment variables
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || "",
  authDomain: self.FIREBASE_AUTH_DOMAIN || "",
  databaseURL: self.FIREBASE_DATABASE_URL || "",
  projectId: self.FIREBASE_PROJECT_ID || "",
  storageBucket: self.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: self.FIREBASE_APP_ID || "",
  measurementId: self.FIREBASE_MEASUREMENT_ID || ""
};

firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();
const urlsToCache = [
  '/',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/hero.jpg',
  '/index.bundle.js',
  '/index.bundle.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Listen for skip waiting message from app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when available
self.addEventListener('fetch', event => {
  // Skip caching for API calls and form submissions to prevent interference
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('firebase') ||
      event.request.headers.get('content-type')?.includes('application/json')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Only cache static assets, not dynamic content
          if (event.request.url.includes('.js') || 
              event.request.url.includes('.css') || 
              event.request.url.includes('.png') || 
              event.request.url.includes('.jpg') ||
              event.request.url.includes('manifest.json')) {
            
            // Clone the response
            const responseToCache = response.clone();

            // Add to cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        });
      })
      .catch(() => {
        // Only show offline message for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response('Offline - Please check your connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        }
        // For other requests, just let them fail naturally
        return fetch(event.request);
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New update from SpendFlow',
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('SpendFlow', options)
  );
});

// Firebase background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'SpendFlow';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/assets/logo.png',
    badge: '/assets/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

async function syncTransactions() {
  // Implement offline transaction sync logic here
  console.log('Syncing offline transactions...');
}
