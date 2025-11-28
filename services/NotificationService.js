import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Conditionally import Firebase Messaging only if supported
let getMessaging, getToken, onMessage;
const isMessagingSupported = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  
  return !!(
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    'fetch' in window &&
    'MessageChannel' in window
  );
};

if (isMessagingSupported()) {
  try {
    const messaging = require('firebase/messaging');
    getMessaging = messaging.getMessaging;
    getToken = messaging.getToken;
    onMessage = messaging.onMessage;
  } catch (error) {
    console.warn('Firebase Messaging not available:', error.message);
  }
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.messaging = null;
    this.notificationToken = null;
    
    if (Platform.OS === 'web' && isMessagingSupported() && getMessaging) {
      try {
        this.messaging = getMessaging();
      } catch (error) {
        console.warn('Failed to initialize Firebase Messaging:', error.message);
        this.messaging = null;
      }
    }
  }

  // Initialize push notifications
  async initialize(userId) {
    try {
      if (Platform.OS === 'web') {
        return await this.initializeWebNotifications(userId);
      } else {
        return await this.initializeMobileNotifications(userId);
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize web notifications (Firebase Cloud Messaging)
  async initializeWebNotifications(userId) {
    try {
      // Check if messaging is supported and available
      if (!this.messaging || !getToken || !onMessage) {
        console.warn('Firebase Messaging not supported in this browser');
        return { success: false, error: 'Messaging not supported in this browser' };
      }

      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Get FCM token
        const token = await getToken(this.messaging, {
          vapidKey: 'BDyAbFqr4yfK_4NyhiIMBs_UugbF5Ul4bJEc0gW_s4Xi4h-CErs3aXZHVQuqhv6r-HFaVM8-Izn-MW8U-N_XpK4'
        });
        
        this.notificationToken = token;
        
        // Save token to user profile
        await this.saveTokenToProfile(userId, token);
        
        // Set up message listener
        onMessage(this.messaging, (payload) => {
          this.handleForegroundMessage(payload);
        });
        
        return { success: true, token: token };
      } else {
        return { success: false, error: 'Notification permission denied' };
      }
    } catch (error) {
      console.error('Web notification initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize mobile notifications (Expo Notifications)
  async initializeMobileNotifications(userId) {
    try {
      // Skip on simulators/emulators
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return { success: false, error: 'Requires physical device' };
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return { success: false, error: 'Notification permission denied' };
      }

      // Try to get Expo push token
      // Note: This requires an EAS projectId for standalone builds
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        const token = tokenResponse.data;
        this.notificationToken = token;
        
        // Save token to user profile
        await this.saveTokenToProfile(userId, token);
        
        // Set up notification listeners
        this.setupNotificationListeners();
        
        return { success: true, token: token };
      } catch (tokenError) {
        // If projectId is missing, just set up local notifications
        console.log('Push token unavailable (projectId may be missing), using local notifications only');
        this.setupNotificationListeners();
        return { success: true, localOnly: true };
      }
    } catch (error) {
      console.log('Notification setup skipped:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Save notification token to user profile
  async saveTokenToProfile(userId, token) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationToken: token,
        notificationsEnabled: true,
        lastTokenUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving notification token:', error);
    }
  }

  // Set up notification listeners for mobile
  setupNotificationListeners() {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      this.handleForegroundMessage(notification);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener(response => {
      this.handleNotificationResponse(response);
    });
  }

  // Handle foreground messages
  handleForegroundMessage(payload) {
    // You can customize how foreground notifications are displayed
    if (Platform.OS === 'web') {
      // Show browser notification
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/logo.png'
      });
    }
  }

  // Handle notification response (when user taps notification)
  handleNotificationResponse(response) {
    // Handle navigation based on notification data
    const data = response.notification.request.content.data;
    
    if (data.screen) {
      // Navigate to specific screen
      // This would need to be implemented with your navigation system
    }
  }

  // Send local notification
  async sendLocalNotification(title, body, data = {}) {
    try {
      if (Platform.OS === 'web') {
        // Web notification
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/logo.png',
            data: data
          });
        }
      } else {
        // Mobile notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: body,
            data: data,
            sound: 'default'
          },
          trigger: null, // Show immediately
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error sending local notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule notification for later
  async scheduleNotification(title, body, triggerDate, data = {}) {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't support scheduled notifications directly
        // You'd need to implement this with a service worker
        return { success: false, error: 'Scheduled notifications not supported on web' };
      }

      const trigger = new Date(triggerDate);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data,
          sound: 'default'
        },
        trigger: trigger,
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send payment reminder notification
  async sendPaymentReminder(cardName, amount, dueDate) {
    const title = '💳 Payment Reminder';
    const body = `${cardName} payment of £${amount} is due on ${dueDate}`;
    
    return await this.sendLocalNotification(title, body, {
      type: 'payment_reminder',
      cardName: cardName,
      amount: amount,
      dueDate: dueDate,
      screen: 'Payments'
    });
  }

  // Send budget alert notification
  async sendBudgetAlert(category, percentage, spent, budget) {
    const title = '⚠️ Budget Alert';
    const body = `You've spent ${percentage}% of your ${category} budget (£${spent}/£${budget})`;
    
    return await this.sendLocalNotification(title, body, {
      type: 'budget_alert',
      category: category,
      percentage: percentage,
      screen: 'Budget'
    });
  }

  // Send goal achievement notification
  async sendGoalAchievement(goalName, amount) {
    const title = '🎉 Goal Achieved!';
    const body = `Congratulations! You've reached your ${goalName} goal of £${amount}`;
    
    return await this.sendLocalNotification(title, body, {
      type: 'goal_achievement',
      goalName: goalName,
      amount: amount,
      screen: 'Savings'
    });
  }

  // Send transaction alert
  async sendTransactionAlert(amount, merchant, type) {
    const title = type === 'large_purchase' ? '💰 Large Purchase Alert' : '🔔 Transaction Alert';
    const body = `${type === 'large_purchase' ? 'Large payment' : 'Payment'} of £${amount} at ${merchant}`;
    
    return await this.sendLocalNotification(title, body, {
      type: 'transaction_alert',
      amount: amount,
      merchant: merchant,
      screen: 'Transactions'
    });
  }

  // Send AI insight notification
  async sendAIInsight(insight) {
    const title = '💡 Financial Insight';
    const body = insight;
    
    return await this.sendLocalNotification(title, body, {
      type: 'ai_insight',
      screen: 'Dashboard'
    });
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      if (Platform.OS !== 'web') {
        await Notifications.cancelAllScheduledNotificationsAsync();
      }
      return { success: true };
    } catch (error) {
      console.error('Error canceling notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      if (Platform.OS === 'web') {
        return {
          permission: Notification.permission,
          enabled: Notification.permission === 'granted'
        };
      } else {
        const settings = await Notifications.getPermissionsAsync();
        return {
          permission: settings.status,
          enabled: settings.status === 'granted'
        };
      }
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return { enabled: false };
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationPreferences: preferences,
        updatedAt: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { success: false, error: error.message };
    }
  }

  // Request push notification permissions from device
  async requestPushPermissions() {
    try {
      if (Platform.OS === 'web') {
        // Web notifications
        const permission = await Notification.requestPermission();
        return {
          granted: permission === 'granted',
          status: permission
        };
      } else {
        // Mobile notifications
        if (!Device.isDevice) {
          return {
            granted: false,
            status: 'requires_device',
            error: 'Push notifications require a physical device'
          };
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        return {
          granted: finalStatus === 'granted',
          status: finalStatus
        };
      }
    } catch (error) {
      console.error('Error requesting push permissions:', error);
      return {
        granted: false,
        status: 'error',
        error: error.message
      };
    }
  }

  // Check if user has notifications enabled
  async checkUserNotificationSettings(userId) {
    try {
      const { db } = require('../config/firebase');
      const { doc, getDoc } = require('firebase/firestore');
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.notificationSettings || { push: true, email: true, community: true };
      }
      
      return { push: true, email: true, community: true }; // Default: all enabled
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return { push: true, email: true, community: true }; // Default to enabled on error
    }
  }

  // Send notification to specific user (checks settings first)
  async sendNotification(userId, title, body, data = {}) {
    try {
      // Check if user has push notifications enabled
      const settings = await this.checkUserNotificationSettings(userId);
      
      if (!settings.push) {
        console.log('Push notifications disabled for user:', userId);
        return { success: true, skipped: true, reason: 'Push notifications disabled' };
      }

      if (Platform.OS === 'web') {
        // Web notifications
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: data
          });
        }
      } else {
        // Mobile push notifications
        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: body,
            data: data,
            sound: 'default',
          },
          trigger: null, // Send immediately
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();
