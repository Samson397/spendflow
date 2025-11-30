import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Alert, FlatList, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ConnectionsService from '../services/ConnectionsService';
import { useCustomAlert } from '../contexts/AlertContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ConnectionsScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useCustomAlert();

  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [connectionType, setConnectionType] = useState('friend');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadConnections();
    loadPendingRequests();
    loadStats();
  }, []);

  const loadConnections = async () => {
    try {
      const result = await ConnectionsService.getUserConnections(user.uid);
      if (result.success) {
        setConnections(result.connections);
      }
    } catch (error) {
      console.error('Load connections error:', error);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const result = await ConnectionsService.getPendingRequests(user.uid);
      if (result.success) {
        setPendingRequests(result.requests);
      }
    } catch (error) {
      console.error('Load pending requests error:', error);
    }
  };

  const loadStats = async () => {
    try {
      const result = await ConnectionsService.getConnectionStats(user.uid);
      if (result.success) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const searchUsers = async (query) => {
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    try {
      const result = await ConnectionsService.searchUsers(query);
      if (result.success) {
        setSearchResults(result.users.filter(u => u.id !== user.uid));
      }
    } catch (error) {
      console.error('Search users error:', error);
    }
  };

  const sendConnectionRequest = async (recipientEmail) => {
    setLoading(true);
    try {
      const result = await ConnectionsService.sendConnectionRequest(
        user.uid,
        recipientEmail,
        connectionType
      );

      if (result.success) {
        showAlert('Success', 'Connection request sent!');
        setAddModalVisible(false);
        setEmailInput('');
        setSearchResults([]);
      } else {
        showAlert('Error', result.error || 'Failed to send request');
      }
    } catch (error) {
      showAlert('Error', 'Failed to send connection request');
    } finally {
      setLoading(false);
    }
  };

  const acceptConnectionRequest = async (requestId, fromUserId) => {
    try {
      const result = await ConnectionsService.acceptConnectionRequest(requestId, fromUserId, user.uid);
      
      if (result.success) {
        showAlert('Success', 'Connection accepted!');
        loadConnections();
        loadPendingRequests();
        loadStats();
      } else {
        showAlert('Error', result.error || 'Failed to accept request');
      }
    } catch (error) {
      showAlert('Error', 'Failed to accept connection request');
    }
  };

  const declineConnectionRequest = async (requestId, fromUserId) => {
    try {
      const result = await ConnectionsService.declineConnectionRequest(requestId, fromUserId);
      
      if (result.success) {
        loadPendingRequests();
      } else {
        showAlert('Error', result.error || 'Failed to decline request');
      }
    } catch (error) {
      showAlert('Error', 'Failed to decline connection request');
    }
  };

  const removeConnection = async (connectionUserId) => {
    Alert.alert(
      'Remove Connection',
      'Are you sure you want to remove this connection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ConnectionsService.removeConnection(user.uid, connectionUserId);
              if (result.success) {
                loadConnections();
                loadStats();
              } else {
                showAlert('Error', result.error || 'Failed to remove connection');
              }
            } catch (error) {
              showAlert('Error', 'Failed to remove connection');
            }
          }
        }
      ]
    );
  };

  const blockUser = async (blockedUserId) => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to send you requests or see your activity.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ConnectionsService.blockUser(user.uid, blockedUserId);
              if (result.success) {
                loadConnections();
                loadStats();
              } else {
                showAlert('Error', result.error || 'Failed to block user');
              }
            } catch (error) {
              showAlert('Error', 'Failed to block user');
            }
          }
        }
      ]
    );
  };

  const getConnectionIcon = (type) => {
    switch (type) {
      case 'family': return 'account-group';
      case 'friend': return 'account-heart';
      case 'colleague': return 'briefcase';
      default: return 'account';
    }
  };

  const getConnectionColor = (type) => {
    switch (type) {
      case 'family': return '#ef4444';
      case 'friend': return '#3b82f6';
      case 'colleague': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const renderConnectionItem = ({ item }) => (
    <View style={[styles.connectionItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.connectionInfo}>
        <View style={[styles.avatar, { backgroundColor: getConnectionColor(item.connectionType) }]}>
          <Icon name={getConnectionIcon(item.connectionType)} size={24} color="#fff" />
        </View>
        <View style={styles.connectionDetails}>
          <Text style={[styles.connectionName, { color: theme.text }]}>
            {item.user?.name || item.user?.email || 'Unknown User'}
          </Text>
          <Text style={[styles.connectionEmail, { color: theme.textSecondary }]}>
            {item.user?.email}
          </Text>
          <Text style={[styles.connectionType, { color: getConnectionColor(item.connectionType) }]}>
            {item.connectionType?.charAt(0).toUpperCase() + item.connectionType?.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.connectionActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background[0] }]}
          onPress={() => {
            // TODO: Implement chat functionality
            showAlert('Coming Soon', 'Chat feature will be available in the next update!');
          }}
        >
          <Icon name="message" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.background[0] }]}
          onPress={() => navigation.navigate('PaymentRequests', { userId: item.user?.id })}
        >
          <Icon name="cash-plus" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
          onPress={() => removeConnection(item.user?.id)}
        >
          <Icon name="account-remove" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPendingRequestItem = ({ item }) => (
    <View style={[styles.pendingItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.pendingInfo}>
        <View style={[styles.avatar, { backgroundColor: '#3b82f6' }]}>
          <Icon name="account-plus" size={24} color="#fff" />
        </View>
        <View style={styles.pendingDetails}>
          <Text style={[styles.pendingName, { color: theme.text }]}>
            {item.sender?.name || item.sender?.email || 'Unknown User'}
          </Text>
          <Text style={[styles.pendingEmail, { color: theme.textSecondary }]}>
            {item.sender?.email}
          </Text>
          <Text style={[styles.pendingType, { color: theme.primary }]}>
            Wants to connect as {item.connectionType}
          </Text>
        </View>
      </View>
      <View style={styles.pendingActions}>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: theme.primary }]}
          onPress={() => acceptConnectionRequest(item.id, item.fromUserId)}
        >
          <Icon name="check" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.declineButton, { backgroundColor: '#ef4444' }]}
          onPress={() => declineConnectionRequest(item.id, item.fromUserId)}
        >
          <Icon name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchResultItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.searchResultItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
      onPress={() => sendConnectionRequest(item.email)}
    >
      <View style={styles.searchResultInfo}>
        <View style={[styles.avatar, { backgroundColor: '#6b7280' }]}>
          <Icon name="account" size={24} color="#fff" />
        </View>
        <View style={styles.searchResultDetails}>
          <Text style={[styles.searchResultName, { color: theme.text }]}>
            {item.name || 'Unknown User'}
          </Text>
          <Text style={[styles.searchResultEmail, { color: theme.textSecondary }]}>
            {item.email}
          </Text>
        </View>
      </View>
      <Icon name="plus" size={24} color={theme.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Dashboard');
              }
            }}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Connections</Text>
            <Text style={styles.headerSubtitle}>Manage your network</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Stats */}
        {stats && (
          <View style={[styles.statsContainer, { backgroundColor: theme.cardBg }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.totalConnections}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.friendConnections}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Friends</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#ef4444' }]}>{stats.familyConnections}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Family</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.pendingRequests}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
            </View>
          </View>
        )}

        {/* Add Connection Button */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => setAddModalVisible(true)}
        >
          <Icon name="account-plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Connection</Text>
        </TouchableOpacity>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pending Requests ({pendingRequests.length})</Text>
            <FlatList
              data={pendingRequests}
              renderItem={renderPendingRequestItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Connections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Your Connections ({connections.length})
          </Text>
          <FlatList
            data={connections}
            renderItem={renderConnectionItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No connections yet. Add your first connection!
              </Text>
            }
          />
        </View>
      </ScrollView>

      {/* Add Connection Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Connection</Text>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Connection Type</Text>
              <View style={styles.connectionTypeButtons}>
                {['friend', 'family', 'colleague'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      { backgroundColor: connectionType === type ? theme.primary : theme.background[0] }
                    ]}
                    onPress={() => setConnectionType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      { color: connectionType === type ? '#fff' : theme.text }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Search by Email or Username</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="Enter email or username"
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  searchUsers(text);
                }}
              />
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Search Results</Text>
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResultItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Manual Email Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Or Enter Email Directly</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="friend@example.com"
                placeholderTextColor={theme.textSecondary}
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {emailInput.trim() !== '' && (
              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: theme.primary }]}
                onPress={() => sendConnectionRequest(emailInput)}
                disabled={loading}
              >
                <Text style={styles.sendButtonText}>
                  {loading ? 'Sending...' : 'Send Request'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
  },
  headerText: {
    flex: 1,
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  connectionDetails: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectionEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  connectionType: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  connectionActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingDetails: {
    flex: 1,
  },
  pendingName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  pendingType: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  pendingActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchResultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultDetails: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  connectionTypeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontWeight: 'bold',
  },
  textInput: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    fontSize: 16,
  },
  sendButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
