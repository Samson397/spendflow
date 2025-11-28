// Import and configure the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCNsGqskpxHTGH_YueMeQ46ACvCPx4yhL8",
  authDomain: "spedflowapp.firebaseapp.com",
  databaseURL: "https://spedflowapp-default-rtdb.firebaseio.com",
  projectId: "spedflowapp",
  storageBucket: "spedflowapp.firebasestorage.app",
  messagingSenderId: "678556676280",
  appId: "1:678556676280:web:dcf726cfb649338a0b844d",
  measurementId: "G-XQ10LTCEY8"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
