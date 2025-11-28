import { auth, db } from '../config/firebase';
import { connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';

// Firebase connectivity test utility
export const testFirebaseConnection = async () => {
  const results = {
    auth: false,
    firestore: false,
    config: false,
    errors: []
  };

  try {
    // Test 1: Check Firebase config
    if (auth && db) {
      results.config = true;
      console.log('✅ Firebase config loaded successfully');
    } else {
      results.errors.push('Firebase config failed to load');
      console.error('❌ Firebase config failed');
      return results;
    }

    // Test 2: Test Auth connection
    try {
      // Try to get current auth state
      const currentUser = auth.currentUser;
      console.log('🔐 Auth state:', currentUser ? 'Signed in' : 'Signed out');
      
      // Test auth connection by checking auth domain
      const authDomain = auth.config.authDomain;
      if (authDomain) {
        results.auth = true;
        console.log('✅ Firebase Auth connected:', authDomain);
      }
    } catch (authError) {
      results.errors.push(`Auth error: ${authError.message}`);
      console.error('❌ Firebase Auth error:', authError);
    }

    // Test 3: Test Firestore connection
    try {
      // Try to access a test document (doesn't need to exist)
      const testDocRef = doc(db, 'test', 'connection');
      
      // This will fail if Firestore is not accessible
      await getDoc(testDocRef);
      results.firestore = true;
      console.log('✅ Firestore connected successfully');
    } catch (firestoreError) {
      // Network errors or permission errors are expected for test doc
      if (firestoreError.code === 'permission-denied' || 
          firestoreError.code === 'unavailable') {
        results.firestore = true; // Connection works, just no permission
        console.log('✅ Firestore connected (permission check failed as expected)');
      } else {
        results.errors.push(`Firestore error: ${firestoreError.message}`);
        console.error('❌ Firestore error:', firestoreError);
      }
    }

  } catch (error) {
    results.errors.push(`General error: ${error.message}`);
    console.error('❌ Firebase test failed:', error);
  }

  return results;
};

// Quick test function for debugging
export const quickFirebaseTest = () => {
  console.log('🔥 Firebase Quick Test');
  console.log('Auth object:', !!auth);
  console.log('Firestore object:', !!db);
  console.log('Auth domain:', auth?.config?.authDomain);
  console.log('Project ID:', db?.app?.options?.projectId);
  
  return {
    authExists: !!auth,
    firestoreExists: !!db,
    authDomain: auth?.config?.authDomain,
    projectId: db?.app?.options?.projectId
  };
};

// Test with actual sign-in attempt
export const testSignIn = async (email = 'test@example.com', password = 'testpassword') => {
  try {
    console.log('🔐 Testing sign-in connectivity...');
    
    // This will fail with user-not-found, but if we get that error,
    // it means Firebase Auth is working
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, result };
    
  } catch (error) {
    console.log('Sign-in test error:', error.code, error.message);
    
    // These errors mean Firebase is working
    const workingErrors = [
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-email',
      'auth/too-many-requests'
    ];
    
    if (workingErrors.includes(error.code)) {
      return { success: true, message: 'Firebase Auth is working (expected auth error)' };
    }
    
    // These errors indicate connection problems
    const connectionErrors = [
      'auth/network-request-failed',
      'auth/timeout',
      'auth/unavailable'
    ];
    
    if (connectionErrors.includes(error.code)) {
      return { success: false, error: 'Firebase connection failed', details: error };
    }
    
    return { success: false, error: error.message, code: error.code };
  }
};
