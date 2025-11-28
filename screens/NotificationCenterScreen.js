import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FirebaseService from '../services/FirebaseService';

export default function NotificationCenterScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All'); // All, Unread, Read
  
  // Load notifications from Firebase
  useEffect(() => {
    const loadNotifications = async () => {
      if (user?.uid) {
        const result = await FirebaseService.getUserNotifications(user.uid);
        if (result.success) {
          setNotifications(result.data);
        }
      }
    };
    
    loadNotifications();
  }, [user]);
  
  // Filter notifications
  const getFilteredNotifications = () => {
    switch (filter) {
      case 'Unread':
        return notifications.filter(n => !n.read);
      case 'Read':
        return notifications.filter(n => n.read);
      default:
        return notifications;
    }
  };
  
  const filteredNotifications = getFilteredNotifications();
  
  // Mark notification as read
  const handleNotificationPress = async (notification) => {
    if (!notification.read) {
      await FirebaseService.markNotificationAsRead(user.uid, notification.id);
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
    }
    
    // Navigate based on notification type
    if (notification.screen) {
      navigation.navigate(notification.screen, notification.params || {});
    }
  };
  
  // Mark all as read
  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) {
      Alert.alert('No Unread Notifications', 'All notifications are already marked as read.');
      return;
    }
    
    await FirebaseService.markAllNotificationsAsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    Alert.alert('Success', 'All notifications marked as read');
  };
  
  // Clear all notifications
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await FirebaseService.clearAllNotifications(user.uid);
            setNotifications([]);
            Alert.alert('Success', 'All notifications cleared');
          }
        }
      ]
    );
  };
  
  // Delete single notification
  const handleDeleteNotification = async (notificationId) => {
    await FirebaseService.deleteNotification(user.uid, notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const iconMap = {
      payment_reminder: '💳',
      budget_alert: '⚠️',
      goal_achievement: '🎉',
      transaction_alert: '🔔',
      ai_insight: '💡',
      direct_debit: '🔄',
      savings: '💰',
      system: 'ℹ️',
    };
    return iconMap[type] || '📬';
  };
  
  // Format time ago
  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
        
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount} unread</Text>
          </View>
        )}
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { backgroundColor: theme.cardBg }]}>
        {['All', 'Unread', 'Read'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterTab,
              filter === tab && { borderBottomColor: theme.primary, borderBottomWidth: 3 }
            ]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[
              styles.filterTabText,
              { color: theme.textSecondary },
              filter === tab && { color: theme.primary, fontWeight: 'bold' }
            ]}>
              {tab}
              {tab === 'Unread' && unreadCount > 0 && ` (${unreadCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <View style={[styles.actionBar, { backgroundColor: theme.background[0] }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}
            onPress={handleMarkAllRead}
          >
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>✓ Mark All Read</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' + '20' }]}
            onPress={handleClearAll}
          >
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>🗑️ Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.notificationCard,
              { backgroundColor: theme.cardBg },
              !item.read && { borderLeftColor: theme.primary, borderLeftWidth: 4 }
            ]}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationIcon}>{getNotificationIcon(item.type)}</Text>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.notificationBody, { color: theme.textSecondary }]}>
                    {item.body}
                  </Text>
                  <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
                    {getTimeAgo(item.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteNotification(item.id)}
                >
                  <Text style={[styles.deleteButtonText, { color: theme.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
            <Text style={styles.emptyStateEmoji}>
              {filter === 'Unread' ? '✅' : '📬'}
            </Text>
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              {filter === 'Unread' ? 'All Caught Up!' : 'No Notifications'}
            </Text>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              {filter === 'Unread' 
                ? 'You have no unread notifications'
                : 'Your notifications will appear here'}
            </Text>
          </View>
        )}
      />

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  unreadBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  filterTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#a0aec0',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#a0aec0',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
});
