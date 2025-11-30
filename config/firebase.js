import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getEnv = (key, fallback = '') => {
  const normalizedKeys = [
    `EXPO_PUBLIC_${key}`,
    `NEXT_PUBLIC_${key}`,
    `REACT_APP_${key}`,
    key
  ];

  for (const normalizedKey of normalizedKeys) {
    if (process.env?.[normalizedKey]) {
      return process.env[normalizedKey];
    }
  }

  if (!fallback) {
    console.warn(`⚠️ Missing Firebase config value for ${key}. Using empty string fallback.`);
  }
  return fallback;
};

// Firebase configuration - driven by environment variables
const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN', 'localhost'),
  databaseURL: getEnv('FIREBASE_DATABASE_URL'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID'),
  measurementId: getEnv('FIREBASE_MEASUREMENT_ID', undefined)
};

// Initialize Firebase - check if already initialized to prevent duplicate app error
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Firebase is ready for authentication
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// Initialize Auth with persistence for React Native
let auth;
try {
  if (Platform.OS === 'web') {
    auth = getAuth(app);
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

// Add network error debugging
auth.onAuthStateChanged((user) => {
  // Silent auth state monitoring
});

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence for web
if (Platform.OS === 'web') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support persistence
    }
  });
}

// Initialize Storage
const storage = getStorage(app);

// Initialize Analytics (web only)
let analytics = null;
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Initialize Cloud Messaging (web only)
let messaging = null;
const vapidKey = getEnv('FIREBASE_VAPID_KEY');

// Check if messaging is supported before initializing
const isMessagingSupported = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  
  // Check for required APIs and browser compatibility
  const hasRequiredAPIs = !!(
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    'fetch' in window &&
    'MessageChannel' in window
  );
  
  // Additional checks for browser compatibility
  const isSecureContext = window.isSecureContext || location.protocol === 'https:';
  const isNotPrivateMode = (() => {
    try {
      // Test for private/incognito mode
      const testStorage = window.sessionStorage;
      testStorage.setItem('test', '1');
      testStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  })();
  
  return hasRequiredAPIs && isSecureContext && isNotPrivateMode;
};

// Only initialize messaging if fully supported
if (isMessagingSupported()) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    messaging = null;
  }
} else {
  messaging = null;
}

// Analytics helper functions
const trackEvent = (eventName, eventParams = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

const trackScreenView = (screenName) => {
  trackEvent('screen_view', { screen_name: screenName });
};

const trackUserAction = (action, category, label = '', value = 0) => {
  trackEvent(action, { category, label, value });
};

// Messaging helper functions
const requestNotificationPermission = async () => {
  if (!messaging || !isMessagingSupported()) {
    console.log('ℹ️ Push notifications not available in this browser/context');
    return null;
  }
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey });
      console.log('✅ Notification permission granted, token received');
      return token;
    } else {
      console.log('ℹ️ Notification permission denied by user');
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Error requesting notification permission:', error.message);
    return null;
  }
};

const onMessageListener = (callback) => {
  if (!messaging || !isMessagingSupported()) {
    console.log('ℹ️ Message listener not available - messaging not supported');
    return () => {};
  }
  
  try {
    return onMessage(messaging, callback);
  } catch (error) {
    console.warn('⚠️ Error setting up message listener:', error.message);
    return () => {};
  }
};

export { 
  auth, 
  db, 
  storage, 
  analytics, 
  messaging,
  trackEvent,
  trackScreenView,
  trackUserAction,
  requestNotificationPermission,
  onMessageListener
};
export default app;
