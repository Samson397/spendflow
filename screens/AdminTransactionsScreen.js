import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { FirebaseService } from '../services/FirebaseService';

export default function AdminTransactionsScreen({ navigation }) {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    flagged: 0,
    highValue: 0,
    today: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, selectedFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Load all transactions across all users
      const transactionsData = await FirebaseService.getAllTransactions();
      const transactionStats = await FirebaseService.getTransactionStats();
      
      setTransactions(transactionsData);
      setStats(transactionStats);
      
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setTransactions([]);
      setStats({
        total: 0,
        flagged: 0,
        highValue: 0,
        today: 0,
        totalValue: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(transaction => 
        transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.amount?.toString().includes(searchQuery)
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'flagged':
        filtered = filtered.filter(t => t.flagged || t.suspicious);
        break;
      case 'high_value':
        filtered = filtered.filter(t => Math.abs(t.amount) >= 1000);
        break;
      case 'today':
        const today = new Date().toDateString();
        filtered = filtered.filter(t => new Date(t.createdAt).toDateString() === today);
        break;
      case 'expenses':
        filtered = filtered.filter(t => t.type === 'expense');
        break;
      case 'income':
        filtered = filtered.filter(t => t.type === 'income');
        break;
      default:
        break;
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredTransactions(filtered);
  };

  const flagTransaction = async (transactionId, reason) => {
    try {
      await FirebaseService.flagTransaction(transactionId, reason);
      
      setTransactions(transactions.map(t => 
        t.id === transactionId 
          ? { ...t, flagged: true, flagReason: reason }
          : t
      ));
      
      Alert.alert('Success', 'Transaction flagged successfully');
    } catch (error) {
      console.error('Failed to flag transaction:', error);
      Alert.alert('Error', 'Failed to flag transaction');
    }
  };

  const reverseTransaction = async (transactionId) => {
    Alert.alert(
      'Reverse Transaction',
      'Are you sure you want to reverse this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reverse', 
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseService.reverseTransaction(transactionId);
              Alert.alert('Success', 'Transaction reversed successfully');
              loadTransactions(); // Reload data
            } catch (error) {
              console.error('Failed to reverse transaction:', error);
              Alert.alert('Error', 'Failed to reverse transaction');
            }
          }
        }
      ]
    );
  };

  const getTransactionRisk = (transaction) => {
    const amount = Math.abs(transaction.amount);
    if (transaction.flagged) return 'high';
    if (amount >= 5000) return 'high';
    if (amount >= 1000) return 'medium';
    return 'low';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
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
      {count !== undefined && (
        <Text style={[
          styles.filterButtonCount,
          { color: selectedFilter === value ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
        ]}>
          {count}
        </Text>
      )}
    </TouchableOpacity>
  );

  const TransactionCard = ({ transaction }) => {
    const risk = getTransactionRisk(transaction);
    const riskColor = getRiskColor(risk);
    
    return (
      <TouchableOpacity
        style={[styles.transactionCard, { backgroundColor: theme.cardBg }]}
        onPress={() => {
          setSelectedTransaction(transaction);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionDescription, { color: theme.text }]} numberOfLines={1}>
              {transaction.description || transaction.category || 'Unknown Transaction'}
            </Text>
            <Text style={[styles.transactionUser, { color: theme.textSecondary }]}>
              {transaction.userEmail} • {transaction.userName || 'Unknown User'}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
              {new Date(transaction.createdAt).toLocaleDateString()} at {new Date(transaction.createdAt).toLocaleTimeString()}
            </Text>
          </View>
          
          <View style={styles.transactionMeta}>
            <Text style={[
              styles.transactionAmount,
              { color: transaction.type === 'expense' ? '#dc2626' : '#10b981' }
            ]}>
              {transaction.type === 'expense' ? '-' : '+'}£{Math.abs(transaction.amount).toFixed(2)}
            </Text>
            
            <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
              <Text style={styles.riskText}>{risk.toUpperCase()}</Text>
            </View>
            
            {transaction.flagged && (
              <View style={[styles.flaggedBadge, { backgroundColor: '#dc2626' }]}>
                <Text style={styles.flaggedText}>FLAGGED</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.transactionFooter}>
          <Text style={[styles.transactionCategory, { color: theme.textSecondary }]}>
            📁 {transaction.category || 'Uncategorized'}
          </Text>
          
          <View style={styles.transactionActions}>
            {!transaction.flagged && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                onPress={() => flagTransaction(transaction.id, 'Manual review required')}
              >
                <Text style={styles.actionButtonText}>Flag</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setSelectedTransaction(transaction);
                setDetailModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.headerTitle}>Transaction Monitoring</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadTransactions}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.flagged}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Flagged</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.highValue}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>High Value</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statValue, { color: theme.text }]}>£{stats.totalValue.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Volume</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <FilterButton title="All" value="all" />
          <FilterButton title="Flagged" value="flagged" count={stats.flagged} />
          <FilterButton title="High Value" value="high_value" count={stats.highValue} />
          <FilterButton title="Today" value="today" count={stats.today} />
          <FilterButton title="Expenses" value="expenses" />
          <FilterButton title="Income" value="income" />
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
          {filteredTransactions.length} transactions found
        </Text>
        
        {filteredTransactions.map((transaction, index) => (
          <TransactionCard key={transaction.id || index} transaction={transaction} />
        ))}

        {filteredTransactions.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No transactions found matching your criteria
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Transaction Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedTransaction && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Amount</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    £{Math.abs(selectedTransaction.amount).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Type</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedTransaction.type}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>User</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedTransaction.userEmail}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {new Date(selectedTransaction.createdAt).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Risk Level</Text>
                  <Text style={[styles.detailValue, { color: getRiskColor(getTransactionRisk(selectedTransaction)) }]}>
                    {getTransactionRisk(selectedTransaction).toUpperCase()}
                  </Text>
                </View>
                
                {selectedTransaction.flagged && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Flag Reason</Text>
                    <Text style={[styles.detailValue, { color: '#dc2626' }]}>
                      {selectedTransaction.flagReason || 'Flagged for review'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
            
            <View style={styles.modalActions}>
              {selectedTransaction && !selectedTransaction.flagged && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#f59e0b' }]}
                  onPress={() => {
                    flagTransaction(selectedTransaction.id, 'Manual admin review');
                    setDetailModalVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Flag Transaction</Text>
                </TouchableOpacity>
              )}
              
              {selectedTransaction && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#dc2626' }]}
                  onPress={() => {
                    reverseTransaction(selectedTransaction.id);
                    setDetailModalVisible(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Reverse</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 18,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
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
  transactionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionUser: {
    fontSize: 14,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  riskText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  flaggedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flaggedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionCategory: {
    fontSize: 12,
  },
  transactionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
