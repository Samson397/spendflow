import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import NotificationsService from '../services/NotificationsService';
import { useCustomAlert } from '../contexts/AlertContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { showAlert } = useCustomAlert();

  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [unreadOnly]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await NotificationsService.getUserNotifications(user.uid, 50, unreadOnly);
      if (result.success) {
        setNotifications(result.notifications);
      }
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await NotificationsService.getNotificationStats(user.uid);
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const result = await NotificationsService.markAsRead(notificationId, user.uid);
      if (result.success) {
        loadNotifications();
        loadStats();
      }
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const result = await NotificationsService.markAllAsRead(user.uid);
      if (result.success) {
        loadNotifications();
        loadStats();
        showAlert('Success', 'All notifications marked as read');
      }
    } catch (error) {
      showAlert('Error', 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await NotificationsService.deleteNotification(notificationId, user.uid);
              if (result.success) {
                loadNotifications();
                loadStats();
              } else {
                showAlert('Error', 'Failed to delete notification');
              }
            } catch (error) {
              showAlert('Error', 'Failed to delete notification');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await loadStats();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'connection_request':
        navigation.navigate('ConnectionsScreen');
        break;
      case 'payment_request':
      case 'payment_reminder':
        navigation.navigate('PaymentRequestsScreen');
        break;
      case 'split_bill_request':
        navigation.navigate('PaymentRequestsScreen', { activeTab: 'split' });
        break;
      case 'smart_transfer_detected':
        navigation.navigate('SmartTransfersScreen');
        break;
      case 'bill_due_reminder':
        navigation.navigate('BudgetScreen');
        break;
      case 'low_balance_alert':
        navigation.navigate('WalletScreen');
        break;
      default:
        // Generic handling
        if (notification.data?.requestId) {
          navigation.navigate('PaymentRequestsScreen');
        } else if (notification.data?.matchId) {
          navigation.navigate('SmartTransfersScreen');
        }
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'connection_request': return 'account-plus';
      case 'connection_accepted': return 'account-check';
      case 'connection_declined': return 'account-remove';
      case 'payment_request': return 'cash-plus';
      case 'payment_reminder': return 'clock';
      case 'payment_request_accepted': return 'check-circle';
      case 'payment_request_declined': return 'close-circle';
      case 'payment_completed': return 'check-all';
      case 'split_bill_request': return 'account-group';
      case 'split_bill_reminder': return 'receipt';
      case 'smart_transfer_detected': return 'link-variant';
      case 'smart_transfer_accepted': return 'check-all';
      case 'smart_transfer_declined': return 'close-circle';
      case 'bill_due_reminder': return 'calendar-alert';
      case 'low_balance_alert': return 'credit-card-alert';
      case 'spending_limit_alert': return 'chart-line';
      default: return 'bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'connection_request': return '#3b82f6';
      case 'connection_accepted': return '#10b981';
      case 'connection_declined': return '#ef4444';
      case 'payment_request': return '#f59e0b';
      case 'payment_reminder': return '#f59e0b';
      case 'payment_request_accepted': return '#10b981';
      case 'payment_request_declined': return '#ef4444';
      case 'payment_completed': return '#10b981';
      case 'split_bill_request': return '#8b5cf6';
      case 'split_bill_reminder': return '#8b5cf6';
      case 'smart_transfer_detected': return '#06b6d4';
      case 'smart_transfer_accepted': return '#10b981';
      case 'smart_transfer_declined': return '#ef4444';
      case 'bill_due_reminder': return '#f59e0b';
      case 'low_balance_alert': return '#ef4444';
      case 'spending_limit_alert': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: theme.cardBg, borderColor: theme.border },
        !item.read && { backgroundColor: theme.primary + '10', borderColor: theme.primary }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={[styles.notificationIcon, { backgroundColor: getNotificationColor(item.type) }]}>
          <Icon name={getNotificationIcon(item.type)} size={20} color="#fff" />
        </View>
        <View style={styles.notificationInfo}>
          <Text style={[styles.notificationTitle, { color: theme.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.notificationActions}>
          {!item.read && (
            <TouchableOpacity
              style={[styles.markReadButton, { backgroundColor: theme.primary }]}
              onPress={() => markAsRead(item.id)}
            >
              <Icon name="check" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
            onPress={() => deleteNotification(item.id)}
          >
            <Icon name="delete" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={[styles.notificationMessage, { color: theme.text }]}>
        {item.message}
      </Text>
      
      {item.requiresAction && (
        <View style={styles.actionIndicator}>
          <Icon name="alert-circle" size={16} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.primary }]}>Action Required</Text>
        </View>
      )}
      
      {item.data && (
        <View style={styles.notificationData}>
          {item.data.amount && (
            <Text style={[styles.dataText, { color: theme.primary }]}>
              {formatAmount(item.data.amount)}
            </Text>
          )}
          {item.data.reason && (
            <Text style={[styles.dataText, { color: theme.textSecondary }]}>
              {item.data.reason}
            </Text>
          )}
          {item.sender && (
            <Text style={[styles.dataText, { color: theme.textSecondary }]}>
              From: {item.sender.name || item.sender.email}
            </Text>
          )}
          {item.otherUser && (
            <Text style={[styles.dataText, { color: theme.textSecondary }]}>
              With: {item.otherUser.name || item.otherUser.email}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderStatsItem = (label, value, color) => (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>Stay updated with your financial activity</Text>
      </LinearGradient>

      {/* Stats */}
      {stats && (
        <View style={[styles.statsContainer, { backgroundColor: theme.cardBg }]}>
          {renderStatsItem('Total', stats.total, theme.primary)}
          {renderStatsItem('Unread', stats.unread, '#f59e0b')}
          {renderStatsItem('Actions', stats.requiresAction, '#ef4444')}
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controlsContainer, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            unreadOnly && { backgroundColor: theme.primary }
          ]}
          onPress={() => setUnreadOnly(!unreadOnly)}
        >
          <Icon 
            name={unreadOnly ? 'email-open' : 'email'} 
            size={20} 
            color={unreadOnly ? '#fff' : theme.text} 
          />
          <Text style={[
            styles.filterButtonText,
            { color: unreadOnly ? '#fff' : theme.text }
          ]}>
            {unreadOnly ? 'All' : 'Unread'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.markAllButton, { backgroundColor: theme.primary }]}
          onPress={markAllAsRead}
          disabled={stats?.unread === 0}
        >
          <Icon name="check-all" size={20} color="#fff" />
          <Text style={styles.markAllButtonText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="bell-off" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {unreadOnly ? 'No Unread Notifications' : 'No Notifications'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {unreadOnly 
                ? 'All caught up! No new notifications to show.'
                : 'Notifications about your transfers, requests, and account activity will appear here.'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    margin: 20,
    borderRadius: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  filterButtonText: {
    fontWeight: 'bold',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  markAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationItem: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  markReadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  actionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notificationData: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    gap: 2,
  },
  dataText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});
