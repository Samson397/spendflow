import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Alert, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import NotificationsService from '../services/NotificationsService';
import FirebaseService from '../services/FirebaseService';
import { useCustomAlert } from '../contexts/AlertContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function UnifiedNotificationCenterScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { showAlert } = useCustomAlert();

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('All'); // All, Unread, Read, Social, General
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadNotifications();
    loadStats();
  }, [filter, unreadOnly]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Load both social and general notifications
      const [socialResult, generalResult] = await Promise.all([
        NotificationsService.getUserNotifications(user.uid, 50, unreadOnly),
        FirebaseService.getUserNotifications(user.uid)
      ]);

      let allNotifications = [];
      
      // Add social notifications
      if (socialResult.success) {
        allNotifications = allNotifications.concat(socialResult.notifications.map(n => ({
          ...n,
          source: 'social',
          category: 'Social'
        })));
      }

      // Add general notifications
      if (generalResult.success) {
        allNotifications = allNotifications.concat(generalResult.data.map(n => ({
          ...n,
          source: 'general',
          category: 'General'
        })));
      }

      // Sort by date (newest first)
      allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply filters
      if (filter === 'Unread') {
        allNotifications = allNotifications.filter(n => !n.read);
      } else if (filter === 'Read') {
        allNotifications = allNotifications.filter(n => n.read);
      } else if (filter === 'Social') {
        allNotifications = allNotifications.filter(n => n.source === 'social');
      } else if (filter === 'General') {
        allNotifications = allNotifications.filter(n => n.source === 'general');
      }

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Load notifications error:', error);
      showAlert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [socialStats, generalResult] = await Promise.all([
        NotificationsService.getNotificationStats(user.uid),
        FirebaseService.getUserNotifications(user.uid)
      ]);

      const generalCount = generalResult.success ? 
        generalResult.data.filter(n => !n.read).length : 0;

      setStats({
        total: socialStats?.total || 0 + generalCount,
        unread: socialStats?.unread || 0 + generalCount,
        social: socialStats?.total || 0,
        general: generalCount
      });
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const markAsRead = async (notificationId, source) => {
    try {
      // Use the same service for all notifications to ensure consistency
      await NotificationsService.markAsRead(notificationId, user.uid);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Mark all social notifications as read
      await NotificationsService.markAllAsRead(user.uid);
      
      // Mark all general notifications as read
      const unreadGeneral = notifications.filter(n => n.source === 'general' && !n.read);
      for (const notification of unreadGeneral) {
        await FirebaseService.markNotificationAsRead(user.uid, notification.id);
      }
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      loadStats();
    } catch (error) {
      console.error('Mark all as read error:', error);
      showAlert('Error', 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (notificationId, source) => {
    try {
      if (source === 'social') {
        await NotificationsService.deleteNotification(user.uid, notificationId);
      } else {
        await FirebaseService.deleteNotification(user.uid, notificationId);
      }
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      loadStats();
    } catch (error) {
      console.error('Delete notification error:', error);
    }
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
      await markAsRead(notification.id, notification.source);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'connection_request':
        navigation.navigate('Connections');
        break;
      case 'payment_request':
      case 'payment_reminder':
        navigation.navigate('PaymentRequests');
        break;
      case 'split_bill_request':
        navigation.navigate('PaymentRequests', { activeTab: 'split' });
        break;
      case 'smart_transfer_detected':
        navigation.navigate('SmartTransfers');
        break;
      case 'bill_due_reminder':
        navigation.navigate('Budget');
        break;
      case 'low_balance_alert':
        navigation.navigate('Wallet');
        break;
      case 'budget_alert':
        navigation.navigate('Budget');
        break;
      case 'goal_achievement':
        navigation.navigate('Goals');
        break;
      case 'ai_insight':
        navigation.navigate('Dashboard');
        break;
      case 'direct_debit':
        navigation.navigate('DirectDebits');
        break;
      case 'savings':
        navigation.navigate('SavingsAccount');
        break;
      default:
        // Generic handling
        if (notification.data?.requestId) {
          navigation.navigate('PaymentRequests');
        } else if (notification.data?.matchId) {
          navigation.navigate('SmartTransfers');
        }
    }
  };

  const getNotificationIcon = (type, source) => {
    if (source === 'social') {
      const iconMap = {
        connection_request: '👥',
        payment_request: '💸',
        payment_reminder: '💳',
        split_bill_request: '🔀',
        smart_transfer_detected: '🔗',
        connection_accepted: '✅',
        payment_received: '💰',
      };
      return iconMap[type] || '📬';
    } else {
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
    }
  };

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

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { 
          backgroundColor: theme.cardBg,
          borderColor: item.read ? theme.border : theme.primary,
          borderWidth: item.read ? 1 : 2
        }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationLeft}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.type, item.source)}
          </Text>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
              {item.message}
            </Text>
            <View style={styles.notificationMeta}>
              <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
                {getTimeAgo(item.createdAt)}
              </Text>
              <View style={[
                styles.categoryBadge,
                { backgroundColor: item.source === 'social' ? '#3b82f6' : '#8b5cf6' }
              ]}>
                <Text style={styles.categoryBadgeText}>
                  {item.category}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.notificationActions}>
          {!item.read && (
            <TouchableOpacity
              style={[styles.markReadButton, { backgroundColor: theme.background[0] }]}
              onPress={() => markAsRead(item.id, item.source)}
            >
              <Icon name="check" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
            onPress={() => deleteNotification(item.id, item.source)}
          >
            <Icon name="delete" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filterOptions = [
    { key: 'All', label: 'All', count: stats?.total || 0 },
    { key: 'Unread', label: 'Unread', count: stats?.unread || 0 },
    { key: 'Social', label: 'Social', count: stats?.social || 0 },
    { key: 'General', label: 'General', count: stats?.general || 0 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <StatusBar style={theme.statusBar} />
      
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Notification Center</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('NotificationPreferences')}
          >
            <Icon name="cog" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Stats */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#fff' }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#fbbf24' }]}>{stats.unread}</Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#60a5fa' }]}>{stats.social}</Text>
              <Text style={styles.statLabel}>Social</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#a78bfa' }]}>{stats.general}</Text>
              <Text style={styles.statLabel}>General</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterChip,
              { 
                backgroundColor: filter === option.key ? theme.primary : theme.cardBg,
                borderColor: theme.border
              }
            ]}
            onPress={() => setFilter(option.key)}
          >
            <Text style={[
              styles.filterChipText,
              { color: filter === option.key ? '#fff' : theme.text }
            ]}>
              {option.label} ({option.count})
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.markAllButton, { backgroundColor: theme.primary }]}
          onPress={markAllAsRead}
        >
          <Text style={styles.markAllButtonText}>Mark All Read</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No notifications{filter !== 'All' ? ` in ${filter}` : ''}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  filterContainer: {
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  markAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  notificationItem: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});
