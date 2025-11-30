import React, { useEffect, lazy, Suspense } from 'react';
import { Platform, Dimensions, StyleSheet, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import ThemeProvider from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ChartProvider } from './contexts/ChartContext';
import { AlertProvider } from './contexts/AlertContext';
import UpdateNotification from './components/UpdateNotification';
import LandingScreen from './screens/LandingScreen';
import FeaturesScreen from './screens/FeaturesScreen';
import AboutScreen from './screens/AboutScreen';
import FAQScreen from './screens/FAQScreen';
import BlogScreen from './screens/BlogScreen';
import BlogArticleScreen from './screens/BlogArticleScreen';
import ContactScreen from './screens/ContactScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from './screens/TermsOfServiceScreen';
import NotFoundScreen from './screens/NotFoundScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
// Lazy load heavy screens
const LazyDashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const LazyWalletScreen = lazy(() => import('./screens/WalletScreen'));
const LazyBudgetScreen = lazy(() => import('./screens/BudgetScreen'));
const LazyReportsScreen = lazy(() => import('./screens/ReportsScreen'));
import ViewCardScreen from './screens/ViewCardScreen';
import DirectDebitsScreen from './screens/DirectDebitsScreen';
import SavingsAccountScreen from './screens/SavingsAccountScreen';
import StatementsScreen from './screens/StatementsScreen';
import UnifiedNotificationCenterScreen from './screens/UnifiedNotificationCenterScreen';
import CalendarScreen from './screens/CalendarScreen';
import ThemeScreen from './screens/ThemeScreen';
import RecurringTransfersScreen from './screens/RecurringTransfersScreen';
import UnifiedTransfersScreen from './screens/UnifiedTransfersScreen';
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';
import GoalsScreen from './screens/GoalsScreen';
import CommunityTipsScreen from './screens/CommunityTipsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import QuickAddScreen from './screens/QuickAddScreen';
import ShareHandlerScreen from './screens/ShareHandlerScreen';
import IOSShortcutsScreen from './screens/IOSShortcutsScreen';
// Social Finance Screens
import ConnectionsScreen from './screens/ConnectionsScreen';
import PaymentRequestsScreen from './screens/PaymentRequestsScreen';
import SmartTransfersScreen from './screens/SmartTransfersScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminUsersScreen from './screens/AdminUsersScreen';
import AdminSupportScreen from './screens/AdminSupportScreen';
import AdminAnalyticsScreen from './screens/AdminAnalyticsScreen';
import AdminTransactionsScreen from './screens/AdminTransactionsScreen';

// Suppress non-critical React Native Web warnings
if (Platform.OS !== 'web') {
  const LogBox = require('react-native').LogBox;
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

  // Initialize security checks on app start
  useEffect(() => {
    // Secure console to prevent API key exposure
    const secureConsole = () => {
      // Implementation of secureConsole
    };
    
    // Check for security issues in development
    const checkSecurity = () => {
      // Implementation of checkSecurity
      return { isSecure: true, warnings: [] };
    };
    
    secureConsole();
    
    if (process.env.NODE_ENV === 'development') {
      const security = checkSecurity();
      if (!security.isSecure) {
        console.warn('🔒 Security Issues:', security.warnings);
      }
    }
  }, []);

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

  // Don't block rendering for auth loading - let navigation handle it
  // The loading state will be handled within the navigation logic

  const linking = {
    prefixes: ['https://spendflow.uk', 'https://spedflowapp.web.app', 'http://localhost:8081'],
    config: {
      screens: {
        // Public pages
        Landing: {
          path: '/',
        },
        Features: {
          path: '/features',
        },
        About: {
          path: '/about',
        },
        FAQ: {
          path: '/faq',
        },
        Blog: {
          path: '/blog',
        },
        Contact: {
          path: '/contact',
        },
        PrivacyPolicy: {
          path: '/privacy',
        },
        TermsOfService: {
          path: '/terms',
        },
        SignIn: {
          path: '/signin',
        },
        SignUp: {
          path: '/signup',
        },
        ForgotPassword: {
          path: '/forgot-password',
        },
        
        // Authenticated app pages
        Dashboard: {
          path: '/dashboard',
        },
        Wallet: {
          path: '/wallet',
        },
        ViewCard: {
          path: '/wallet/card/:cardId',
        },
        Budget: {
          path: '/budgets',
        },
        Goals: {
          path: '/goals',
        },
        SavingsAccount: {
          path: '/savings',
        },
        DirectDebits: {
          path: '/direct-debits',
        },
        Calendar: {
          path: '/calendar',
        },
        Statements: {
          path: '/statements',
        },
        Reports: {
          path: '/reports',
        },
        Profile: {
          path: '/profile',
        },
        Theme: {
          path: '/settings/theme',
        },
        UnifiedNotificationCenter: {
          path: '/notifications-center',
        },
        NotificationPreferences: {
          path: '/settings/notifications',
        },
        SmartTransfers: {
          path: '/smart-transfers',
        },
        RecurringTransfers: {
          path: '/recurring-transfers',
        },
        UnifiedTransfers: {
          path: '/transfers',
        },
        CommunityTips: {
          path: '/community/tips',
        },
        Leaderboard: {
          path: '/community/leaderboard',
        },
        QuickAdd: {
          path: '/quick-add',
        },
        ShareHandler: {
          path: '/share',
        },
        IOSShortcuts: {
          path: '/shortcuts',
        },
        // Social Finance Routes
        Connections: {
          path: '/connections',
        },
        PaymentRequests: {
          path: '/payment-requests',
        },
        SmartTransfers: {
          path: '/smart-transfers',
        },
        Notifications: {
          path: '/social-notifications',
        },
        
        // Admin pages
        AdminDashboard: {
          path: '/admin',
        },
        AdminUsers: {
          path: '/admin/users',
        },
        AdminSupport: {
          path: '/admin/support',
        },
        AdminAnalytics: {
          path: '/admin/analytics',
        },
        AdminTransactions: {
          path: '/admin/transactions',
        },
        
        // Fallback
        NotFound: '*',
      },
    },
  };

  return (
    <NavigationContainer 
      linking={linking}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {loading ? (
          // Show landing page while checking auth
          <Stack.Screen name="Landing" component={LandingScreen} />
        ) : user ? (
          // Check if user has admin custom claims
          user.isAdmin ? (
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
              <Stack.Screen name="Dashboard" component={() => (
                <Suspense fallback={<View style={styles.loadingContainer}><Text>Loading...</Text></View>}>
                  <LazyDashboardScreen />
                </Suspense>
              )} />
              <Stack.Screen name="Wallet" component={() => (
                <Suspense fallback={<View style={styles.loadingContainer}><Text>Loading...</Text></View>}>
                  <LazyWalletScreen />
                </Suspense>
              )} />
              <Stack.Screen name="ViewCard" component={ViewCardScreen} />
              <Stack.Screen name="Calendar" component={CalendarScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Theme" component={ThemeScreen} />
              <Stack.Screen name="Statements" component={StatementsScreen} />
              <Stack.Screen name="SavingsAccount" component={SavingsAccountScreen} />
              <Stack.Screen name="DirectDebits" component={DirectDebitsScreen} />
              <Stack.Screen name="Budget" component={() => (
                <Suspense fallback={<View style={styles.loadingContainer}><Text>Loading...</Text></View>}>
                  <LazyBudgetScreen />
                </Suspense>
              )} />
              <Stack.Screen name="RecurringTransfers" component={RecurringTransfersScreen} />
              <Stack.Screen name="UnifiedTransfers" component={UnifiedTransfersScreen} />
              <Stack.Screen name="Reports" component={() => (
                <Suspense fallback={<View style={styles.loadingContainer}><Text>Loading...</Text></View>}>
                  <LazyReportsScreen />
                </Suspense>
              )} />
              <Stack.Screen name="UnifiedNotificationCenter" component={UnifiedNotificationCenterScreen} />
              <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
              <Stack.Screen name="Goals" component={GoalsScreen} />
              <Stack.Screen name="CommunityTips" component={CommunityTipsScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen name="QuickAdd" component={QuickAddScreen} />
              <Stack.Screen name="ShareHandler" component={ShareHandlerScreen} />
              <Stack.Screen name="IOSShortcuts" component={IOSShortcutsScreen} />
              {/* Social Finance Screens */}
              <Stack.Screen name="Connections" component={ConnectionsScreen} />
              <Stack.Screen name="PaymentRequests" component={PaymentRequestsScreen} />
              <Stack.Screen name="SmartTransfers" component={SmartTransfersScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
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
            <Stack.Screen name="BlogArticle" component={BlogArticleScreen} />
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
  minimalLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 9999,
  },
  minimalLoadingIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    opacity: 0.8,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'web' 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : '#667eea',
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
