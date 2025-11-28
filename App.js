import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, Platform, Image, LogBox } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ChartProvider } from './contexts/ChartContext';
import { AlertProvider, useCustomAlert } from './contexts/AlertContext';
import CustomAlert from './components/CustomAlert';
import CookieBanner from './components/CookieBanner';
import ErrorBoundary from './components/ErrorBoundary';
import UpdateNotification from './components/UpdateNotification';
import LandingScreen from './screens/LandingScreen';
import FeaturesScreen from './screens/FeaturesScreen';
import AboutScreen from './screens/AboutScreen';
import FAQScreen from './screens/FAQScreen';
import BlogScreen from './screens/BlogScreen';
import ContactScreen from './screens/ContactScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import NotFoundScreen from './screens/NotFoundScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
import DashboardScreen from './screens/DashboardScreen';
import WalletScreen from './screens/WalletScreen';
import ViewCardScreen from './screens/ViewCardScreen';
import DirectDebitsScreen from './screens/DirectDebitsScreen';
import SavingsAccountScreen from './screens/SavingsAccountScreen';
import StatementsScreen from './screens/StatementsScreen';
import NotificationCenterScreen from './screens/NotificationCenterScreen';
import CalendarScreen from './screens/CalendarScreen';
import ThemeScreen from './screens/ThemeScreen';
import BudgetScreen from './screens/BudgetScreen';
import RecurringTransfersScreen from './screens/RecurringTransfersScreen';
import ReportsScreen from './screens/ReportsScreen';
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';
import ChartsScreen from './screens/ChartsScreen';
import GoalsScreen from './screens/GoalsScreen';
import CommunityTipsScreen from './screens/CommunityTipsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import QuickAddScreen from './screens/QuickAddScreen';
import ShareHandlerScreen from './screens/ShareHandlerScreen';
import IOSShortcutsScreen from './screens/IOSShortcutsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminUsersScreen from './screens/AdminUsersScreen';
import AdminSupportScreen from './screens/AdminSupportScreen';
import AdminAnalyticsScreen from './screens/AdminAnalyticsScreen';
import AdminTransactionsScreen from './screens/AdminTransactionsScreen';

// Suppress non-critical React Native Web warnings
if (Platform.OS !== 'web') {
  LogBox.ignoreLogs([
    'Unexpected text node',
    'props.pointerEvents is deprecated',
    'shadow* style props are deprecated',
    'textShadow* style props are deprecated'
  ]);
} else {
  // Suppress console errors and warnings for React Native Web compatibility issues
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (
      args[0].includes('Unexpected text node') ||
      args[0].includes('props.pointerEvents is deprecated') ||
      args[0].includes('BloomFilter error')
    )) {
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (
      args[0].includes('shadow* style props are deprecated') ||
      args[0].includes('textShadow* style props are deprecated') ||
      args[0].includes('props.pointerEvents is deprecated') ||
      args[0].includes('BloomFilter error')
    )) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const { width } = Dimensions.get('window');
const Stack = createNativeStackNavigator();


function AppNavigator() {
  const { user, loading } = useAuth();

  // Handle URL scheme parameters for Siri shortcuts
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      
      if (action && user) {
        handleUrlScheme(action);
      }
    }
  }, [user]);

  const handleUrlScheme = (action) => {
    // Parse action parameter for Siri shortcuts
    if (action.includes('quick-add')) {
      const params = new URLSearchParams(action.split('?')[1] || '');
      const type = params.get('type') || 'expense';
      const amount = params.get('amount') || '';
      const category = params.get('category') || '';
      const description = params.get('description') || '';
      
      // Navigate to QuickAdd with pre-filled data
      setTimeout(() => {
        window.location.href = `/quick-add?type=${type}&amount=${amount}&category=${category}&description=${description}`;
      }, 100);
    }
  };

  if (loading) {
    // Show loading screen while checking authentication
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>SpendFlow</Text>
          <Text style={styles.loadingSubtext}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // Check if user is admin-only account
          user.email === 'spendflowapp@gmail.com' ? (
            // Admin-only interface - no regular app access
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
              <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
              <Stack.Screen name="AdminTransactions" component={AdminTransactionsScreen} />
              <Stack.Screen name="AdminSupport" component={AdminSupportScreen} />
              <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            </>
          ) : (
            // Regular user interface - full app access
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="Wallet" component={WalletScreen} />
              <Stack.Screen name="ViewCard" component={ViewCardScreen} />
              <Stack.Screen name="Calendar" component={CalendarScreen} />
              <Stack.Screen name="Charts" component={ChartsScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Theme" component={ThemeScreen} />
              <Stack.Screen name="Statements" component={StatementsScreen} />
              <Stack.Screen name="SavingsAccount" component={SavingsAccountScreen} />
              <Stack.Screen name="DirectDebits" component={DirectDebitsScreen} />
              <Stack.Screen name="Budget" component={BudgetScreen} />
              <Stack.Screen name="RecurringTransfers" component={RecurringTransfersScreen} />
              <Stack.Screen name="Reports" component={ReportsScreen} />
              <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
              <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
              <Stack.Screen name="Goals" component={GoalsScreen} />
              <Stack.Screen name="CommunityTips" component={CommunityTipsScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="QuickAdd" component={QuickAddScreen} />
              <Stack.Screen name="ShareHandler" component={ShareHandlerScreen} />
              <Stack.Screen name="IOSShortcuts" component={IOSShortcutsScreen} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
              <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
              <Stack.Screen name="NotFound" component={NotFoundScreen} />
            </>
          )
        ) : (
          // User is not logged in - show marketing and auth screens
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Features" component={FeaturesScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="FAQ" component={FAQScreen} />
            <Stack.Screen name="Blog" component={BlogScreen} />
            <Stack.Screen name="Contact" component={ContactScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="NotFound" component={NotFoundScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <CurrencyProvider>
              <ChartProvider>
                <AlertProvider>
                  <UpdateNotification />
                  <AppNavigator />
                </AlertProvider>
              </ChartProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    height: 250,
    position: 'relative',
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  heroOverlayMobile: {
    bottom: 20,
    right: 10,
    left: 10,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    maxWidth: 600,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroButtons: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-end',
  },
  heroButtonsMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroButton: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(103, 126, 234, 0.1)',
  },
  heroButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  heroButtonOutline: {
    backgroundColor: '#667eea',
    borderWidth: 0,
  },
  heroButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: 'bold',
  },
  heroButtonOutlineText: {
    color: '#ffffff',
  },
  features: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 26,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  featureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 24,
    width: width > 768 ? 280 : width - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0, 0, 0, 0.1)' : undefined,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
  },
  featureDescription: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
  },
  footerLink: {
    fontSize: 14,
    color: '#667eea',
    textDecorationLine: 'underline',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
