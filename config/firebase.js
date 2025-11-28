import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, logEvent, isSupported } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration - using custom domain for production
const firebaseConfig = {
  apiKey: "AIzaSyCNsGqskpxHTGH_YueMeQ46ACvCPx4yhL8",
  authDomain: "spedflowapp.firebaseapp.com", // Temporary: Use Firebase domain until custom domain is authorized
  databaseURL: "https://spedflowapp-default-rtdb.firebaseio.com",
  projectId: "spedflowapp",
  storageBucket: "spedflowapp.firebasestorage.app",
  messagingSenderId: "678556676280",
  appId: "1:678556676280:web:dcf726cfb649338a0b844d",
  measurementId: "G-XQ10LTCEY8"
};

// Initialize Firebase - check if already initialized to prevent duplicate app error
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app initialized successfully');
  console.log('📍 Firebase Project:', firebaseConfig.projectId);
  console.log('🔐 Auth Domain:', firebaseConfig.authDomain);
  
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
    console.log('✅ Firebase Auth initialized for web');
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('✅ Firebase Auth initialized for mobile');
  }
} catch (error) {
  // Auth already initialized, get existing instance
  console.warn('⚠️ Auth already initialized, using existing instance');
  auth = getAuth(app);
}

// Add network error debugging
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('✅ User authenticated:', user.email);
  } else {
    console.log('👤 No user authenticated');
  }
}, (error) => {
  console.error('❌ Auth state change error:', error);
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
const vapidKey = process.env.FIREBASE_VAPID_KEY || 'BDyAbFqr4yfK_4NyhiIMBs_UugbF5Ul4bJEc0gW_s4Xi4h-CErs3aXZHVQuqhv6r-HFaVM8-Izn-MW8U-N_XpK4';

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
    console.log('✅ Firebase Messaging initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase Messaging initialization failed:', error.message);
    messaging = null;
  }
} else {
  console.log('ℹ️ Firebase Messaging not supported in this browser/context');
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
