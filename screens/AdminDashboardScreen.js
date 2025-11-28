import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseService } from '../services/FirebaseService';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    newUsersToday: 0,
    transactionsToday: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    uptime: '99.9%',
    responseTime: '120ms',
    errorRate: '0.1%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadAdminData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load user statistics
      const userStats = await FirebaseService.getAdminUserStats();
      const transactionStats = await FirebaseService.getAdminTransactionStats();
      const recentUsersList = await FirebaseService.getRecentUsers(10);
      
      setStats({
        totalUsers: userStats.total || 0,
        activeUsers: userStats.active || 0,
        totalTransactions: transactionStats.total || 0,
        totalRevenue: transactionStats.revenue || 0,
        newUsersToday: userStats.newToday || 0,
        transactionsToday: transactionStats.today || 0
      });
      
      setRecentUsers(recentUsersList);
      
      // Simulate system health check
      setSystemHealth({
        status: 'healthy',
        uptime: '99.9%',
        responseTime: Math.floor(Math.random() * 50 + 100) + 'ms',
        errorRate: (Math.random() * 0.5).toFixed(2) + '%'
      });
      
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: theme.cardBg }]}
      onPress={onPress}
    >
      <View style={styles.statHeader}>
        <Text style={[styles.statIcon, { color }]}>{icon}</Text>
        <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      )}
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: theme.cardBg }]}
      onPress={onPress}
    >
      <Text style={[styles.quickActionIcon, { color }]}>{icon}</Text>
      <Text style={[styles.quickActionTitle, { color: theme.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  const UserRow = ({ user: userData }) => (
    <TouchableOpacity 
      style={[styles.userRow, { backgroundColor: theme.cardBg }]}
      onPress={() => navigation.navigate('AdminUserDetail', { userId: userData.id })}
    >
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.userAvatarText}>
            {(userData.displayName || userData.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={[styles.userName, { color: theme.text }]}>
            {userData.name || userData.displayName || userData.email?.split('@')[0] || 'Unknown User'}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {userData.email}
          </Text>
        </View>
      </View>
      <View style={styles.userStats}>
        <Text style={[styles.userStatValue, { color: theme.text }]}>
          {userData.transactionCount || 0}
        </Text>
        <Text style={[styles.userStatLabel, { color: theme.textSecondary }]}>
          Transactions
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      {/* Header */}
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>SpendFlow Administration</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshButton} onPress={loadAdminData}>
              <Text style={styles.refreshIcon}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={() => {
                // Sign out admin user
                auth.signOut();
              }}
            >
              <Text style={styles.logoutIcon}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* System Health */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>System Health</Text>
          <View style={[styles.healthCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.textSecondary }]}>Status</Text>
              <View style={styles.healthStatus}>
                <View style={[styles.healthDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.healthValue, { color: '#10b981' }]}>
                  {systemHealth.status.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.textSecondary }]}>Uptime</Text>
              <Text style={[styles.healthValue, { color: theme.text }]}>{systemHealth.uptime}</Text>
            </View>
            <View style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.textSecondary }]}>Response Time</Text>
              <Text style={[styles.healthValue, { color: theme.text }]}>{systemHealth.responseTime}</Text>
            </View>
            <View style={styles.healthRow}>
              <Text style={[styles.healthLabel, { color: theme.textSecondary }]}>Error Rate</Text>
              <Text style={[styles.healthValue, { color: theme.text }]}>{systemHealth.errorRate}</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Metrics</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              subtitle={`+${stats.newUsersToday} today`}
              icon="👥"
              color="#667eea"
              onPress={() => navigation.navigate('AdminUsers')}
            />
            <StatCard
              title="Active Users"
              value={stats.activeUsers.toLocaleString()}
              subtitle="Last 30 days"
              icon="🟢"
              color="#10b981"
              onPress={() => navigation.navigate('AdminUsers', { filter: 'active' })}
            />
            <StatCard
              title="Transactions"
              value={stats.totalTransactions.toLocaleString()}
              subtitle={`+${stats.transactionsToday} today`}
              icon="💳"
              color="#f59e0b"
              onPress={() => navigation.navigate('AdminTransactions')}
            />
            <StatCard
              title="Revenue"
              value={`£${stats.totalRevenue.toLocaleString()}`}
              subtitle="All time"
              icon="💰"
              color="#8b5cf6"
              onPress={() => navigation.navigate('AdminRevenue')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickAction
              title="User Management"
              icon="👤"
              color="#667eea"
              onPress={() => navigation.navigate('AdminUsers')}
            />
            <QuickAction
              title="Transactions"
              icon="💳"
              color="#f59e0b"
              onPress={() => navigation.navigate('AdminTransactions')}
            />
            <QuickAction
              title="Support Tickets"
              icon="🎫"
              color="#ef4444"
              onPress={() => navigation.navigate('AdminSupport')}
            />
            <QuickAction
              title="Analytics"
              icon="📊"
              color="#10b981"
              onPress={() => navigation.navigate('AdminAnalytics')}
            />
          </View>
        </View>

        {/* Recent Users */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Users</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')}>
              <Text style={[styles.sectionLink, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.usersList}>
            {recentUsers.map((userData, index) => (
              <UserRow key={userData.id || index} user={userData} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshIcon: {
    fontSize: 18,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionLink: {
    fontSize: 16,
    fontWeight: '500',
  },
  healthCard: {
    borderRadius: 16,
    padding: 20,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  healthStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickAction: {
    width: (width - 56) / 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  usersList: {
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  userStats: {
    alignItems: 'flex-end',
  },
  userStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  userStatLabel: {
    fontSize: 12,
  },
});
