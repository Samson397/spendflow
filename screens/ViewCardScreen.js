import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Pressable, Alert, Modal, TextInput, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import FirebaseService from '../services/FirebaseService';

export default function ViewCardScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const { user } = useAuth();

  // Get initial card data and delete callback from route params
  const initialCard = route?.params?.card || {
    id: 1,
    type: 'debit',
    name: 'Primary Account',
    bank: 'Chase',
    lastFour: '4567',
    balance: '£2,847.32',
    color: '#4f46e5',
    expiryDate: '12/28'
  };
  
  // Get available cards for switching (excluding current card)
  const availableCards = route?.params?.availableCards || [];
  const switchableCards = availableCards.filter(card => 
    card.type === 'debit' && card.id !== initialCard.id
  );

  const onDeleteCard = route?.params?.onDeleteCard;

  // Local state for the card data (this will be updated when editing)
  const [cardData, setCardData] = useState(initialCard);
  
  // User name - get from auth context
  const [userName, setUserName] = useState('');
  
  // Track screen dimensions for responsive layout
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const onChange = ({ window }) => {
      setScreenData(window);
    };
    
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);
  
  const isMobile = screenData.width < 768;

  // Helper to format balance (handles both number and string formats)
  const formatBalance = (balance) => {
    if (balance === undefined || balance === null) return `${currency.symbol}0.00`;
    if (typeof balance === 'number') {
      return `${currency.symbol}${balance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Already a string with currency symbol
    if (typeof balance === 'string' && balance.includes(currency.symbol)) {
      return balance;
    }
    // String without symbol
    const num = parseFloat(String(balance).replace(/[£$€,]/g, ''));
    if (isNaN(num)) return `${currency.symbol}0.00`;
    return `${currency.symbol}${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Transactions for this card
  const [transactions, setTransactions] = useState([]);

  // Credit card billing cycle info
  const [billingCycle, setBillingCycle] = useState({});
  
  // Load transactions for this specific card from Firebase
  useEffect(() => {
    if (user?.uid && cardData?.id) {
      const unsubscribe = FirebaseService.subscribeToCardTransactions(
        user.uid,
        cardData.id,
        (cardTransactions) => {
          setTransactions(cardTransactions);
        }
      );

      return unsubscribe;
    }
  }, [user, cardData?.id]);

  // Subscribe to card updates to get real-time balance changes
  useEffect(() => {
    if (user?.uid && cardData?.id) {
      const unsubscribe = FirebaseService.subscribeToUserCards(
        user.uid,
        (cards) => {
          const updatedCard = cards.find(c => c.id === cardData.id);
          if (updatedCard) {
            setCardData(updatedCard);
          }
        }
      );

      return unsubscribe;
    }
  }, [user, cardData?.id]);

  // Load linked direct debit and available debit cards for credit cards
  useEffect(() => {
    if (user?.uid && cardData?.type === 'credit') {
      // Load the direct debit linked to this credit card
      const loadLinkedDirectDebit = async () => {
        const result = await FirebaseService.getUserDirectDebits(user.uid);
        if (result.success) {
          const linked = result.data.find(dd => dd.creditCardId === cardData.id);
          if (linked) {
            setLinkedDirectDebit(linked);
            setEditPaymentType(linked.paymentType === 'Minimum Payment' ? 'minimum' : 'full');
            setEditMinPayment(linked.amount?.replace(/[£,]/g, '') || '25');
          }
        }
      };
      loadLinkedDirectDebit();

      // Load available debit cards
      const unsubscribe = FirebaseService.subscribeToUserCards(user.uid, (cards) => {
        const debitCards = cards.filter(c => c.type === 'debit');
        setAvailableDebitCards(debitCards);
        // Set the currently linked debit card as selected
        if (cardData.linkedDebitCardId) {
          const linkedCard = debitCards.find(c => c.id === cardData.linkedDebitCardId);
          setSelectedPaymentCard(linkedCard || null);
        }
      });
      return unsubscribe;
    }
  }, [user, cardData?.id, cardData?.type]);

  // Debit card monthly statement info
  // Calculate first and last day of current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const [monthlyStatement, setMonthlyStatement] = useState({
    startDate: firstDayOfMonth.toISOString(),
    endDate: lastDayOfMonth.toISOString(),
    totalSpent: '£0.00',
    totalDeposits: '£0.00',
    netChange: '+£0.00',
    statementDate: lastDayOfMonth.toISOString() // Statement ready at end of month
  });

  // Modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState('');
  const [alertModalMessage, setAlertModalMessage] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [switchModalVisible, setSwitchModalVisible] = useState(false);
  const [selectedSwitchCard, setSelectedSwitchCard] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Payment settings modal for credit cards
  const [paymentSettingsVisible, setPaymentSettingsVisible] = useState(false);
  const [linkedDirectDebit, setLinkedDirectDebit] = useState(null);
  const [editPaymentType, setEditPaymentType] = useState('full'); // 'full' or 'minimum'
  const [editMinPayment, setEditMinPayment] = useState('');
  const [availableDebitCards, setAvailableDebitCards] = useState([]);
  const [selectedPaymentCard, setSelectedPaymentCard] = useState(null);
  
  // Edit form state
  const [editCardName, setEditCardName] = useState(cardData.name);
  const [editBankName, setEditBankName] = useState(cardData.bank);
  const [editBalance, setEditBalance] = useState(cardData.balance);
  const [editExpiryDate, setEditExpiryDate] = useState(cardData.expiryDate || '12/28');
  const [editSelectedColor, setEditSelectedColor] = useState(cardData.color);
  const [editUserName, setEditUserName] = useState(userName);
  // Credit card specific fields
  const [editCreditLimit, setEditCreditLimit] = useState(cardData.limit?.toString() || '');
  const [editStatementDay, setEditStatementDay] = useState(cardData.statementDay?.toString() || '');
  const [editDueDay, setEditDueDay] = useState(cardData.dueDay?.toString() || '');
  const [editAPR, setEditAPR] = useState(cardData.apr?.toString() || '');

  const handleEditCard = () => {
    // Update form fields with current card data
    setEditCardName(cardData.name);
    setEditBankName(cardData.bank);
    setEditBalance(cardData.balance);
    setEditExpiryDate(cardData.expiryDate || '12/28');
    setEditSelectedColor(cardData.color);
    setEditUserName(userName);
    // Credit card specific fields
    setEditCreditLimit(cardData.limit?.toString() || '');
    setEditStatementDay(cardData.statementDay?.toString() || '');
    setEditDueDay(cardData.dueDay?.toString() || '');
    setEditAPR(cardData.apr?.toString() || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    const updatedCard = {
      ...cardData,
      name: editCardName,
      bank: editBankName,
      balance: editBalance,
      expiryDate: editExpiryDate,
      color: editSelectedColor,
      // Credit card specific fields
      ...(cardData.type === 'credit' && {
        limit: editCreditLimit ? parseFloat(editCreditLimit) : cardData.limit,
        statementDay: editStatementDay ? parseInt(editStatementDay) : cardData.statementDay,
        dueDay: editDueDay ? parseInt(editDueDay) : cardData.dueDay,
        apr: editAPR ? parseFloat(editAPR) : cardData.apr
      })
    };

    // Close modal first
    setEditModalVisible(false);

    try {
      // Save to Firebase
      if (user?.uid && cardData?.id) {
        const result = await FirebaseService.updateCard(user.uid, cardData.id, {
          name: updatedCard.name,
          bank: updatedCard.bank,
          balance: updatedCard.balance,
          expiryDate: updatedCard.expiryDate,
          color: updatedCard.color,
          ...(cardData.type === 'credit' && {
            limit: updatedCard.limit,
            statementDay: updatedCard.statementDay,
            dueDay: updatedCard.dueDay,
            apr: updatedCard.apr
          })
        });

        if (!result.success) {
          Alert.alert('Error', 'Failed to save card changes to database');
          return;
        }
      }
      
      // Update the local card data state
      setCardData(updatedCard);
      
      // Update user name
      setUserName(editUserName);
      
      // Show visual success message
      setShowSuccessMessage(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
      // Also try to show alert (with fallback)
      setTimeout(() => {
        setAlertModalTitle('Card Updated');
        setAlertModalMessage(`${editCardName} has been updated successfully!`);
        setAlertModalVisible(true);
      }, 300);
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save card changes');
    }
  };

  const handleCancelEdit = () => {
    // Reset form to current card values (not original)
    setEditCardName(cardData.name);
    setEditBankName(cardData.bank);
    setEditBalance(cardData.balance);
    setEditExpiryDate(cardData.expiryDate || '12/28');
    setEditSelectedColor(cardData.color);
    setEditUserName(userName);
    // Reset credit card specific fields
    setEditCreditLimit(cardData.limit?.toString() || '');
    setEditStatementDay(cardData.statementDay?.toString() || '');
    setEditDueDay(cardData.dueDay?.toString() || '');
    setEditAPR(cardData.apr?.toString() || '');
    setEditModalVisible(false);
  };

  const handleDeleteCard = () => {
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    // Close confirmation modal first
    setDeleteConfirmVisible(false);
    
    try {
      // Delete from Firebase
      if (user?.uid && cardData?.id) {
        const result = await FirebaseService.deleteCard(user.uid, cardData.id);
        
        if (!result.success) {
          Alert.alert('Error', 'Failed to delete card from database');
          return;
        }
      }
      
      // Call the delete callback if it exists (for local state update in parent)
      if (onDeleteCard) {
        onDeleteCard(cardData.id);
      }
      
      // Show success message and navigate back
      setTimeout(() => {
        setAlertModalTitle('Card Deleted');
        setAlertModalMessage(`${cardData.name} has been deleted successfully.`);
        setAlertModalVisible(true);
        
        // Navigate back after showing the message
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }, 100);
    } catch (error) {
      console.error('Error deleting card:', error);
      Alert.alert('Error', 'Failed to delete card');
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmVisible(false);
  };

  // Handle opening payment settings modal
  const handlePaymentSettings = () => {
    if (linkedDirectDebit) {
      setEditPaymentType(linkedDirectDebit.paymentType === 'Minimum Payment' ? 'minimum' : 'full');
      setEditMinPayment(linkedDirectDebit.amount?.replace(/[£,]/g, '') || '25');
      // Find the linked debit card
      const linkedCard = availableDebitCards.find(c => c.id === linkedDirectDebit.cardId);
      setSelectedPaymentCard(linkedCard || null);
    }
    setPaymentSettingsVisible(true);
  };

  // Handle saving payment settings
  const handleSavePaymentSettings = async () => {
    if (!selectedPaymentCard) {
      Alert.alert('Error', 'Please select a debit card for payments');
      return;
    }

    try {
      if (user?.uid) {
        // Calculate next payment date
        const now = new Date();
        let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), cardData.dueDay || 1);
        if (nextPaymentDate <= now) {
          nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, cardData.dueDay || 1);
        }

        const updatedDirectDebit = {
          name: `${cardData.name} Payment`,
          amount: editPaymentType === 'minimum' 
            ? `£${parseFloat(editMinPayment || 25).toFixed(2)}`
            : 'Variable',
          frequency: 'Monthly',
          category: 'Credit Card',
          nextDate: nextPaymentDate.toLocaleDateString('en-GB'),
          status: 'Active',
          cardId: selectedPaymentCard.id,
          cardName: `${selectedPaymentCard.bank} ****${selectedPaymentCard.lastFour}`,
          creditCardId: cardData.id,
          creditCardName: cardData.name,
          paymentType: editPaymentType === 'minimum' ? 'Minimum Payment' : 'Statement Balance',
          description: `Auto-payment for ${cardData.name} credit card`
        };

        if (linkedDirectDebit) {
          // Update existing direct debit
          await FirebaseService.updateDirectDebit(user.uid, linkedDirectDebit.id, updatedDirectDebit);
        } else {
          // Create new direct debit
          await FirebaseService.addDirectDebit(user.uid, updatedDirectDebit);
        }

        // Update the credit card's linked debit card reference
        await FirebaseService.updateCard(user.uid, cardData.id, {
          linkedDebitCardId: selectedPaymentCard.id,
          linkedDebitCard: `${selectedPaymentCard.bank} ****${selectedPaymentCard.lastFour}`,
          directDebitType: editPaymentType
        });

        // Reload the linked direct debit
        const result = await FirebaseService.getUserDirectDebits(user.uid);
        if (result.success) {
          const linked = result.data.find(dd => dd.creditCardId === cardData.id);
          setLinkedDirectDebit(linked || null);
        }

        Alert.alert('Success', 'Payment settings updated successfully');
        setPaymentSettingsVisible(false);
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      Alert.alert('Error', 'Failed to update payment settings');
    }
  };

  const handleSwitchAccount = () => {
    setSwitchModalVisible(true);
  };

  const handleConfirmSwitch = () => {
    if (!selectedSwitchCard) {
      setAlertModalTitle('Selection Required');
      setAlertModalMessage('Please select a debit card to switch your direct debits to.');
      setAlertModalVisible(true);
      return;
    }

    
    const currentBalance = parseFloat(String(cardData.balance || '0').replace(/[£,]/g, ''));
    const hasBalance = currentBalance > 0;
    
    // Simulate the switch process
    setSwitchModalVisible(false);
    
    // Show success message
    let successMessage = `All direct debits and automatic payments have been transferred from ${cardData.name} to ${selectedSwitchCard.name}.`;
    
    if (hasBalance) {
      successMessage += ` Your balance of ${formatBalance(cardData.balance)} has also been transferred.`;
    }
    
    successMessage += ' The old card will now be deleted.';
    
    setAlertModalTitle('Switch Successful');
    setAlertModalMessage(successMessage);
    setAlertModalVisible(true);
    
    // Delete the card after a delay
    setTimeout(() => {
      if (onDeleteCard) {
        onDeleteCard(cardData.id);
      }
      navigation.goBack();
    }, 3000);
  };

  const calculateNewBalance = (currentBalance, transferBalance) => {
    const current = parseFloat(String(currentBalance || '0').replace(/[£,]/g, ''));
    const transfer = parseFloat(String(transferBalance || '0').replace(/[£,]/g, ''));
    const newBalance = current + transfer;
    return `£${newBalance.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCreateNewCard = () => {
    
    // Show guidance message
    setAlertModalTitle('Create New Debit Card');
    setAlertModalMessage('You will be taken to the card creation screen. After creating a new debit card, you can return here to use the switch service.');
    setAlertModalVisible(true);
    
    // Navigate back to wallet screen after a delay
    setTimeout(() => {
      navigation.goBack();
    }, 2500);
  };

  // Helper functions for transactions
  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'Groceries': return '🛒';
      case 'Entertainment': return '🎬';
      case 'Income': return '💰';
      case 'Food & Drink': return '☕';
      case 'Shopping': return '🛍️';
      case 'Transport': return '🚇';
      case 'Bills': return '📄';
      case 'Health': return '🏥';
      default: return '💳';
    }
  };

  const getTransactionColor = (amount) => {
    return amount.startsWith('+') ? '#10b981' : '#ef4444';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short' 
      });
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
          <Text style={styles.title}>Card Details</Text>
          <View style={styles.headerActions}>
            <Pressable 
              style={({ pressed }) => [
                styles.headerButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleEditCard}
            >
              <Text style={styles.headerButtonText}>Edit</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.headerButton, 
                styles.deleteButton,
                pressed && { opacity: 0.7 }
              ]}
              onPress={handleDeleteCard}
            >
              <Text style={[styles.headerButtonText, styles.deleteButtonText]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Success Message Banner */}
      {showSuccessMessage && (
        <View style={[styles.successBanner, { backgroundColor: '#10b981' }]}>
          <Text style={styles.successText}>✅ Card updated successfully!</Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        <View style={styles.cardSection}>
          <View style={[styles.cardContainer, isMobile && styles.cardContainerMobile]}>
            <View style={[styles.cardDisplay, isMobile && styles.cardDisplayMobile, { backgroundColor: cardData.color }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardType}>{cardData.type === 'debit' ? '💳 DEBIT' : '💎 CREDIT'}</Text>
                <Text style={styles.cardBank}>{cardData.bank}</Text>
              </View>

              <View style={styles.cardNumber}>
                <Text style={styles.cardNumberText}>•••• •••• •••• {cardData.lastFour}</Text>
              </View>

              <View style={styles.cardBalance}>
                <Text style={styles.balanceLabel}>BALANCE</Text>
                <Text style={styles.balanceAmount}>{formatBalance(cardData.balance)}</Text>
                {cardData.limit && (
                  <Text style={styles.limitText}>Limit: {formatBalance(cardData.limit)}</Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardHolder}>CARDHOLDER</Text>
                  <Text style={styles.cardNameText}>{userName.toUpperCase()}</Text>
                </View>
                <View style={styles.cardExpiry}>
                  <Text style={styles.expiryLabel}>EXPIRES</Text>
                  <Text style={styles.expiryText}>{cardData.expiryDate || '12/28'}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.buttonsSection, isMobile && styles.buttonsSectionMobile]}>
              {cardData.type === 'debit' ? (
                // Debit card buttons
                <>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sideButton,
                      { backgroundColor: theme.cardBg },
                      isMobile && styles.sideButtonMobile,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => {
                      navigation.navigate('DirectDebits', { card: cardData });
                    }}
                  >
                    <Text style={styles.buttonEmoji}>💰</Text>
                    <Text style={[styles.buttonText, { color: theme.text }]}>Direct Debits</Text>
                  </Pressable>

                  <Pressable 
                    style={({ pressed }) => [
                      styles.sideButton,
                      { backgroundColor: theme.cardBg },
                      isMobile && styles.sideButtonMobile,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => {
                      navigation.navigate('SavingsAccount', { card: cardData });
                    }}
                  >
                    <Text style={styles.buttonEmoji}>🏦</Text>
                    <Text style={[styles.buttonText, { color: theme.text }]}>Savings Account</Text>
                  </Pressable>
                </>
              ) : (
                // Credit card buttons
                <>
                  <Pressable 
                    style={({ pressed }) => [
                      styles.sideButton,
                      { backgroundColor: theme.cardBg },
                      isMobile && styles.sideButtonMobile,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={handlePaymentSettings}
                  >
                    <Text style={styles.buttonEmoji}>⚙️</Text>
                    <Text style={[styles.buttonText, { color: theme.text }]}>Payment Settings</Text>
                  </Pressable>

                  <Pressable 
                    style={({ pressed }) => [
                      styles.sideButton,
                      { backgroundColor: theme.cardBg },
                      isMobile && styles.sideButtonMobile,
                      pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={() => navigation.navigate('Statements', { card: cardData })}
                  >
                    <Text style={styles.buttonEmoji}>📄</Text>
                    <Text style={[styles.buttonText, { color: theme.text }]}>View Statements</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Transactions Section */}
        <View style={[styles.transactionsSection, { backgroundColor: theme.cardBg }]}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.transactionsTitle, { color: theme.text }]}>Recent Transactions</Text>
            <TouchableOpacity 
              style={[styles.viewAllButton, { borderColor: theme.primary }]}
              onPress={() => navigation.navigate('Statements', { card: cardData })}
            >
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View Statements</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.transactionsList, { backgroundColor: theme.cardBg }]}>
            {transactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id} style={[styles.transactionItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.textSecondary + '20' }]}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.transactionIcon, { backgroundColor: theme.background[0] }]}>
                    <Text style={styles.categoryEmoji}>{getCategoryEmoji(transaction.category)}</Text>
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={[styles.transactionDescription, { color: theme.text }]}>{transaction.description}</Text>
                    <Text style={[styles.transactionMeta, { color: theme.textSecondary }]}>
                      {formatDate(transaction.date)} • {transaction.time}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: getTransactionColor(transaction.amount) }
                  ]}>
                    {transaction.amount}
                  </Text>
                  <Text style={[styles.transactionCategory, { color: theme.textSecondary }]}>{transaction.category}</Text>
                </View>
              </View>
            ))}
          </View>

          {transactions.length === 0 && (
            <View style={[styles.emptyTransactions, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.emptyTransactionsEmoji}>💳</Text>
              <Text style={[styles.emptyTransactionsTitle, { color: theme.text }]}>No Transactions</Text>
              <Text style={[styles.emptyTransactionsText, { color: theme.textSecondary }]}>No transactions found for this card yet.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>✏️ Edit Card</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Card Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder={cardData.type === 'credit' ? "e.g. Barclays Rewards" : "e.g. Barclays Current"}
                  placeholderTextColor={theme.textSecondary}
                  value={editCardName}
                  onChangeText={setEditCardName}
                />
              </View>

              {/* Side by side: Last 4 Digits & Expiry */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Last 4 Digits</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                    placeholder="1234"
                    placeholderTextColor={theme.textSecondary}
                    value={cardData.lastFour}
                    editable={false}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.text }]}>Expiry Date *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                    placeholder="MM/YY"
                    placeholderTextColor={theme.textSecondary}
                    value={editExpiryDate}
                    onChangeText={setEditExpiryDate}
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Current Balance *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={editBalance}
                  onChangeText={setEditBalance}
                  keyboardType="numeric"
                />
              </View>

              {/* Credit Card Specific Fields */}
              {cardData.type === 'credit' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>Credit Limit</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                      placeholder="5000"
                      placeholderTextColor={theme.textSecondary}
                      value={editCreditLimit}
                      onChangeText={setEditCreditLimit}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Side by side: Statement Day & Due Day */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: theme.text }]}>Statement Day</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                        placeholder="15"
                        placeholderTextColor={theme.textSecondary}
                        value={editStatementDay}
                        onChangeText={setEditStatementDay}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: theme.text }]}>Due Day</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                        placeholder="5"
                        placeholderTextColor={theme.textSecondary}
                        value={editDueDay}
                        onChangeText={setEditDueDay}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>APR (%) - Optional</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                      placeholder="19.99"
                      placeholderTextColor={theme.textSecondary}
                      value={editAPR}
                      onChangeText={setEditAPR}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Card Color</Text>
                <View style={styles.colorPalette}>
                  {/* Row 1 - Basic Colors */}
                  <View style={styles.colorRow}>
                    {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color, borderColor: theme.textSecondary + '30' },
                          editSelectedColor === color && { borderColor: theme.primary, borderWidth: 3 },
                        ]}
                        onPress={() => setEditSelectedColor(color)}
                      >
                        {editSelectedColor === color && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Row 2 - Standard Colors */}
                  <View style={styles.colorRow}>
                    {['#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#000000'].map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color, borderColor: theme.textSecondary + '30' },
                          editSelectedColor === color && { borderColor: theme.primary, borderWidth: 3 },
                        ]}
                        onPress={() => setEditSelectedColor(color)}
                      >
                        {editSelectedColor === color && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Row 3 - Nature Colors */}
                  <View style={styles.colorRow}>
                    {['#228B22', '#8B4513', '#4B0082', '#DC143C', '#FF1493', '#32CD32'].map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color, borderColor: theme.textSecondary + '30' },
                          editSelectedColor === color && { borderColor: theme.primary, borderWidth: 3 },
                        ]}
                        onPress={() => setEditSelectedColor(color)}
                      >
                        {editSelectedColor === color && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Row 4 - Professional Colors */}
                  <View style={styles.colorRow}>
                    {['#1E90FF', '#FF6347', '#9370DB', '#20B2AA', '#DAA520', '#CD853F'].map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color, borderColor: theme.textSecondary + '30' },
                          editSelectedColor === color && { borderColor: theme.primary, borderWidth: 3 },
                        ]}
                        onPress={() => setEditSelectedColor(color)}
                      >
                        {editSelectedColor === color && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]} onPress={handleCancelEdit}>
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: theme.primary }]} onPress={handleSaveEdit}>
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Settings Modal for Credit Cards */}
      <Modal
        visible={paymentSettingsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPaymentSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>⚙️ Payment Settings</Text>
              <TouchableOpacity onPress={() => setPaymentSettingsVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Current Payment Info */}
              {linkedDirectDebit && (
                <View style={[styles.paymentInfoCard, { backgroundColor: theme.background[0] }]}>
                  <Text style={[styles.paymentInfoTitle, { color: theme.text }]}>Current Setup</Text>
                  <Text style={[styles.paymentInfoText, { color: theme.textSecondary }]}>
                    Paying from: {linkedDirectDebit.cardName || 'Not set'}
                  </Text>
                  <Text style={[styles.paymentInfoText, { color: theme.textSecondary }]}>
                    Amount: {linkedDirectDebit.amount} ({linkedDirectDebit.paymentType})
                  </Text>
                  <Text style={[styles.paymentInfoText, { color: theme.textSecondary }]}>
                    Next payment: {linkedDirectDebit.nextDate}
                  </Text>
                </View>
              )}

              {/* Payment Type Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Payment Type</Text>
                <View style={styles.paymentTypeOptions}>
                  <TouchableOpacity
                    style={[
                      styles.paymentTypeOption,
                      { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                      editPaymentType === 'full' && { borderColor: theme.primary, backgroundColor: theme.primary + '20' }
                    ]}
                    onPress={() => setEditPaymentType('full')}
                  >
                    <Text style={[styles.paymentTypeText, { color: editPaymentType === 'full' ? theme.primary : theme.text }]}>
                      Full Statement Balance
                    </Text>
                    <Text style={[styles.paymentTypeDesc, { color: theme.textSecondary }]}>
                      Pay off entire balance each month
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentTypeOption,
                      { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                      editPaymentType === 'minimum' && { borderColor: theme.primary, backgroundColor: theme.primary + '20' }
                    ]}
                    onPress={() => setEditPaymentType('minimum')}
                  >
                    <Text style={[styles.paymentTypeText, { color: editPaymentType === 'minimum' ? theme.primary : theme.text }]}>
                      Minimum Payment
                    </Text>
                    <Text style={[styles.paymentTypeDesc, { color: theme.textSecondary }]}>
                      Pay minimum required amount
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Minimum Payment Amount (only show if minimum selected) */}
              {editPaymentType === 'minimum' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Minimum Payment Amount</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                    placeholder="25.00"
                    placeholderTextColor={theme.textSecondary}
                    value={editMinPayment}
                    onChangeText={setEditMinPayment}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              {/* Debit Card Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Pay From (Debit Card)</Text>
                {availableDebitCards.length > 0 ? (
                  <View style={styles.debitCardOptions}>
                    {availableDebitCards.map((debitCard) => (
                      <TouchableOpacity
                        key={debitCard.id}
                        style={[
                          styles.debitCardOption,
                          { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                          selectedPaymentCard?.id === debitCard.id && { borderColor: theme.primary, backgroundColor: theme.primary + '20' }
                        ]}
                        onPress={() => setSelectedPaymentCard(debitCard)}
                      >
                        <Text style={styles.debitCardEmoji}>💳</Text>
                        <View style={styles.debitCardInfo}>
                          <Text style={[styles.debitCardName, { color: selectedPaymentCard?.id === debitCard.id ? theme.primary : theme.text }]}>
                            {debitCard.bank} ****{debitCard.lastFour}
                          </Text>
                          <Text style={[styles.debitCardBalance, { color: theme.textSecondary }]}>
                            Balance: {currency.symbol}{typeof debitCard.balance === 'number' ? debitCard.balance.toFixed(2) : debitCard.balance}
                          </Text>
                        </View>
                        {selectedPaymentCard?.id === debitCard.id && (
                          <Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.noCardsText, { color: theme.textSecondary }]}>
                    No debit cards available. Add a debit card first.
                  </Text>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]} 
                onPress={() => setPaymentSettingsVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: theme.primary }]} 
                onPress={handleSavePaymentSettings}
              >
                <Text style={styles.submitButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>🗑️ Delete Card</Text>
              <TouchableOpacity onPress={cancelDelete}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.deleteWarningText, { color: theme.text }]}>
                Are you sure you want to delete <Text style={[styles.cardNameHighlight, { color: '#ef4444' }]}>{cardData.name}</Text>?
              </Text>
              
              {cardData.type === 'debit' && (
                <View style={[styles.switchServiceCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
                  <Text style={styles.switchIcon}>🔄</Text>
                  <View style={styles.switchContent}>
                    <Text style={[styles.switchTitle, { color: theme.primary }]}>Account Switch Service</Text>
                    <Text style={[styles.switchText, { color: theme.text }]}>
                      We can automatically transfer all your direct debits and automatic payments to another debit card before deleting this one.
                    </Text>
                  </View>
                </View>
              )}
              
              {cardData.type === 'credit' && (
                <View style={[styles.directDebitWarning, { backgroundColor: '#ef4444' + '15', borderColor: '#ef4444' }]}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningTitle, { color: '#dc2626' }]}>Direct Debits Impact</Text>
                    <Text style={[styles.warningText, { color: theme.text }]}>
                      Any automatic payments set up for this credit card will also be cancelled. You may need to set up alternative payment methods for your bills.
                    </Text>
                  </View>
                </View>
              )}
              
              {cardData.type === 'debit' && (
                <View style={[styles.directDebitWarning, { backgroundColor: '#ef4444' + '15', borderColor: '#ef4444' }]}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <View style={styles.warningContent}>
                    <Text style={[styles.warningTitle, { color: '#dc2626' }]}>Payment Source Impact</Text>
                    <Text style={[styles.warningText, { color: theme.text }]}>
                      If this debit card is used as a payment source for credit card direct debits, those automatic payments will be affected and may need to be updated.
                    </Text>
                  </View>
                </View>
              )}
              
              <Text style={[styles.deleteSubText, { color: theme.textSecondary }]}>
                This action cannot be undone.
              </Text>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]} 
                onPress={cancelDelete}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              {cardData.type === 'debit' && (
                <TouchableOpacity 
                  style={[styles.switchButton, { backgroundColor: theme.primary }]} 
                  onPress={() => {
                    setDeleteConfirmVisible(false);
                    handleSwitchAccount();
                  }}
                >
                  <Text style={[styles.switchButtonText, { color: '#ffffff' }]}>Switch & Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: '#ef4444' }]} 
                onPress={confirmDelete}
              >
                <Text style={styles.submitButtonText}>Delete Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Switch Account Modal */}
      <Modal
        visible={switchModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSwitchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔄 Account Switch Service</Text>
              <TouchableOpacity onPress={() => setSwitchModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.switchExplanation}>
                Select a debit card to transfer all direct debits and automatic payments from <Text style={styles.cardNameHighlight}>{cardData.name}</Text>:
              </Text>
              
              {/* Balance Transfer Section */}
              {cardData.type === 'debit' && parseFloat(String(cardData.balance || '0').replace(/[£,]/g, '')) > 0 && (
                <View style={styles.balanceTransferSection}>
                  <Text style={styles.balanceTransferIcon}>💰</Text>
                  <View style={styles.balanceTransferContent}>
                    <Text style={styles.balanceTransferTitle}>Account Balance</Text>
                    <Text style={styles.balanceTransferAmount}>{formatBalance(cardData.balance)}</Text>
                    <Text style={styles.balanceTransferText}>
                      This balance will also be transferred to your selected debit card before deletion.
                    </Text>
                  </View>
                </View>
              )}
              
              {switchableCards.length > 0 ? (
                <View style={styles.cardSelection}>
                  {switchableCards.map((card) => (
                    <TouchableOpacity
                      key={card.id}
                      style={[
                        styles.switchCardOption,
                        selectedSwitchCard?.id === card.id && styles.switchCardSelected
                      ]}
                      onPress={() => setSelectedSwitchCard(card)}
                    >
                      <View style={[styles.cardColorIndicator, { backgroundColor: card.color }]} />
                      <View style={styles.switchCardInfo}>
                        <Text style={styles.switchCardName}>{card.name}</Text>
                        <Text style={styles.switchCardDetails}>{card.bank} • • • • {card.lastFour}</Text>
                        <Text style={styles.switchCardBalance}>{formatBalance(card.balance)}</Text>
                        {selectedSwitchCard?.id === card.id && parseFloat(String(cardData.balance || '0').replace(/[£,]/g, '')) > 0 && (
                          <Text style={styles.newBalancePreview}>
                            New balance: {calculateNewBalance(card.balance, cardData.balance)}
                          </Text>
                        )}
                      </View>
                      {selectedSwitchCard?.id === card.id && (
                        <Text style={styles.selectedIcon}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noCardsContainer}>
                  <View style={styles.noCardsAvailable}>
                    <Text style={styles.noCardsIcon}>💳</Text>
                    <Text style={styles.noCardsText}>No other debit cards available</Text>
                    <Text style={styles.noCardsSubtext}>You need another debit card to use the switch service.</Text>
                    {parseFloat(String(cardData.balance || '0').replace(/[£,]/g, '')) > 0 && (
                      <Text style={styles.balanceWarning}>
                        ⚠️ Your {formatBalance(cardData.balance)} balance also needs to be transferred.
                      </Text>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.createCardButton}
                    onPress={() => {
                      setSwitchModalVisible(false);
                      handleCreateNewCard();
                    }}
                  >
                    <Text style={styles.createCardIcon}>+ </Text>
                    <Text style={styles.createCardText}>Create New Debit Card</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.createCardHint}>
                    Create a new debit card first, then you can use the switch service to transfer all your payments{parseFloat(String(cardData.balance || '0').replace(/[£,]/g, '')) > 0 ? ' and balance' : ''} before deleting this card.
                  </Text>
                </View>
              )}

              <View style={styles.switchBenefits}>
                <Text style={styles.benefitsTitle}>What we'll transfer:</Text>
                <Text style={styles.benefitItem}>• All direct debits and standing orders</Text>
                <Text style={styles.benefitItem}>• Credit card automatic payments</Text>
                <Text style={styles.benefitItem}>• Recurring subscription payments</Text>
                <Text style={styles.benefitItem}>• Salary and benefit payments (if applicable)</Text>
                {cardData.type === 'debit' && parseFloat(String(cardData.balance || '0').replace(/[£,]/g, '')) > 0 && (
                  <Text style={[styles.benefitItem, styles.balanceBenefitItem]}>• Account balance ({formatBalance(cardData.balance)})</Text>
                )}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setSwitchModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {switchableCards.length > 0 && (
                <TouchableOpacity 
                  style={[
                    styles.submitButton, 
                    styles.switchConfirmButton,
                    !selectedSwitchCard && styles.disabledButton
                  ]} 
                  onPress={handleConfirmSwitch}
                  disabled={!selectedSwitchCard}
                >
                  <Text style={styles.submitButtonText}>Switch & Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        visible={alertModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContent}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>ℹ️</Text>
              <Text style={styles.alertTitle}>{alertModalTitle}</Text>
            </View>
            <Text style={styles.alertMessage}>{alertModalMessage}</Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={() => setAlertModalVisible(false)}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  deleteButtonText: {
    color: '#ffcccb',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardSection: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    width: '100%',
    maxWidth: 600,
  },
  cardDisplay: {
    width: 320,
    height: 200,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    boxShadow: Platform.OS === 'web' ? '0 8px 16px rgba(0, 0, 0, 0.3)' : undefined,
  },
  cardDisplayMobile: {
    width: 300,
    height: 180,
  },
  cardHeader: {
    marginBottom: 0,
  },
  cardType: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  cardBank: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardNumber: {
    marginBottom: 8,
  },
  cardNumberText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
  cardBalance: {
    marginBottom: 8,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  limitText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardInfo: {
    flex: 1,
  },
  cardHolder: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardNameText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 2,
  },
  cardExpiry: {
    alignItems: 'flex-end',
  },
  expiryLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  expiryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 2,
  },
  buttonsSection: {
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  // Mobile-specific styles
  cardContainerMobile: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  buttonsSectionMobile: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginTop: 10,
  },
  sideButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : undefined,
    minHeight: 90,
    justifyContent: 'center',
  },
  sideButtonMobile: {
    flex: 1,
    minHeight: 80,
    padding: 12,
  },
  buttonEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a202c',
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
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorPalette: {
    marginTop: 8,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColor: {
    borderColor: '#1a202c',
    borderWidth: 3,
  },
  colorCheckmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    boxShadow: Platform.OS === 'web' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : undefined,
  },
  successText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteWarningText: {
    fontSize: 16,
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  cardNameHighlight: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  deleteSubText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  directDebitWarning: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
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
  switchServiceCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  switchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  switchContent: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 6,
  },
  switchText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  switchButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  switchButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  switchExplanation: {
    fontSize: 16,
    color: '#1a202c',
    marginBottom: 20,
    lineHeight: 24,
  },
  balanceTransferSection: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  balanceTransferIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  balanceTransferContent: {
    flex: 1,
  },
  balanceTransferTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 6,
  },
  balanceTransferAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 6,
  },
  balanceTransferText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  cardSelection: {
    marginBottom: 20,
  },
  switchCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  switchCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  cardColorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  switchCardInfo: {
    flex: 1,
  },
  switchCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  switchCardDetails: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  switchCardBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  newBalancePreview: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
    fontStyle: 'italic',
  },
  selectedIcon: {
    fontSize: 20,
    color: '#10b981',
    fontWeight: 'bold',
  },
  noCardsContainer: {
    marginBottom: 20,
  },
  noCardsAvailable: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  noCardsIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  noCardsText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCardsSubtext: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    lineHeight: 20,
  },
  balanceWarning: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  createCardButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  createCardIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  createCardText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  createCardHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  switchBenefits: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
  },
  benefitItem: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 6,
    lineHeight: 20,
  },
  balanceBenefitItem: {
    color: '#059669',
    fontWeight: '600',
  },
  switchConfirmButton: {
    backgroundColor: '#10b981',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  deleteButtonModal: {
    backgroundColor: '#ef4444',
  },
  transactionsSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f7fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  transactionsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 1px 4px rgba(0, 0, 0, 0.05)' : undefined,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a202c',
    marginBottom: 2,
  },
  transactionMeta: {
    fontSize: 12,
    color: '#718096',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#718096',
  },
  emptyTransactions: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 1px 4px rgba(0, 0, 0, 0.05)' : undefined,
  },
  emptyTransactionsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTransactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  emptyTransactionsText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  billingCycleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : undefined,
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  billingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
  },
  billingStatus: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  billingStatusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  billingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  billingStat: {
    flex: 1,
  },
  billingStatLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 4,
  },
  billingStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  billingDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc',
  },
  billingDate: {
    alignItems: 'center',
  },
  billingDateLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  billingDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  cycleTransactionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
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
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statementsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statementsLinkIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  statementsLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3b82f6',
    flex: 1,
  },
  statementsLinkArrow: {
    fontSize: 18,
    color: '#3b82f6',
  },
  // Payment Settings Modal Styles
  paymentInfoCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },
  paymentTypeOptions: {
    gap: 12,
  },
  paymentTypeOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  paymentTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentTypeDesc: {
    fontSize: 13,
  },
  debitCardOptions: {
    gap: 8,
  },
  debitCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  debitCardEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  debitCardInfo: {
    flex: 1,
  },
  debitCardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  debitCardBalance: {
    fontSize: 13,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  noCardsText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});
