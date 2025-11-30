import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser as firebaseDeleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../config/firebase';
import FirebaseService from '../services/FirebaseService';
import AnalyticsService from '../services/AnalyticsService';
import NotificationService from '../services/NotificationService';
import EmailService from '../services/EmailService';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Helper to generate random username based on first name
const generateUsernameHelper = (fullName = '') => {
  // Extract first name (everything before first space)
  const firstName = fullName.trim().split(' ')[0];
  // Clean and capitalize first name
  const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '');
  const capitalizedName = cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1).toLowerCase();
  
  // Generate 2-digit number (10-99)
  const randomDigits = Math.floor(Math.random() * 90) + 10;
  
  // If no valid first name, use fallback
  if (!capitalizedName || capitalizedName.length < 2) {
    const fallbackNames = ['User', 'Saver', 'Budgeter', 'Planner', 'Investor'];
    const fallbackName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    return `${fallbackName}${randomDigits}`;
  }
  
  return `${capitalizedName}${randomDigits}`;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state listener
  useEffect(() => {
    let authTimeout;
    
    // Set a timeout to prevent infinite loading (reduced to 500ms for faster UX)
    authTimeout = setTimeout(() => {
      setLoading(false);
      setUser(null);
    }, 500);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(authTimeout);
      
      if (firebaseUser) {
        // User is signed in - get custom claims for admin check
        const idTokenResult = await firebaseUser.getIdTokenResult();
        const isAdmin = idTokenResult.claims.admin === true;
        
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          emailVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL,
          createdAt: firebaseUser.metadata.creationTime,
          isAdmin: isAdmin
        };
        
        // Get additional user data from Firestore (with shorter timeout for faster login)
        try {
          const profileResult = await Promise.race([
            FirebaseService.getUserProfile(firebaseUser.uid),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 800)) // Reduced from 1500ms
          ]);
          if (profileResult.success && profileResult.data) {
            userData.profile = profileResult.data;
            // Use profile name if available (user's actual name, not email prefix)
            if (profileResult.data.name) {
              userData.name = profileResult.data.name;
            }
            // Load username for community features
            if (profileResult.data.username) {
              userData.username = profileResult.data.username;
            } else {
              // Generate username for existing users (do this in background to not block login)
              const newUsername = generateUsernameHelper(userData.name);
              userData.username = newUsername;
              // Update in background without waiting
              FirebaseService.updateUserProfile(firebaseUser.uid, { username: newUsername }).catch(console.warn);
            }
          }
        } catch (error) {
          // Profile fetch failed or timed out, continue without profile data
          // Set a default username to prevent issues
          userData.username = generateUsernameHelper(userData.name);
        }
        
        setUser(userData);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  const signIn = async (email, password, retryCount = 0) => {
    try {
      setLoading(true);
      
      // Security: Remove sensitive console logs in production
      if (process.env.NODE_ENV === 'development') {
        console.log(`Sign in attempt ${retryCount + 1} for:`, email);
      }
      
      // Don't log auth config - contains sensitive API keys
      
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      console.log('Sign in successful for:', firebaseUser.email);
      
      // Don't duplicate user data creation - let onAuthStateChanged handle it
      // Just track analytics and initialize services in background
      AnalyticsService.trackLogin('email').catch(console.warn);
      NotificationService.initialize(firebaseUser.uid).catch(console.warn);
      
      return { success: true, user: { uid: firebaseUser.uid, email: firebaseUser.email } };
    } catch (error) {
      console.error('Sign in error:', error.code || 'unknown', error.message || error);
      setLoading(false);
      
      // Send security alert for suspicious activity
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        // Don't wait for email to send, just fire and forget
        EmailService.sendSecurityAlert(email, 'Failed Login Attempt', 
          `Someone tried to sign in to your SpendFlow account with the wrong password or non-existent email.\n\nEmail: ${email}\nTime: ${new Date().toLocaleString()}\n\nIf this wasn't you, please secure your account immediately.`
        ).catch(emailError => console.log('Failed to send security alert:', emailError));
      }
      
      // Handle network errors with retry logic
      if (error.code === 'auth/network-request-failed' && retryCount < 2) {
        console.log(`Network error, retrying in ${(retryCount + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
        return signIn(email, password, retryCount + 1);
      }
      
      // Return error details for better user feedback
      let errorMessage = 'An error occurred during sign in';
      
      switch (error.code) {
        case 'auth/network-request-failed':
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/timeout':
          errorMessage = 'Request timed out. Please try again.';
          break;
        default:
          errorMessage = error.message || 'Sign in failed';
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    try {
      setLoading(true);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update display name
      if (name) {
        await firebaseUpdateProfile(firebaseUser, { displayName: name });
      }
      
      // Generate a unique username for community features
      const username = generateUsernameHelper(name);
      
      // Create user profile in Firestore
      const profileData = {
        email: firebaseUser.email,
        name: name || firebaseUser.email?.split('@')[0],
        username: username, // Anonymous username for community
        currency: 'USD', // Default currency
        theme: 'Classic', // Default theme
        preferences: {
          notifications: true,
          darkMode: false,
          language: 'en'
        }
      };
      
      await FirebaseService.createUserProfile(firebaseUser.uid, profileData);
      
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: name || firebaseUser.email?.split('@')[0],
        username: username,
        emailVerified: firebaseUser.emailVerified,
        profile: profileData
      };
      
      // Track sign up event
      AnalyticsService.trackSignUp('email');
      
      // Initialize notifications
      NotificationService.initialize(firebaseUser.uid);
      
      // Send welcome email
      EmailService.sendWelcomeEmail(firebaseUser.email, name || firebaseUser.email?.split('@')[0]);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Sign up error:', error);
      AnalyticsService.trackError('sign_up_error', error.code);
      let errorMessage = 'Sign up failed';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      setLoading(true);
      
      // Track logout (but don't let it block sign out)
      try {
        AnalyticsService.trackLogout();
      } catch (analyticsError) {
        console.log('Analytics tracking failed:', analyticsError);
      }
      
      console.log('Calling Firebase signOut...');
      await firebaseSignOut(auth);
      console.log('Firebase signOut completed');
      
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) {
        return { success: false, error: 'No user logged in' };
      }

      // Update Firebase Auth profile if name or photo changed
      if (updates.name || updates.photoURL) {
        const profileUpdates = {};
        if (updates.name) profileUpdates.displayName = updates.name;
        if (updates.photoURL) profileUpdates.photoURL = updates.photoURL;
        
        await firebaseUpdateProfile(auth.currentUser, profileUpdates);
      }
      
      // Update Firestore profile
      const result = await FirebaseService.updateUserProfile(user.uid, updates);
      
      if (result.success) {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        return { success: true, user: updatedUser };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteAccount = async (password) => {
    try {
      if (!user || !auth.currentUser) {
        return { success: false, error: 'No user logged in' };
      }

      setLoading(true);
      
      // Get the current user's email for reauthentication
      const currentUserEmail = auth.currentUser.email;
      if (!currentUserEmail) {
        return { success: false, error: 'User email not found' };
      }
      
      // Re-authenticate the user with their password before deletion
      const credential = EmailAuthProvider.credential(currentUserEmail, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Delete all user data from Firestore
      const dataDeleteResult = await FirebaseService.deleteUserData(user.uid);
      if (!dataDeleteResult.success) {
        throw new Error('Failed to delete user data: ' + dataDeleteResult.error);
      }
      
      // Delete the Firebase Auth user
      await firebaseDeleteUser(auth.currentUser);
      
      // Track account deletion
      try {
        AnalyticsService.trackEvent('account_deleted', { method: 'email' });
      } catch (error) {
        console.log('Analytics tracking failed:', error);
      }
      
      // Clear local state
      setUser(null);
      
      return { success: true };
    } catch (error) {
      console.error('Delete account error:', error);
      try {
        AnalyticsService.trackError('delete_account_error', error.code);
      } catch (analyticsError) {
        console.log('Analytics error tracking failed:', analyticsError);
      }
      
      let errorMessage = 'Failed to delete account';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign out and sign back in to delete your account.';
      } else {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Admin management functions
  const setAdminClaim = async (uid) => {
    try {
      const functions = getFunctions();
      const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');
      const result = await setAdminClaimFunction({ uid });
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error setting admin claim:', error);
      return { success: false, error: error.message };
    }
  };

  const removeAdminClaim = async (uid) => {
    try {
      const functions = getFunctions();
      const removeAdminClaimFunction = httpsCallable(functions, 'removeAdminClaim');
      const result = await removeAdminClaimFunction({ uid });
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error removing admin claim:', error);
      return { success: false, error: error.message };
    }
  };

  const resetPassword = async (email) => {
    try {
      if (!email) {
        return { success: false, error: 'Email is required' };
      }
      
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      
      // Track password reset request
      try {
        AnalyticsService.trackEvent('password_reset_requested', { method: 'email' });
      } catch (analyticsError) {
        console.log('Analytics tracking failed:', analyticsError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Track the error
      try {
        AnalyticsService.trackError('password_reset_error', error.code);
      } catch (analyticsError) {
        console.log('Error tracking failed:', analyticsError);
      }
      
      let errorMessage = 'Failed to send password reset email';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/user-not-found':
          // Don't reveal that the email doesn't exist for security reasons
          console.log('User not found for password reset, but showing generic success');
          return { success: true };
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    deleteAccount,
    resetPassword,
    setAdminClaim,
    removeAdminClaim
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
