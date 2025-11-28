import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { FirebaseService } from '../services/FirebaseService';

export default function AdminUsersScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { filter } = route.params || {};
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(filter || 'all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    premium: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, selectedFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await FirebaseService.getAllUsers();
      const userStats = await FirebaseService.getAdminUserStats();
      
      setUsers(usersData);
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(user => user.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(user => !user.isActive);
        break;
      case 'premium':
        filtered = filtered.filter(user => user.isPremium);
        break;
      default:
        break;
    }

    setFilteredUsers(filtered);
  };

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'suspend':
          await FirebaseService.suspendUser(userId);
          Alert.alert('Success', 'User suspended successfully');
          break;
        case 'activate':
          await FirebaseService.activateUser(userId);
          Alert.alert('Success', 'User activated successfully');
          break;
        case 'delete':
          Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this user? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                  await FirebaseService.deleteUser(userId);
                  Alert.alert('Success', 'User deleted successfully');
                  loadUsers();
                }
              }
            ]
          );
          return;
      }
      loadUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
      Alert.alert('Error', `Failed to ${action} user`);
    }
  };

  const FilterButton = ({ title, value, count }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { backgroundColor: selectedFilter === value ? theme.primary : theme.cardBg }
      ]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={[
        styles.filterButtonText,
        { color: selectedFilter === value ? 'white' : theme.text }
      ]}>
        {title}
      </Text>
      <Text style={[
        styles.filterButtonCount,
        { color: selectedFilter === value ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
      ]}>
        {count}
      </Text>
    </TouchableOpacity>
  );

  const UserCard = ({ user: userData }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: theme.cardBg }]}
      onPress={() => navigation.navigate('AdminUserDetail', { userId: userData.id })}
    >
      <View style={styles.userHeader}>
        <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.userAvatarText}>
            {(userData.displayName || userData.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.userDetails}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {userData.name || userData.displayName || userData.email?.split('@')[0] || 'Unknown User'}
            </Text>
            <View style={styles.badgesContainer}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: userData.isActive ? '#10b981' : '#ef4444' }
              ]}>
                <Text style={styles.statusText}>
                  {userData.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {userData.isPremium && (
                <View style={[styles.premiumBadge, { backgroundColor: '#f59e0b' }]}>
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
          </View>
          
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {userData.email}
          </Text>
          
          <Text style={[styles.userDate, { color: theme.textSecondary }]}>
            Joined {userData.createdAt ? new Date(userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt).toLocaleDateString() : 'Unknown date'}
          </Text>
        </View>
      </View>

      <View style={styles.userStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {userData.transactionCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Transactions
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            £{(userData.totalSpent || 0).toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Total Spent
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {userData.cardCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Cards
          </Text>
        </View>
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background[0] }]}
          onPress={() => navigation.navigate('AdminUserDetail', { userId: userData.id })}
        >
          <Text style={[styles.actionButtonText, { color: theme.text }]}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: userData.isActive ? '#ef4444' : '#10b981' }]}
          onPress={() => handleUserAction(userData.id, userData.isActive ? 'suspend' : 'activate')}
        >
          <Text style={styles.actionButtonText}>
            {userData.isActive ? 'Suspend' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      {/* Header */}
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AdminCreateUser')}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search users by name or email..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <FilterButton title="All" value="all" count={stats.total} />
          <FilterButton title="Active" value="active" count={stats.active} />
          <FilterButton title="Inactive" value="inactive" count={stats.inactive} />
          <FilterButton title="Premium" value="premium" count={stats.premium} />
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
          {filteredUsers.length} users found
        </Text>
        
        {filteredUsers.map((userData, index) => (
          <UserCard key={userData.id || index} user={userData} />
        ))}

        {filteredUsers.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No users found matching your criteria
            </Text>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchSection: {
    padding: 20,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  filterButtonCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  userDate: {
    fontSize: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
