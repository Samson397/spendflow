import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Alert, FlatList, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import PaymentRequestsService from '../services/PaymentRequestsService';
import ConnectionsService from '../services/ConnectionsService';
import { useCustomAlert } from '../contexts/AlertContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function PaymentRequestsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { showAlert } = useCustomAlert();

  // Get userId from route params if provided
  const targetUserId = route?.params?.userId;
  
  const [requests, setRequests] = useState([]);
  const [splitBills, setSplitBills] = useState([]);
  const [connections, setConnections] = useState([]);
  const [activeTab, setActiveTab] = useState(targetUserId ? 'sent' : 'requests'); // 'requests', 'sent', 'split'
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [cards, setCards] = useState([]);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  // If targetUserId is provided, pre-select the user and open modal
  useEffect(() => {
    if (targetUserId && connections.length > 0) {
      const targetConnection = connections.find(conn => conn.user.id === targetUserId);
      if (targetConnection) {
        setSelectedUser(targetConnection.user);
        setRequestModalVisible(true);
      }
    }
  }, [targetUserId, connections]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [requestsResult, connectionsResult, statsResult, cardsResult] = await Promise.all([
        PaymentRequestsService.getUserPaymentRequests(user.uid, activeTab === 'sent' ? 'sent' : 'received'),
        ConnectionsService.getUserConnections(user.uid),
        PaymentRequestsService.getPaymentStats(user.uid),
        FirebaseService.getUserCards(user.uid)
      ]);

      if (requestsResult.success) {
        setRequests(requestsResult.requests || []);
      }

      if (connectionsResult.success) {
        setConnections(connectionsResult.connections || []);
      }

      if (statsResult.success) {
        setStats(statsResult.stats);
      }

      if (cardsResult.success) {
        setCards(cardsResult.data || []);
      }

      if (activeTab === 'split') {
        const splitBillsResult = await PaymentRequestsService.getUserSplitBills(user.uid);
        if (splitBillsResult.success) {
          setSplitBills(splitBillsResult.splitBills);
        }
      }
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const createPaymentRequest = async () => {
    if (!selectedUser || !amount.trim() || !reason.trim()) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        fromUserId: user.uid,
        toUserId: selectedUser.id,
        amount: parseFloat(amount),
        reason: reason.trim(),
        type: 'one_time',
        dueDate: dueDate || null
      };

      const result = await PaymentRequestsService.createPaymentRequest(requestData);

      if (result.success) {
        showAlert('Success', 'Payment request sent!');
        setRequestModalVisible(false);
        resetForm();
        loadData();
      } else {
        showAlert('Error', result.error || 'Failed to send request');
      }
    } catch (error) {
      showAlert('Error', 'Failed to send payment request');
    } finally {
      setLoading(false);
    }
  };

  const createSplitBill = async () => {
    if (!amount.trim() || !reason.trim()) {
      showAlert('Error', 'Please fill in amount and description');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = parseFloat(amount);
      const participants = connections.map(conn => ({
        userId: conn.user.id,
        amount: totalAmount / (connections.length + 1), // Include requester
        paid: false
      }));

      // Add requester as participant
      participants.unshift({
        userId: user.uid,
        amount: totalAmount / (connections.length + 1),
        paid: true // Requester is considered to have paid
      });

      const splitData = {
        organizerId: user.uid,
        totalAmount,
        description: reason.trim(),
        participants,
        dueDate: dueDate || null
      };

      const result = await PaymentRequestsService.createSplitBillRequest(splitData);

      if (result.success) {
        showAlert('Success', 'Split bill created!');
        setSplitModalVisible(false);
        resetForm();
        loadData();
      } else {
        showAlert('Error', result.error || 'Failed to create split bill');
      }
    } catch (error) {
      showAlert('Error', 'Failed to create split bill');
    } finally {
      setLoading(false);
    }
  };

  const acceptPaymentRequest = (request) => {
    setSelectedRequest(request);
    setSelectedCard(null);
    setAcceptModalVisible(true);
  };

  const processPaymentRequest = async () => {
    if (!selectedRequest || !selectedCard) {
      showAlert('Error', 'Please select a card to pay from');
      return;
    }

    setLoading(true);
    try {
      // Process the actual payment
      const result = await PaymentRequestsService.processPaymentRequest(
        selectedRequest.id, 
        user.uid, 
        selectedCard.id
      );
      
      if (result.success) {
        showAlert('Success', `Payment of £${selectedRequest.amount} processed successfully!`);
        setAcceptModalVisible(false);
        setSelectedRequest(null);
        setSelectedCard(null);
        loadData();
      } else {
        showAlert('Error', result.error || 'Failed to process payment');
      }
    } catch (error) {
      showAlert('Error', 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const declinePaymentRequest = async (requestId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this payment request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await PaymentRequestsService.declinePaymentRequest(requestId, user.uid);
              
              if (result.success) {
                loadData();
              } else {
                showAlert('Error', result.error || 'Failed to decline request');
              }
            } catch (error) {
              showAlert('Error', 'Failed to decline payment request');
            }
          }
        }
      ]
    );
  };

  const markAsPaid = async (requestId) => {
    try {
      const result = await PaymentRequestsService.markAsPaid(requestId);
      
      if (result.success) {
        showAlert('Success', 'Payment marked as complete!');
        loadData();
      } else {
        showAlert('Error', result.error || 'Failed to mark as paid');
      }
    } catch (error) {
      showAlert('Error', 'Failed to mark as paid');
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setAmount('');
    setReason('');
    setDueDate('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'declined': return '#ef4444';
      case 'paid': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'clock';
      case 'accepted': return 'check-circle';
      case 'declined': return 'close-circle';
      case 'paid': return 'check-all';
      default: return 'help-circle';
    }
  };

  const renderPaymentRequestItem = ({ item }) => (
    <View style={[styles.requestItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <View style={styles.requestUserInfo}>
            <Icon name="account" size={20} color={theme.textSecondary} />
            <Text style={[styles.requestUser, { color: theme.text }]}>
              {item.otherUser?.name || item.otherUser?.email || 'Unknown User'}
            </Text>
          </View>
          <View style={styles.requestStatus}>
            <Icon name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={[styles.requestAmount, { color: theme.primary }]}>
          {formatAmount(item.amount)}
        </Text>
      </View>
      
      <Text style={[styles.requestReason, { color: theme.text }]}>
        {item.reason}
      </Text>
      
      {item.dueDate && (
        <Text style={[styles.requestDueDate, { color: theme.textSecondary }]}>
          Due: {new Date(item.dueDate).toLocaleDateString()}
        </Text>
      )}
      
      <View style={styles.requestActions}>
        {item.direction === 'received' && item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => acceptPaymentRequest(item)}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton, { backgroundColor: '#ef4444' }]}
              onPress={() => declinePaymentRequest(item.id)}
            >
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}
        
        {item.direction === 'sent' && item.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => markAsPaid(item.id)}
          >
            <Text style={styles.actionButtonText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSplitBillItem = ({ item }) => (
    <View style={[styles.splitBillItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.splitBillHeader}>
        <Text style={[styles.splitBillTitle, { color: theme.text }]}>
          {item.description}
        </Text>
        <Text style={[styles.splitBillAmount, { color: theme.primary }]}>
          {formatAmount(item.totalAmount)}
        </Text>
      </View>
      
      <Text style={[styles.splitBillDate, { color: theme.textSecondary }]}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
      
      <View style={styles.participantsList}>
        <Text style={[styles.participantsTitle, { color: theme.text }]}>Participants:</Text>
        {item.participants.map((participant) => (
          <View key={participant.userId} style={styles.participantItem}>
            <Text style={[styles.participantName, { color: theme.text }]}>
              {participant.user?.name || participant.user?.email || 'Unknown'}
            </Text>
            <View style={styles.participantStatus}>
              <Text style={[styles.participantAmount, { color: theme.textSecondary }]}>
                {formatAmount(participant.amount)}
              </Text>
              {participant.paid ? (
                <Icon name="check-circle" size={16} color="#10b981" />
              ) : (
                <Icon name="clock" size={16} color="#f59e0b" />
              )}
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.splitBillActions}>
        <Text style={[styles.splitBillStatus, { color: getStatusColor(item.status) }]}>
          Status: {item.status}
        </Text>
        {item.status !== 'completed' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('SplitBillDetailsScreen', { splitBillId: item.id })}
          >
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderConnectionItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.connectionItem,
        selectedUser?.id === item.user?.id && { backgroundColor: theme.primary + '20' }
      ]}
      onPress={() => setSelectedUser(item.user)}
    >
      <Icon name="account" size={20} color={theme.textSecondary} />
      <Text style={[styles.connectionName, { color: theme.text }]}>
        {item.user?.name || item.user?.email || 'Unknown User'}
      </Text>
      {selectedUser?.id === item.user?.id && (
        <Icon name="check" size={20} color={theme.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} />
      
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Payment Requests</Text>
            <Text style={styles.headerSubtitle}>Manage requests and split bills</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      {stats && (
        <View style={[styles.statsContainer, { backgroundColor: theme.cardBg }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.totalRequested}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Requested</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.totalOwed}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Owed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{stats.pendingRequests}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && { color: '#fff' }]}>
            Received
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && { color: '#fff' }]}>
            Sent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'split' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('split')}
        >
          <Text style={[styles.tabText, activeTab === 'split' && { color: '#fff' }]}>
            Split Bills
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButtonLarge, { backgroundColor: theme.primary }]}
          onPress={() => setRequestModalVisible(true)}
        >
          <Icon name="cash-plus" size={20} color="#fff" />
          <Text style={styles.actionButtonTextLarge}>Request Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButtonLarge, { backgroundColor: theme.primary }]}
          onPress={() => setSplitModalVisible(true)}
        >
          <Icon name="account-group" size={20} color="#fff" />
          <Text style={styles.actionButtonTextLarge}>Split Bill</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'split' ? (
          <FlatList
            data={splitBills}
            renderItem={renderSplitBillItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No split bills yet. Create your first split bill!
              </Text>
            }
          />
        ) : (
          <FlatList
            data={requests}
            renderItem={renderPaymentRequestItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No payment requests found.
              </Text>
            }
          />
        )}
      </ScrollView>

      {/* Payment Request Modal */}
      <Modal
        visible={requestModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Request Payment</Text>
            <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Select Person</Text>
              <FlatList
                data={connections}
                renderItem={renderConnectionItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                style={styles.connectionsList}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Reason</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="What's this for?"
                placeholderTextColor={theme.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Due Date (Optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={createPaymentRequest}
              disabled={loading || !selectedUser}
            >
              <Text style={styles.sendButtonText}>
                {loading ? 'Sending...' : 'Send Request'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Split Bill Modal */}
      <Modal
        visible={splitModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Split Bill</Text>
            <TouchableOpacity onPress={() => setSplitModalVisible(false)}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Total Amount</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Description</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background[0], color: theme.text }]}
                placeholder="What's this split bill for?"
                placeholderTextColor={theme.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Participants ({connections.length + 1})</Text>
              <View style={styles.participantsPreview}>
                <View style={styles.participantPreviewItem}>
                  <Text style={[styles.participantPreviewName, { color: theme.text }]}>You (Organizer)</Text>
                  <Text style={[styles.participantPreviewAmount, { color: theme.primary }]}>
                    {amount ? formatAmount(parseFloat(amount) / (connections.length + 1)) : '£0.00'}
                  </Text>
                </View>
                {connections.map((conn) => (
                  <View key={conn.user.id} style={styles.participantPreviewItem}>
                    <Text style={[styles.participantPreviewName, { color: theme.text }]}>
                      {conn.user?.name || conn.user?.email}
                    </Text>
                    <Text style={[styles.participantPreviewAmount, { color: theme.primary }]}>
                      {amount ? formatAmount(parseFloat(amount) / (connections.length + 1)) : '£0.00'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: theme.primary }]}
              onPress={createSplitBill}
              disabled={loading || connections.length === 0}
            >
              <Text style={styles.sendButtonText}>
                {loading ? 'Creating...' : 'Create Split Bill'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Card Selection Modal for Payment Requests */}
      <Modal
        visible={acceptModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Pay {selectedRequest?.fromUserName || 'User'}
            </Text>
            <TouchableOpacity onPress={() => setAcceptModalVisible(false)}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.paymentDetails}>
              <Text style={[styles.paymentAmount, { color: theme.text }]}>
                {formatAmount(selectedRequest?.amount || 0)}
              </Text>
              <Text style={[styles.paymentReason, { color: theme.textSecondary }]}>
                {selectedRequest?.reason || 'Payment request'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Select Card to Pay From</Text>
              {cards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.cardOption,
                    { 
                      backgroundColor: selectedCard?.id === card.id ? theme.primary : theme.cardBg,
                      borderColor: selectedCard?.id === card.id ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => setSelectedCard(card)}
                >
                  <View style={styles.cardOptionInfo}>
                    <Text style={[
                      styles.cardOptionName,
                      { color: selectedCard?.id === card.id ? '#fff' : theme.text }
                    ]}>
                      {card.name}
                    </Text>
                    <Text style={[
                      styles.cardOptionBalance,
                      { color: selectedCard?.id === card.id ? '#fff' : theme.textSecondary }
                    ]}>
                      Balance: {formatAmount(card.balance || 0)}
                    </Text>
                  </View>
                  {selectedCard?.id === card.id && (
                    <Icon name="check-circle" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {selectedCard && selectedCard.balance < (selectedRequest?.amount || 0) && (
              <View style={styles.insufficientBalanceWarning}>
                <Icon name="alert-circle" size={20} color="#f59e0b" />
                <Text style={styles.insufficientBalanceText}>
                  Insufficient balance on selected card
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: theme.primary,
                  opacity: (!selectedCard || (selectedCard.balance < (selectedRequest?.amount || 0))) ? 0.5 : 1
                }
              ]}
              onPress={processPaymentRequest}
              disabled={!selectedCard || (selectedCard.balance < (selectedRequest?.amount || 0)) || loading}
            >
              <Text style={styles.sendButtonText}>
                {loading ? 'Processing...' : `Pay ${formatAmount(selectedRequest?.amount || 0)}`}
              </Text>
            </TouchableOpacity>
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
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabText: {
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  actionButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  requestItem: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
  },
  requestUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestUser: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  requestReason: {
    fontSize: 14,
    marginBottom: 8,
  },
  requestDueDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  declineButton: {
    // backgroundColor: '#ef4444' - applied inline
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  splitBillItem: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 15,
  },
  splitBillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitBillTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  splitBillAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  splitBillDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  participantsList: {
    marginBottom: 12,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  participantName: {
    fontSize: 14,
    flex: 1,
  },
  participantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantAmount: {
    fontSize: 14,
  },
  splitBillActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitBillStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  connectionName: {
    fontSize: 14,
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 40,
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
  connectionsList: {
    maxHeight: 200,
  },
  textInput: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    fontSize: 16,
  },
  participantsPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  participantPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  participantPreviewName: {
    fontSize: 14,
  },
  participantPreviewAmount: {
    fontSize: 14,
    fontWeight: 'bold',
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
  // Card Selection Modal Styles
  paymentDetails: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    marginBottom: 20,
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paymentReason: {
    fontSize: 16,
    textAlign: 'center',
  },
  cardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardOptionInfo: {
    flex: 1,
  },
  cardOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardOptionBalance: {
    fontSize: 14,
  },
  insufficientBalanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  insufficientBalanceText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
  },
});
