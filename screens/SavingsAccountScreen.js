import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal, TextInput, FlatList, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FirebaseService from '../services/FirebaseService';
import { useCustomAlert } from '../contexts/AlertContext';
import { validateSavingsAccountLimit } from '../utils/UserLimits';

export default function SavingsAccountScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Get card data from route params
  const card = route?.params?.card || {
    name: 'Primary Account',
    bank: 'Chase',
    lastFour: '4567'
  };

  // Savings accounts state
  const [savingsAccounts, setSavingsAccounts] = useState([]);

  // Recent transactions
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [savingsTransactions, setSavingsTransactions] = useState([]);

  // Modal state
  const [addAccountModalVisible, setAddAccountModalVisible] = useState(false);
  
  // Load savings accounts from Firebase
  useEffect(() => {
    const loadSavingsAccounts = async () => {
      if (user?.uid) {
        const result = await FirebaseService.getUserSavingsAccounts(user.uid);
        if (result.success) {
          // Calculate progress for each account
          const accountsWithProgress = result.data.map(account => {
            const currentBalance = parseFloat(String(account.balance || '£0').replace(/[£,]/g, ''));
            const goalAmount = parseFloat(String(account.goal || account.targetAmount || '£0').replace(/[£,]/g, ''));
            const progress = goalAmount > 0 ? Math.min((currentBalance / goalAmount) * 100, 100) : 0;
            
            return {
              ...account,
              progress: progress
            };
          });
          
          setSavingsAccounts(accountsWithProgress);
        }
      }
    };
    
    loadSavingsAccounts();
  }, [user]);
  
  // Load recent transactions
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserTransactions(
        user.uid,
        (transactions) => {
          // Filter for savings-related transactions
          const savingsRelatedTransactions = transactions.filter(t => 
            t.category === 'Savings' || 
            t.description?.toLowerCase().includes('savings') ||
            t.description?.toLowerCase().includes('transfer to') ||
            t.description?.toLowerCase().includes('transfer from') ||
            t.savingsAccountId
          );
          
          setRecentTransactions(savingsRelatedTransactions.slice(0, 10));
          setSavingsTransactions(savingsRelatedTransactions);
        }
      );
      
      return unsubscribe;
    }
  }, [user]);
  
  // Get transactions for specific savings account
  const getAccountTransactions = (accountId, accountName) => {
    return savingsTransactions.filter(t => 
      t.savingsAccountId === accountId ||
      t.description?.includes(accountName)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferToDebitModalVisible, setTransferToDebitModalVisible] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [closeAccountModalVisible, setCloseAccountModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  // Form state
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('High Interest Savings');
  const [initialDeposit, setInitialDeposit] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  const totalSavings = savingsAccounts.reduce((sum, account) => 
    sum + parseFloat(account.balance.replace('£', '').replace(',', '')), 0
  );

  const handleAddAccount = () => {
    setAddAccountModalVisible(true);
  };

  const handleTransfer = (account) => {
    setSelectedAccount(account);
    setTransferModalVisible(true);
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    setDetailsModalVisible(true);
  };

  const handleTransferToDebitCard = (account) => {
    setSelectedAccount(account);
    setTransferToDebitModalVisible(true);
  };

  const handleCloseAccount = (account) => {
    setSelectedAccount(account);
    setCloseAccountModalVisible(true);
  };

  const handleCreateAccount = async () => {
    if (!accountName || !savingsGoal || !initialDeposit) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check for duplicate savings account
    const isDuplicate = savingsAccounts.some(acc => 
      acc.name?.toLowerCase() === accountName.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate', 'A savings account with this name already exists');
      return;
    }

    const newAccount = {
      name: accountName,
      type: accountType,
      balance: initialDeposit ? `£${parseFloat(initialDeposit).toFixed(2)}` : '£0.00',
      targetAmount: `£${parseFloat(savingsGoal).toFixed(2)}`,
      interestRate: '4.0%',
      dateCreated: new Date().toISOString(),
      linkedCardId: card.id,
      status: 'active'
    };

    // Save to Firebase
    if (user?.uid) {
      const result = await FirebaseService.addSavingsAccount(user.uid, newAccount);
      if (result.success) {
        // Reload savings accounts to get the new one with ID
        const updatedResult = await FirebaseService.getUserSavingsAccounts(user.uid);
        if (updatedResult.success) {
          setSavingsAccounts(updatedResult.data);
        }
      }
    }

    setAddAccountModalVisible(false);
    setAccountName('');
    setAccountType('High Interest Savings');
    setInitialDeposit('');
    setSavingsGoal('');
    Alert.alert('Success', 'Savings account created successfully');
  };

  const handleSaveTransfer = async () => {
    if (!selectedAccount || !transferAmount) {
      setModalTitle('Missing Information');
      setModalMessage('Please enter a transfer amount');
      setErrorModalVisible(true);
      return;
    }

    const transferAmountNum = parseFloat(transferAmount.replace(/[£,]/g, ''));
    
    // Validate transfer amount
    if (isNaN(transferAmountNum) || transferAmountNum <= 0) {
      setModalTitle('Invalid Amount');
      setModalMessage('Please enter a valid transfer amount');
      setErrorModalVisible(true);
      return;
    }

    // Get current card balance and check if sufficient funds available
    const currentCardBalance = parseFloat(String(card.balance).replace(/[£,]/g, ''));
    
    // Check if transfer amount exceeds available balance
    if (transferAmountNum > currentCardBalance) {
      setModalTitle('Insufficient Funds');
      setModalMessage(`Your current balance is £${currentCardBalance.toFixed(2)}. You cannot transfer £${transferAmountNum.toFixed(2)}.`);
      setErrorModalVisible(true);
      return;
    }

    try {
      // Calculate new balances
      const currentSavingsBalance = parseFloat(selectedAccount.balance.replace('£', '').replace(',', ''));
      const newSavingsBalance = currentSavingsBalance + transferAmountNum;
      const goal = parseFloat(selectedAccount.goal.replace('£', '').replace(',', ''));
      const newProgress = Math.min((newSavingsBalance / goal) * 100, 100);
      const newCardBalance = currentCardBalance - transferAmountNum;

      if (user?.uid) {
        // Update savings account in Firebase
        await FirebaseService.updateSavingsAccount(user.uid, selectedAccount.id, {
          balance: `£${newSavingsBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          progress: newProgress
        });

        // Update card balance in Firebase
        await FirebaseService.updateCard(user.uid, card.id, { balance: newCardBalance });

        // Add transaction record
        await FirebaseService.addTransaction(user.uid, {
          type: 'transfer',
          amount: `-£${transferAmountNum.toFixed(2)}`,
          category: 'Savings',
          description: `Transfer to ${selectedAccount.name}`,
          date: new Date().toISOString(),
          cardId: card.id,
          savingsAccountId: selectedAccount.id
        });
      }

      // Update local state
      setSavingsAccounts(prev => prev.map(account => {
        if (account.id === selectedAccount.id) {
          return {
            ...account,
            balance: `£${newSavingsBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            progress: newProgress
          };
        }
        return account;
      }));

      // Show success message
      setModalTitle('Transfer Successful');
      setModalMessage(`Successfully transferred £${transferAmountNum.toFixed(2)} to ${selectedAccount.name}`);
      setSuccessModalVisible(true);

      setTransferAmount('');
      setTransferModalVisible(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Error transferring to savings:', error);
      setModalTitle('Error');
      setModalMessage('Failed to complete transfer. Please try again.');
      setErrorModalVisible(true);
    }
  };

  const handleSaveTransferToDebitCard = async () => {
    if (!selectedAccount || !transferAmount) {
      setTransferToDebitModalVisible(false);
      setTimeout(() => {
        setModalTitle('Missing Information');
        setModalMessage('Please enter a transfer amount');
        setErrorModalVisible(true);
      }, 100);
      return;
    }

    const transferAmountNum = parseFloat(transferAmount.replace(/[£,]/g, ''));
    
    // Validate transfer amount
    if (isNaN(transferAmountNum) || transferAmountNum <= 0) {
      setTransferToDebitModalVisible(false);
      setTimeout(() => {
        setModalTitle('Invalid Amount');
        setModalMessage('Please enter a valid transfer amount');
        setErrorModalVisible(true);
      }, 100);
      return;
    }

    // Get savings account balance and check if sufficient funds available
    const savingsBalance = parseFloat(selectedAccount.balance.replace(/[£,]/g, ''));
    
    // Check if transfer amount exceeds available balance in savings
    if (transferAmountNum > savingsBalance) {
      setTransferToDebitModalVisible(false);
      setTimeout(() => {
        setModalTitle('Insufficient Funds');
        setModalMessage(`Your ${selectedAccount.name} balance is ${selectedAccount.balance}. You cannot transfer £${transferAmountNum.toFixed(2)}.`);
        setErrorModalVisible(true);
      }, 100);
      return;
    }

    try {
      // Calculate new balances
      const newSavingsBalance = savingsBalance - transferAmountNum;
      const goal = parseFloat(selectedAccount.goal.replace('£', '').replace(',', ''));
      const newProgress = Math.min((newSavingsBalance / goal) * 100, 100);
      const currentCardBalance = parseFloat(String(card.balance).replace(/[£,]/g, ''));
      const newCardBalance = currentCardBalance + transferAmountNum;

      if (user?.uid) {
        // Update savings account in Firebase
        await FirebaseService.updateSavingsAccount(user.uid, selectedAccount.id, {
          balance: `£${newSavingsBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          progress: newProgress
        });

        // Update card balance in Firebase
        await FirebaseService.updateCard(user.uid, card.id, { balance: newCardBalance });

        // Add transaction record
        await FirebaseService.addTransaction(user.uid, {
          type: 'transfer',
          amount: `+£${transferAmountNum.toFixed(2)}`,
          category: 'Savings',
          description: `Transfer from ${selectedAccount.name}`,
          date: new Date().toISOString(),
          cardId: card.id,
          savingsAccountId: selectedAccount.id
        });
      }

      // Update local state
      setSavingsAccounts(prev => prev.map(account => {
        if (account.id === selectedAccount.id) {
          return {
            ...account,
            balance: `£${newSavingsBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            progress: newProgress
          };
        }
        return account;
      }));

      // Show success message
      setModalTitle('Transfer Successful');
      setModalMessage(`Successfully transferred £${transferAmountNum.toFixed(2)} from ${selectedAccount.name} to your ${card.name}.`);
      setSuccessModalVisible(true);

      setTransferAmount('');
      setTransferToDebitModalVisible(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Error transferring from savings:', error);
      setTransferToDebitModalVisible(false);
      setTimeout(() => {
        setModalTitle('Error');
        setModalMessage('Failed to complete transfer. Please try again.');
        setErrorModalVisible(true);
      }, 100);
    }
  };

  const handleConfirmCloseAccount = async () => {
    if (!selectedAccount) return;

    const accountBalance = parseFloat(selectedAccount.balance.replace(/[£,]/g, ''));
    
    try {
      if (user?.uid) {
        // If account has money, transfer it to debit card first
        if (accountBalance > 0) {
          const currentCardBalance = parseFloat(String(card.balance).replace(/[£,]/g, ''));
          const newCardBalance = currentCardBalance + accountBalance;

          // Update card balance in Firebase
          await FirebaseService.updateCard(user.uid, card.id, { balance: newCardBalance });

          // Add transaction record for the final transfer
          await FirebaseService.addTransaction(user.uid, {
            type: 'transfer',
            amount: `+£${accountBalance.toFixed(2)}`,
            category: 'Savings',
            description: `Final transfer from ${selectedAccount.name} (Account Closure)`,
            date: new Date().toISOString(),
            cardId: card.id,
            savingsAccountId: selectedAccount.id
          });
        }

        // Delete the savings account from Firebase
        const result = await FirebaseService.deleteSavingsAccount(user.uid, selectedAccount.id);
        
        if (!result.success) {
          Alert.alert('Error', 'Failed to close account');
          return;
        }
      }

      // Remove the account from local state
      setSavingsAccounts(prev => prev.filter(account => account.id !== selectedAccount.id));

      // Show success message
      const message = accountBalance > 0 
        ? `${selectedAccount.name} has been closed successfully. £${accountBalance.toFixed(2)} has been transferred to your ${card.name}.`
        : `${selectedAccount.name} has been closed successfully.`;
      
      setModalTitle('Account Closed');
      setModalMessage(message);
      setSuccessModalVisible(true);

      setCloseAccountModalVisible(false);
      setSelectedAccount(null);
    } catch (error) {
      console.error('Error closing account:', error);
      Alert.alert('Error', 'Failed to close account. Please try again.');
    }
  };

  const getAccountTypeColor = (type) => {
    switch (type) {
      case 'High Interest Savings': return '#10b981';
      case 'Regular Savings': return '#3b82f6';
      case 'Fixed Rate ISA': return '#8b5cf6';
      case 'Cash ISA': return '#f59e0b';
      default: return '#6b7280';
    }
  };

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
          <Text style={styles.title}>Savings Accounts</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddAccount}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addButton, { marginLeft: 8 }]} onPress={() => navigation.navigate('RecurringTransfers')}>
            <Text style={styles.addButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Savings</Text>
          <Text style={styles.summaryAmount}>£{totalSavings.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.summarySubtext}>Across {savingsAccounts.length} accounts</Text>
        </View>
      </LinearGradient>

      <FlatList
        style={styles.content}
        data={savingsAccounts}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={() => (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Savings Accounts</Text>
          </View>
        )}
        renderItem={({ item: account }) => (
          <View style={[styles.accountCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountName, { color: theme.text }]}>{account.name}</Text>
                <Text style={[styles.accountType, { color: theme.textSecondary }]}>{account.type} • {account.bank}</Text>
              </View>
              <View style={[styles.interestBadge, { backgroundColor: getAccountTypeColor(account.type) }]}>
                <Text style={styles.interestText}>{account.interestRate}</Text>
              </View>
            </View>

            <View style={styles.balanceSection}>
              <Text style={[styles.currentBalance, { color: theme.text }]}>{account.balance}</Text>
              <Text style={[styles.goalText, { color: theme.textSecondary }]}>Goal: {account.goal}</Text>
            </View>

            <View style={styles.progressSection}>
              <View style={[styles.progressBar, { backgroundColor: theme.background[0] }]}>
                <View style={[styles.progressFill, { width: `${Math.min(account.progress || 0, 100)}%`, backgroundColor: theme.primary }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>{(account.progress || 0).toFixed(1)}% complete</Text>
            </View>

            <View style={styles.accountActions}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => handleTransfer(account)}
              >
                <Text style={styles.actionButtonText}>💰 Transfer In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.secondaryButton, { borderColor: theme.primary }]}
                onPress={() => handleViewDetails(account)}
              >
                <Text style={[styles.actionButtonText, styles.secondaryButtonText, { color: theme.primary }]}>📊 View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
            <Text style={styles.emptyStateEmoji}>🏦</Text>
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Savings Accounts</Text>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              Start building your savings by creating your first savings account!
            </Text>
          </View>
        )}
      />

      {/* Add Account Modal */}
      <Modal
        visible={addAccountModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>🏦 New Savings Account</Text>
              <TouchableOpacity onPress={() => setAddAccountModalVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Account Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="e.g. Emergency Fund, Holiday Savings"
                  placeholderTextColor={theme.textSecondary}
                  value={accountName}
                  onChangeText={setAccountName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Account Type</Text>
                <View style={styles.typeButtons}>
                  {['High Interest Savings', 'Regular Savings', 'Fixed Rate ISA', 'Cash ISA'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                        accountType === type && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => setAccountType(type)}
                    >
                      <Text style={[
                        styles.typeButtonText,
                        { color: theme.textSecondary },
                        accountType === type && { color: '#ffffff' }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Initial Deposit</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="£0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={initialDeposit}
                  onChangeText={setInitialDeposit}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Savings Goal</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="£0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={savingsGoal}
                  onChangeText={setSavingsGoal}
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]} 
                onPress={() => setAddAccountModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleCreateAccount}>
                <Text style={styles.submitButtonText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={transferModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 'auto', backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>💰 Transfer Money</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.transferInfo, { color: theme.text }]}>
                Transfer to: <Text style={[styles.transferAccount, { color: theme.primary }]}>{selectedAccount?.name}</Text>
              </Text>
              
              <View style={[styles.balanceInfo, { backgroundColor: theme.background[0] }]}>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Available Balance:</Text>
                <Text style={[styles.balanceAmount, { color: theme.text }]}>{card.balance}</Text>
                <Text style={[styles.balanceSource, { color: theme.textSecondary }]}>from {card.name}</Text>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Transfer Amount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="£0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setTransferModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveTransfer}>
                <Text style={styles.submitButtonText}>Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        visible={errorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContent}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertTitle}>{modalTitle}</Text>
            </View>
            <Text style={styles.alertMessage}>{modalMessage}</Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContent}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>✅</Text>
              <Text style={styles.alertTitle}>{modalTitle}</Text>
            </View>
            <Text style={styles.alertMessage}>{modalMessage}</Text>
            <TouchableOpacity 
              style={[styles.alertButton, styles.successButton]}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📊 {selectedAccount?.name} Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedAccount && (
                <View style={styles.detailsContent}>
                  {/* Account Overview */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Account Overview</Text>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Account Type:</Text>
                      <Text style={styles.detailsValue}>{selectedAccount.type}</Text>
                    </View>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Bank:</Text>
                      <Text style={styles.detailsValue}>{selectedAccount.bank}</Text>
                    </View>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Current Balance:</Text>
                      <Text style={[styles.detailsValue, styles.balanceValue]}>{selectedAccount.balance}</Text>
                    </View>
                    
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Interest Rate:</Text>
                      <Text style={[styles.detailsValue, styles.interestValue]}>{selectedAccount.interestRate}</Text>
                    </View>
                  </View>

                  {/* Savings Goal */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Savings Goal</Text>
                    
                    <View style={styles.goalProgress}>
                      <View style={styles.goalHeader}>
                        <Text style={styles.goalAmount}>{selectedAccount.balance}</Text>
                        <Text style={styles.goalTarget}>of {selectedAccount.goal}</Text>
                      </View>
                      
                      <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(selectedAccount.progress || 0, 100)}%` }]} />
                      </View>
                      
                      <Text style={styles.progressPercentage}>{(selectedAccount.progress || 0).toFixed(1)}% complete</Text>
                    </View>
                  </View>

                  {/* Interest Projection */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>📈 Interest Projection</Text>
                    {(() => {
                      const balanceNum = parseFloat((selectedAccount.balance || '£0').replace(/[£$€,]/g, '')) || 0;
                      const rateNum = parseFloat((selectedAccount.interestRate || '0%').replace('%', '')) || 0;
                      const monthly = (balanceNum * (rateNum / 100) / 12);
                      const yearly = balanceNum * (rateNum / 100);
                      const in5Years = balanceNum * Math.pow(1 + rateNum / 100, 5) - balanceNum;
                      return (
                        <View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Monthly Interest:</Text>
                            <Text style={[styles.detailsValue, { color: '#10b981' }]}>+£{monthly.toFixed(2)}</Text>
                          </View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Yearly Interest:</Text>
                            <Text style={[styles.detailsValue, { color: '#10b981' }]}>+£{yearly.toFixed(2)}</Text>
                          </View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>5-Year Growth:</Text>
                            <Text style={[styles.detailsValue, { color: '#10b981' }]}>+£{in5Years.toFixed(2)}</Text>
                          </View>
                          <View style={styles.detailsRow}>
                            <Text style={styles.detailsLabel}>Balance in 5 Years:</Text>
                            <Text style={[styles.detailsValue, { fontWeight: 'bold' }]}>£{(balanceNum + in5Years).toFixed(2)}</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  {/* Recent Activity */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.detailsSectionTitle}>Recent Activity</Text>
                    
                    {selectedAccount && getAccountTransactions(selectedAccount.id, selectedAccount.name)
                      .slice(0, 8)
                      .map((transaction) => {
                        const isIncoming = transaction.amount?.startsWith('+') || 
                                         transaction.description?.toLowerCase().includes('transfer to');
                        const isOutgoing = transaction.amount?.startsWith('-') || 
                                         transaction.description?.toLowerCase().includes('transfer from');
                        
                        return (
                          <View key={transaction.id} style={styles.transactionItem}>
                            <View style={styles.transactionInfo}>
                              <View style={styles.transactionHeader}>
                                <Text style={styles.transactionDescription}>
                                  {transaction.description || 'Savings Transaction'}
                                </Text>
                                <Text style={[
                                  styles.transactionAmount,
                                  isIncoming ? styles.positiveAmount : styles.negativeAmount
                                ]}>
                                  {transaction.amount}
                                </Text>
                              </View>
                              <View style={styles.transactionMeta}>
                                <Text style={styles.transactionDate}>
                                  {new Date(transaction.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </Text>
                                <View style={[
                                  styles.transactionTypeBadge,
                                  { backgroundColor: isIncoming ? '#10b981' + '20' : '#ef4444' + '20' }
                                ]}>
                                  <Text style={[
                                    styles.transactionTypeText,
                                    { color: isIncoming ? '#10b981' : '#ef4444' }
                                  ]}>
                                    {isIncoming ? '↗️ Deposit' : '↙️ Withdrawal'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    }
                    
                    {selectedAccount && getAccountTransactions(selectedAccount.id, selectedAccount.name).length === 0 && (
                      <View style={styles.noTransactionsContainer}>
                        <Text style={styles.noTransactionsEmoji}>💰</Text>
                        <Text style={styles.noTransactions}>No transactions yet</Text>
                        <Text style={styles.noTransactionsSubtext}>
                          Your transfers and deposits will appear here
                        </Text>
                      </View>
                    )}
                    
                    {selectedAccount && getAccountTransactions(selectedAccount.id, selectedAccount.name).length > 8 && (
                      <TouchableOpacity style={styles.viewAllButton}>
                        <Text style={styles.viewAllText}>View All Transactions</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => {
                  setDetailsModalVisible(false);
                  handleCloseAccount(selectedAccount);
                }}
              >
                <Text style={styles.deleteButtonText}>Close Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={() => {
                  setDetailsModalVisible(false);
                  handleTransferToDebitCard(selectedAccount);
                }}
              >
                <Text style={styles.submitButtonText}>Transfer to Debit Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer to Debit Card Modal */}
      <Modal
        visible={transferToDebitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTransferToDebitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 Transfer to Debit Card</Text>
              <TouchableOpacity onPress={() => setTransferToDebitModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.transferInfo}>
                Transfer from: <Text style={styles.transferAccount}>{selectedAccount?.name}</Text>
              </Text>
              <Text style={styles.transferInfo}>
                Transfer to: <Text style={styles.transferAccount}>{card.name}</Text>
              </Text>
              
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available in Savings:</Text>
                <Text style={styles.balanceAmount}>{selectedAccount?.balance}</Text>
                <Text style={styles.balanceSource}>from {selectedAccount?.name}</Text>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Transfer Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="£0.00"
                  placeholderTextColor="#a0aec0"
                  value={transferAmount}
                  onChangeText={setTransferAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setTransferToDebitModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveTransferToDebitCard}>
                <Text style={styles.submitButtonText}>Transfer to Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Close Account Confirmation Modal */}
      <Modal
        visible={closeAccountModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCloseAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🗑️ Close Account</Text>
              <TouchableOpacity onPress={() => setCloseAccountModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.closeAccountWarning}>
                Are you sure you want to close <Text style={styles.accountNameHighlight}>{selectedAccount?.name}</Text>?
              </Text>
              
              {selectedAccount && parseFloat(selectedAccount.balance.replace(/[£,]/g, '')) > 0 && (
                <View style={styles.balanceTransferInfo}>
                  <Text style={styles.balanceTransferTitle}>💰 Account Balance</Text>
                  <Text style={styles.balanceTransferAmount}>{selectedAccount.balance}</Text>
                  <Text style={styles.balanceTransferText}>
                    This amount will be automatically transferred to your <Text style={styles.cardNameHighlight}>{card.name}</Text> before closing the account.
                  </Text>
                </View>
              )}

              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>⚠️</Text>
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Important</Text>
                  <Text style={styles.warningText}>
                    This action cannot be undone. Your savings goal progress will be lost, and you'll need to create a new account if you want to save again.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setCloseAccountModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleConfirmCloseAccount}
              >
                <Text style={styles.deleteButtonText}>Close Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    marginBottom: 20,
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
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : undefined,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#718096',
  },
  interestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  interestText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  balanceSection: {
    marginBottom: 16,
  },
  currentBalance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#718096',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'right',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#4a5568',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    boxShadow: Platform.OS === 'web' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : undefined,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a202c',
    marginBottom: 2,
  },
  transactionAccount: {
    fontSize: 12,
    color: '#718096',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : undefined,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    boxShadow: Platform.OS === 'web' ? '0 4px 8px rgba(0, 0, 0, 0.25)' : undefined,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeIcon: {
    fontSize: 24,
    color: '#4a5568',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a202c',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  transferInfo: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 16,
    textAlign: 'center',
  },
  transferAccount: {
    fontWeight: '600',
    color: '#1a202c',
  },
  balanceInfo: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 2,
  },
  balanceSource: {
    fontSize: 12,
    color: '#4a5568',
    fontStyle: 'italic',
  },
  alertModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    maxWidth: 400,
    width: '90%',
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  alertButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsContent: {
    paddingBottom: 20,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  detailsLabel: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  detailsValue: {
    fontSize: 14,
    color: '#1a202c',
    fontWeight: '600',
  },
  balanceValue: {
    color: '#10b981',
    fontSize: 16,
  },
  interestValue: {
    color: '#3b82f6',
  },
  goalProgress: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  goalTarget: {
    fontSize: 14,
    color: '#718096',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#1a202c',
    fontWeight: '500',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#718096',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#10b981',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  noTransactions: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    minWidth: 80,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  closeAccountWarning: {
    fontSize: 16,
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  accountNameHighlight: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  balanceTransferInfo: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  // Enhanced transaction styles
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  transactionTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noTransactionsContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 8,
  },
  noTransactionsEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  noTransactionsSubtext: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  viewAllButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: '600',
  },
  balanceTransferTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  balanceTransferAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 8,
  },
  balanceTransferText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardNameHighlight: {
    fontWeight: 'bold',
    color: '#047857',
  },
  warningBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 6,
  },
  warningText: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
});
