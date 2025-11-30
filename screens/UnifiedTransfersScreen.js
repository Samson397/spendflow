import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, FlatList, Platform, Modal, TextInput, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import SmartTransferService from '../services/SmartTransferService';
import FirebaseService from '../services/FirebaseService';
import { useCustomAlert } from '../contexts/AlertContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly'];

export default function UnifiedTransfersScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const { showAlert } = useCustomAlert();

  const [activeTab, setActiveTab] = useState('smart'); // 'smart' or 'recurring'
  const [smartTransfers, setSmartTransfers] = useState([]);
  const [recurringRules, setRecurringRules] = useState([]);
  const [cards, setCards] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state for transfers
  const [modalVisible, setModalVisible] = useState(false);
  const [transferType, setTransferType] = useState('recurring'); // 'recurring' or 'onetime'
  const [showTransferMenu, setShowTransferMenu] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState('Monthly');
  const [formFromCard, setFormFromCard] = useState('');
  const [formToAccount, setFormToAccount] = useState('');
  const [formDayOfMonth, setFormDayOfMonth] = useState('1');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'smart') {
        await loadSmartTransfers();
      } else {
        await loadRecurringTransfers();
      }
      await loadAccounts();
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSmartTransfers = async () => {
    try {
      const result = await SmartTransferService.getUserSmartTransfers(user.uid);
      if (result.success) {
        setSmartTransfers(result.matches || []);
      }
    } catch (error) {
      console.error('Load smart transfers error:', error);
    }
  };

  const loadRecurringTransfers = async () => {
    try {
      const [rulesResult, cardsResult, savingsResult] = await Promise.all([
        FirebaseService.getRecurringTransferRules(user.uid),
        FirebaseService.getUserCards(user.uid),
        FirebaseService.getUserSavingsAccounts(user.uid)
      ]);

      if (rulesResult.success) {
        setRecurringRules(rulesResult.data || []);
      }
      if (cardsResult.success) {
        setCards(cardsResult.data || []);
      }
      if (savingsResult.success) {
        setSavingsAccounts(savingsResult.data || []);
      }
    } catch (error) {
      console.error('Load recurring transfers error:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const [cardsResult, savingsResult] = await Promise.all([
        FirebaseService.getUserCards(user.uid),
        FirebaseService.getUserSavingsAccounts(user.uid)
      ]);

      if (cardsResult.success) {
        setCards(cardsResult.data || []);
      }
      if (savingsResult.success) {
        setSavingsAccounts(savingsResult.data || []);
      }
    } catch (error) {
      console.error('Load accounts error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Smart Transfer Actions
  const acceptSmartTransfer = async (transferId) => {
    try {
      const result = await SmartTransferService.acceptSmartTransfer(user.uid, transferId);
      if (result.success) {
        showAlert('Success', 'Smart transfer accepted and processed');
        loadSmartTransfers();
      } else {
        showAlert('Error', result.message || 'Failed to accept transfer');
      }
    } catch (error) {
      console.error('Accept smart transfer error:', error);
      showAlert('Error', 'Failed to accept transfer');
    }
  };

  const rejectSmartTransfer = async (transferId) => {
    try {
      const result = await SmartTransferService.rejectSmartTransfer(user.uid, transferId);
      if (result.success) {
        showAlert('Success', 'Smart transfer rejected');
        loadSmartTransfers();
      } else {
        showAlert('Error', result.message || 'Failed to reject transfer');
      }
    } catch (error) {
      console.error('Reject smart transfer error:', error);
      showAlert('Error', 'Failed to reject transfer');
    }
  };

  // Transfer Actions
  const openAddModal = (type = 'recurring') => {
    setTransferType(type);
    setEditingRule(null);
    setFormAmount('');
    setFormFrequency('Monthly');
    setFormFromCard('');
    setFormToAccount('');
    setFormDayOfMonth('1');
    setModalVisible(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setFormAmount(rule.amount || '');
    setFormFrequency(rule.frequency || 'Monthly');
    setFormFromCard(rule.fromCardId || '');
    setFormToAccount(rule.toCardId || '');
    setFormDayOfMonth(rule.dayOfMonth?.toString() || '1');
    setModalVisible(true);
  };

  const saveRecurringRule = async () => {
    try {
      const ruleData = {
        amount: formAmount,
        frequency: formFrequency,
        fromCardId: formFromCard,
        toCardId: formToAccount,
        dayOfMonth: parseInt(formDayOfMonth),
        userId: user.uid
      };

      let result;
      if (editingRule) {
        result = await FirebaseService.updateRecurringTransferRule(user.uid, editingRule.id, ruleData);
      } else {
        result = await FirebaseService.createRecurringTransferRule(user.uid, ruleData);
      }

      if (result.success) {
        showAlert('Success', `Recurring transfer ${editingRule ? 'updated' : 'created'} successfully`);
        setModalVisible(false);
        loadRecurringTransfers();
      } else {
        showAlert('Error', result.message || 'Failed to save recurring transfer');
      }
    } catch (error) {
      console.error('Save recurring rule error:', error);
      showAlert('Error', 'Failed to save recurring transfer');
    }
  };

  const saveOneTimeTransfer = async () => {
    try {
      const transferData = {
        amount: formAmount,
        fromCardId: formFromCard,
        toCardId: formToAccount,
        userId: user.uid,
        date: new Date().toISOString(),
        status: 'pending',
        type: 'transfer'
      };

      const result = await FirebaseService.createOneTimeTransfer(user.uid, transferData);

      if (result.success) {
        showAlert('Success', 'Transfer created successfully');
        setModalVisible(false);
        // Refresh data to show the new transfer
        if (activeTab === 'smart') {
          loadSmartTransfers();
        } else {
          loadRecurringTransfers();
        }
      } else {
        showAlert('Error', result.message || 'Failed to create transfer');
      }
    } catch (error) {
      console.error('Save one-time transfer error:', error);
      showAlert('Error', 'Failed to create transfer');
    }
  };

  const deleteRecurringRule = async (ruleId) => {
    Alert.alert(
      'Delete Recurring Transfer',
      'Are you sure you want to delete this recurring transfer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirebaseService.deleteRecurringTransferRule(user.uid, ruleId);
              if (result.success) {
                showAlert('Success', 'Recurring transfer deleted');
                loadRecurringTransfers();
              } else {
                showAlert('Error', result.message || 'Failed to delete transfer');
              }
            } catch (error) {
              console.error('Delete recurring rule error:', error);
              showAlert('Error', 'Failed to delete transfer');
            }
          }
        }
      ]
    );
  };

  const getAccountName = (accountId, type) => {
    if (type === 'card') {
      const card = cards.find(c => c.id === accountId);
      return card ? `${card.bank} ****${card.lastFour}` : 'Unknown Card';
    } else {
      const account = savingsAccounts.find(a => a.id === accountId);
      return account ? account.name : 'Unknown Account';
    }
  };

  const renderSmartTransferItem = ({ item }) => (
    <View style={[styles.transferItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.transferHeader}>
        <View style={styles.transferInfo}>
          <Text style={[styles.transferTitle, { color: theme.text }]}>
            Smart Transfer Detected
          </Text>
          <Text style={[styles.transferDescription, { color: theme.textSecondary }]}>
            {item.description || 'Automatic transfer detected'}
          </Text>
          <Text style={[styles.transferAmount, { color: theme.primary }]}>
            {formatAmount(item.amount)}
          </Text>
        </View>
        <View style={styles.transferStatus}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'pending' ? '#f59e0b' : '#10b981' }
          ]}>
            {item.status?.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.transferDetails}>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          From: {getAccountName(item.fromCardId, 'card')}
        </Text>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          To: {getAccountName(item.toCardId, item.toType)}
        </Text>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          Date: {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.transferActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10b981' }]}
            onPress={() => acceptSmartTransfer(item.id)}
          >
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
            onPress={() => rejectSmartTransfer(item.id)}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderRecurringTransferItem = ({ item }) => (
    <View style={[styles.transferItem, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.transferHeader}>
        <View style={styles.transferInfo}>
          <Text style={[styles.transferTitle, { color: theme.text }]}>
            Recurring Transfer
          </Text>
          <Text style={[styles.transferDescription, { color: theme.textSecondary }]}>
            {item.frequency} transfer
          </Text>
          <Text style={[styles.transferAmount, { color: theme.primary }]}>
            {formatAmount(item.amount)}
          </Text>
        </View>
        <View style={styles.transferStatus}>
          <Text style={[styles.statusText, { color: item.active ? '#10b981' : '#6b7280' }]}>
            {item.active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>
      
      <View style={styles.transferDetails}>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          From: {getAccountName(item.fromCardId, 'card')}
        </Text>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          To: {getAccountName(item.toCardId, item.toType)}
        </Text>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          {item.frequency} on day {item.dayOfMonth}
        </Text>
        <Text style={[styles.transferDetail, { color: theme.textSecondary }]}>
          Next: {new Date(item.nextDate).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.transferActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: item.active ? '#f59e0b' : '#10b981' }]}
          onPress={() => toggleRecurringRule(item)}
        >
          <Text style={styles.actionButtonText}>
            {item.active ? 'Pause' : 'Resume'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
          onPress={() => deleteRecurringRule(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const toggleRecurringRule = async (rule) => {
    try {
      const result = await FirebaseService.updateRecurringTransferRule(user.uid, rule.id, {
        active: !rule.active
      });
      
      if (result.success) {
        showAlert('Success', `Recurring transfer ${rule.active ? 'paused' : 'resumed'}`);
        loadRecurringTransfers();
      } else {
        showAlert('Error', result.message || 'Failed to update transfer');
      }
    } catch (error) {
      console.error('Toggle recurring rule error:', error);
      showAlert('Error', 'Failed to update transfer');
    }
  };

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
          <Text style={styles.title}>Transfers</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={activeTab === 'recurring' ? () => setShowTransferMenu(true) : onRefresh}
          >
            <Icon 
              name={activeTab === 'recurring' ? 'plus' : 'refresh'} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Transfer Type Menu */}
        {showTransferMenu && (
          <View style={styles.transferMenu}>
            <TouchableOpacity
              style={styles.transferMenuOption}
              onPress={() => {
                setShowTransferMenu(false);
                openAddModal('recurring');
              }}
            >
              <Icon name="repeat" size={20} color="#fff" />
              <Text style={styles.transferMenuOptionText}>Recurring Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.transferMenuOption}
              onPress={() => {
                setShowTransferMenu(false);
                openAddModal('onetime');
              }}
            >
              <Icon name="swap-horizontal" size={20} color="#fff" />
              <Text style={styles.transferMenuOptionText}>One-Time Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.transferMenuOption, styles.transferMenuCancel]}
              onPress={() => setShowTransferMenu(false)}
            >
              <Text style={styles.transferMenuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'smart' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }
            ]}
            onPress={() => setActiveTab('smart')}
          >
            <Icon name="auto-fix" size={20} color="#fff" />
            <Text style={styles.tabText}>Smart Transfers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              { backgroundColor: activeTab === 'recurring' ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }
            ]}
            onPress={() => setActiveTab('recurring')}
          >
            <Icon name="repeat" size={20} color="#fff" />
            <Text style={styles.tabText}>Recurring</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <FlatList
        data={activeTab === 'smart' ? smartTransfers : recurringRules}
        renderItem={activeTab === 'smart' ? renderSmartTransferItem : renderRecurringTransferItem}
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
            <Icon 
              name={activeTab === 'smart' ? 'auto-fix' : 'repeat'} 
              size={48} 
              color={theme.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No {activeTab === 'smart' ? 'smart transfers' : 'recurring transfers'} found
            </Text>
            {activeTab === 'recurring' && (
              <TouchableOpacity
                style={[styles.emptyActionButton, { backgroundColor: theme.primary }]}
                onPress={openAddModal}
              >
                <Text style={styles.emptyActionButtonText}>Create Recurring Transfer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Recurring Transfer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background[0] }]}>
          <LinearGradient colors={theme.gradient} style={styles.modalHeader}>
            <View style={styles.modalHeaderTop}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingRule ? 'Edit Transfer' : (transferType === 'recurring' ? 'Create Recurring Transfer' : 'Create One-Time Transfer')}
              </Text>
              <TouchableOpacity onPress={transferType === 'recurring' ? saveRecurringRule : saveOneTimeTransfer}>
                <Text style={styles.modalSaveButton}>Save</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.text }]}
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder="Enter amount"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {FREQUENCIES.map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyChip,
                      { 
                        backgroundColor: formFrequency === freq ? theme.primary : theme.cardBg,
                        borderColor: theme.border
                      }
                    ]}
                    onPress={() => setFormFrequency(freq)}
                  >
                    <Text style={[
                      styles.frequencyChipText,
                      { color: formFrequency === freq ? '#fff' : theme.text }
                    ]}>
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>From Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cards.map(card => (
                  <TouchableOpacity
                    key={card.id}
                    style={[
                      styles.accountChip,
                      { 
                        backgroundColor: formFromCard === card.id ? theme.primary : theme.cardBg,
                        borderColor: theme.border
                      }
                    ]}
                    onPress={() => setFormFromCard(card.id)}
                  >
                    <Text style={[
                      styles.accountChipText,
                      { color: formFromCard === card.id ? '#fff' : theme.text }
                    ]}>
                      {card.bank} ****{card.lastFour}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>To Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[...cards, ...savingsAccounts].map(account => (
                  <TouchableOpacity
                    key={account.id}
                    style={[
                      styles.accountChip,
                      { 
                        backgroundColor: formToAccount === account.id ? theme.primary : theme.cardBg,
                        borderColor: theme.border
                      }
                    ]}
                    onPress={() => setFormToAccount(account.id)}
                  >
                    <Text style={[
                      styles.accountChipText,
                      { color: formToAccount === account.id ? '#fff' : theme.text }
                    ]}>
                      {account.name || `${account.bank} ****${account.lastFour}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {transferType === 'recurring' && (
            <>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Frequency</Text>
              <View style={styles.frequencyContainer}>
                {FREQUENCIES.map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyChip,
                      { 
                        backgroundColor: formFrequency === freq ? theme.primary : theme.cardBg,
                        borderColor: theme.border
                      }
                    ]}
                    onPress={() => setFormFrequency(freq)}
                  >
                    <Text style={[
                      styles.frequencyChipText,
                      { color: formFrequency === freq ? '#fff' : theme.text }
                    ]}>
                      {freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Day of Month</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.cardBg, borderColor: theme.border, color: theme.text }]}
                value={formDayOfMonth}
                onChangeText={setFormDayOfMonth}
                placeholder="1-28"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            </>
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
  addButton: {
    padding: 8,
    borderRadius: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  listContainer: {
    padding: 20,
  },
  transferItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transferInfo: {
    flex: 1,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transferDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  transferAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transferStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transferDetails: {
    marginBottom: 12,
  },
  transferDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  transferActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
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
    marginTop: 16,
    marginBottom: 20,
  },
  emptyActionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  // Transfer Menu styles
  transferMenu: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 8,
  },
  transferMenuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
  },
  transferMenuOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 12,
  },
  transferMenuCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  transferMenuCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modalHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  frequencyChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
