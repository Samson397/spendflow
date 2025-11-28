// Quick Firebase Auth Debug Test
import { auth } from './config/firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

console.log('🔥 Firebase Auth Debug Test');
console.log('Auth object:', auth);
console.log('Auth config:', auth.config);
console.log('Current user:', auth.currentUser);

// Test function to check auth connectivity
async function testAuth() {
  try {
    console.log('Testing Firebase Auth connectivity...');
    
    // Try to create a test user (this will fail if auth is working but user exists)
    const testEmail = 'test@spendflow.uk';
    const testPassword = 'testpassword123';
    
    try {
      const result = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      console.log('✅ Test user created successfully:', result.user.email);
      
      // Clean up - delete the test user
      await result.user.delete();
      console.log('✅ Test user cleaned up');
      
    } catch (createError) {
      console.log('Create user error (expected if user exists):', createError.code);
      
      if (createError.code === 'auth/email-already-in-use') {
        console.log('✅ Auth is working - user already exists');
        
        // Try to sign in with existing user
        try {
          const signInResult = await signInWithEmailAndPassword(auth, testEmail, testPassword);
          console.log('✅ Sign in successful:', signInResult.user.email);
          await signInResult.user.delete();
          console.log('✅ Test completed successfully');
        } catch (signInError) {
          console.log('Sign in error:', signInError.code, signInError.message);
        }
      } else {
        console.error('❌ Auth error:', createError.code, createError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Firebase Auth test failed:', error);
  }
}

// Run the test
testAuth();

export { testAuth };
