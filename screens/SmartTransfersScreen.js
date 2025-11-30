import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, FlatList, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SmartTransferService from '../services/SmartTransferService';
import { useCustomAlert } from '../contexts/AlertContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function SmartTransfersScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { showAlert } = useCustomAlert();

  const [smartTransfers, setSmartTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSmartTransfers();
  }, []);

  const loadSmartTransfers = async () => {
    try {
      const result = await SmartTransferService.getUserSmartTransfers(user.uid);
      if (result.success) {
        setSmartTransfers(result.matches);
      }
    } catch (error) {
      console.error('Load smart transfers error:', error);
    }
  };

  const acceptSmartTransfer = async (matchId) => {
    try {
      const result = await SmartTransferService.acceptSmartTransferMatch(matchId, user.uid);
      
      if (result.success) {
        showAlert('Success', 'Transfer match accepted! Transactions have been linked.');
        loadSmartTransfers();
      } else {
        showAlert('Error', result.error || 'Failed to accept transfer match');
      }
    } catch (error) {
      showAlert('Error', 'Failed to accept transfer match');
    }
  };

  const declineSmartTransfer = async (matchId) => {
    Alert.alert(
      'Decline Match',
      'Are you sure you want to decline this transfer match?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await SmartTransferService.declineSmartTransferMatch(matchId, user.uid);
              
              if (result.success) {
                loadSmartTransfers();
              } else {
                showAlert('Error', result.error || 'Failed to decline transfer match');
              }
            } catch (error) {
              showAlert('Error', 'Failed to decline transfer match');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSmartTransfers();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_confirmation': return '#f59e0b';
      case 'accepted': return '#10b981';
      case 'declined': return '#ef4444';
      case 'accepted_by_both': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending_confirmation': return 'help-circle';
      case 'accepted': return 'check-circle';
      case 'declined': return 'close-circle';
      case 'accepted_by_both': return 'check-all';
      default: return 'help-circle';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const renderSmartTransferItem = ({ item }) => (
    <View style={[styles.transferItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.transferHeader}>
        <View style={styles.transferInfo}>
          <View style={styles.transferTitle}>
            <Icon name="link-variant" size={20} color={theme.primary} />
            <Text style={[styles.transferTitleText, { color: theme.text }]}>
              Smart Transfer Match
            </Text>
          </View>
          <View style={styles.transferStatus}>
            <Icon name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
            </Text>
          </View>
        </View>
        <Text style={[styles.transferAmount, { color: theme.primary }]}>
          {formatAmount(item.amount)}
        </Text>
      </View>

      <View style={styles.confidenceBadge}>
        <Text style={[styles.confidenceText, { color: getConfidenceColor(item.confidence) }]}>
          Confidence: {getConfidenceText(item.confidence)} ({Math.round(item.confidence * 100)}%)
        </Text>
      </View>

      <View style={styles.transactionsContainer}>
        <View style={styles.transactionItem}>
          <Text style={[styles.transactionLabel, { color: theme.textSecondary }]}>
            {item.isSender ? 'Your Transfer' : 'Your Deposit'}
          </Text>
          <View style={styles.transactionDetails}>
            <Text style={[styles.transactionAmount, { color: item.isSender ? '#ef4444' : '#10b981' }]}>
              {item.isSender ? '-' : '+'}{formatAmount(item.amount)}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
              {new Date(item.isSender ? item.transfer.date : item.deposit.date).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.transactionDescription, { color: theme.text }]}>
            {item.isSender ? item.transfer.description : item.deposit.description}
          </Text>
        </View>

        <Icon name="arrow-down" size={20} color={theme.textSecondary} style={styles.arrowIcon} />

        <View style={styles.transactionItem}>
          <Text style={[styles.transactionLabel, { color: theme.textSecondary }]}>
            {item.isSender ? 'Their Deposit' : 'Their Transfer'}
          </Text>
          <View style={styles.transactionDetails}>
            <Text style={[styles.transactionAmount, { color: item.isSender ? '#10b981' : '#ef4444' }]}>
              {item.isSender ? '+' : '-'}{formatAmount(item.amount)}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
              {new Date(item.isSender ? item.deposit.date : item.transfer.date).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.transactionDescription, { color: theme.text }]}>
            {item.isSender ? item.deposit.description : item.transfer.description}
          </Text>
        </View>
      </View>

      <View style={styles.otherUserInfo}>
        <Icon name="account" size={16} color={theme.textSecondary} />
        <Text style={[styles.otherUserText, { color: theme.text }]}>
          {item.otherUser?.name || item.otherUser?.email || 'Unknown User'}
        </Text>
      </View>

      {item.status === 'pending_confirmation' && (
        <View style={styles.transferActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => acceptSmartTransfer(item.id)}
          >
            <Icon name="check" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Accept Match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton, { backgroundColor: '#ef4444' }]}
            onPress={() => declineSmartTransfer(item.id)}
          >
            <Icon name="close" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'accepted' && (
        <View style={styles.acceptedInfo}>
          <Icon name="information" size={16} color={theme.primary} />
          <Text style={[styles.acceptedText, { color: theme.textSecondary }]}>
            Waiting for {item.otherUser?.name || 'other user'} to confirm
          </Text>
        </View>
      )}

      {item.status === 'accepted_by_both' && (
        <View style={styles.completedInfo}>
          <Icon name="check-all" size={16} color="#10b981" />
          <Text style={[styles.completedText, { color: '#10b981' }]}>
            Transactions successfully linked
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <Text style={styles.headerTitle}>Smart Transfers</Text>
        <Text style={styles.headerSubtitle}>Automatically detected transfer matches</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          Platform.OS === 'ios' && (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          )
        }
      >
        {smartTransfers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="link-variant" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Smart Transfers Found
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Smart transfers are automatically detected when you send money to other SpendFlow users
            </Text>
            <TouchableOpacity
              style={[styles.learnMoreButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('HelpScreen', { topic: 'smart-transfers' })}
            >
              <Text style={styles.learnMoreButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={smartTransfers}
            renderItem={renderSmartTransferItem}
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
  content: {
    flex: 1,
    padding: 20,
  },
  transferItem: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  transferInfo: {
    flex: 1,
  },
  transferTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  transferTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transferStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transferAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  transactionsContainer: {
    marginBottom: 16,
  },
  transactionItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionDescription: {
    fontSize: 14,
  },
  arrowIcon: {
    alignSelf: 'center',
    marginVertical: 4,
  },
  otherUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otherUserText: {
    fontSize: 14,
  },
  transferActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  declineButton: {
    // backgroundColor: '#ef4444' - applied inline
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  acceptedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  acceptedText: {
    fontSize: 14,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '500',
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
    marginBottom: 30,
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  learnMoreButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  learnMoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
