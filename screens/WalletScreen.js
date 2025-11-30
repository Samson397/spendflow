import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Platform, 
  Modal, 
  TextInput, 
  Alert,
  ActivityIndicator,
  Pressable,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import MobileMenu from '../components/MobileMenu';
import FirebaseService from '../services/FirebaseService';
import AnalyticsService from '../services/AnalyticsService';
import { validateCardLimit } from '../utils/UserLimits';
import { useCustomAlert } from '../contexts/AlertContext';

export default function WalletScreen({ navigation }) {
  const { theme } = useTheme();
  const { showAlert } = useCustomAlert();
  
  // Track screen view
  useEffect(() => {
    AnalyticsService.trackScreen('Wallet');
  }, []);

  // Auto-hide tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Get screen dimensions for responsive layout
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [fabOptionsVisible, setFabOptionsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [debitCardModalVisible, setDebitCardModalVisible] = useState(false);
  const [creditCardModalVisible, setCreditCardModalVisible] = useState(false);
  
  // Debit Card Form states
  const [bankName, setBankName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [overdraftEnabled, setOverdraftEnabled] = useState(false);
  const [overdraftLimit, setOverdraftLimit] = useState('');
  const [debitSelectedColor, setDebitSelectedColor] = useState('#667eea');
  const [debitErrors, setDebitErrors] = useState({});
  
  // Credit Card Form states
  const [creditBankName, setCreditBankName] = useState('');
  const [creditCardName, setCreditCardName] = useState('');
  const [creditLastFour, setCreditLastFour] = useState('');
  const [creditExpiry, setCreditExpiry] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [creditBalance, setCreditBalance] = useState('');
  const [creditAPR, setCreditAPR] = useState('');
  const [creditMinPayment, setCreditMinPayment] = useState('');
  const [creditStatementDay, setCreditStatementDay] = useState('');
  const [creditDueDay, setCreditDueDay] = useState('');
  const [creditSelectedColor, setCreditSelectedColor] = useState('#f5576c');
  const [creditErrors, setCreditErrors] = useState({});
  const [selectedDebitCard, setSelectedDebitCard] = useState(null);
  const [directDebitAmount, setDirectDebitAmount] = useState('minimum');
  const [showDebitDropdown, setShowDebitDropdown] = useState(false);
  const [showDirectDebitDropdown, setShowDirectDebitDropdown] = useState(false);
  const [showDebitColorPalette, setShowDebitColorPalette] = useState(false);
  const [showCreditColorPalette, setShowCreditColorPalette] = useState(false);
  
  useEffect(() => {
    const onChange = (result) => {
      setScreenData(result.window);
    };
    
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Load user's cards from Firebase
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserCards(
        user.uid,
        (userCards) => {
          setCards(userCards);
        }
      );

      return unsubscribe;
    } else {
      setCards([]);
    }
  }, [user]);
  
  const toggleMenu = () => setMenuVisible(!menuVisible);
  const closeMenu = () => setMenuVisible(false);
  const toggleFabOptions = () => setFabOptionsVisible(!fabOptionsVisible);
  const handleFilterChange = (filter) => setActiveFilter(filter);
  
  const handleCreateDebitCard = () => {
    // Check card limits before opening modal
    const validation = validateCardLimit(cards, 'debit');
    if (!validation.valid) {
      showAlert(validation.error.title, validation.error.message);
      setFabOptionsVisible(false);
      return;
    }
    
    setFabOptionsVisible(false);
    setDebitCardModalVisible(true);
  };
  
  const handleCreateCreditCard = () => {
    setFabOptionsVisible(false);
    
    // Check card limits before opening modal
    const validation = validateCardLimit(cards, 'credit');
    if (!validation.valid) {
      showAlert(validation.error.title, validation.error.message);
      return;
    }
    
    // Get debit cards
    const debitCards = cards.filter(card => card.type === 'debit');
    
    if (debitCards.length === 0) {
      showAlert(
        'Debit Card Required',
        'You need to create a debit card first before adding a credit card.'
      );
      return;
    }
    
    setSelectedDebitCard(debitCards[0]);
    setCreditCardModalVisible(true);
  };
  
  const closeDebitCardModal = () => {
    // Blur any focused input to prevent accessibility warnings
    if (typeof document !== 'undefined') {
      document.activeElement?.blur();
    }
    setDebitCardModalVisible(false);
    setBankName('');
    setLastFourDigits('');
    setExpiryDate('');
    setCurrentBalance('');
    setOverdraftEnabled(false);
    setOverdraftLimit('');
    setDebitSelectedColor('#667eea');
    setDebitErrors({});
    setShowDebitColorPalette(false);
  };
  
  const closeCreditCardModal = () => {
    // Blur any focused input to prevent accessibility warnings
    if (typeof document !== 'undefined') {
      document.activeElement?.blur();
    }
    setCreditCardModalVisible(false);
    setCreditBankName('');
    setCreditCardName('');
    setCreditLastFour('');
    setCreditExpiry('');
    setCreditLimit('');
    setCreditBalance('');
    setCreditAPR('');
    setCreditMinPayment('');
    setCreditStatementDay('');
    setCreditDueDay('');
    setCreditSelectedColor('#f5576c');
    setCreditErrors({});
    setSelectedDebitCard(null);
    setDirectDebitAmount('minimum');
    setShowDebitDropdown(false);
    setShowDirectDebitDropdown(false);
    setShowCreditColorPalette(false);
  };
  
  const handleSubmitDebitCard = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create cards');
      return;
    }

    // Validation
    const errors = {};
    if (!bankName.trim()) errors.bankName = 'Bank name is required';
    if (!lastFourDigits || lastFourDigits.length !== 4) errors.lastFour = 'Enter last 4 digits';
    if (!expiryDate || !expiryDate.match(/^\d{2}\/\d{2}$/)) {
      errors.expiryDate = 'Enter MM/YY format';
    } else {
      // Check if card is expired
      const [month, year] = expiryDate.split('/');
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const now = new Date();
      if (expiry < now) {
        errors.expiryDate = 'Card has expired';
      }
    }
    if (!currentBalance.trim()) errors.currentBalance = 'Balance is required';
    
    // Check for duplicate
    const isDuplicate = cards.some(card => 
      card.bank?.toLowerCase() === bankName.toLowerCase() && card.lastFour === lastFourDigits
    );
    if (isDuplicate) errors.duplicate = 'This card already exists';
    
    if (Object.keys(errors).length > 0) {
      setDebitErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Create new card data
      const cardData = {
        type: 'debit',
        name: `${bankName} Debit`,
        bank: bankName,
        lastFour: lastFourDigits,
        balance: parseFloat(currentBalance),
        color: debitSelectedColor,
        expiryDate: expiryDate,
        overdraftEnabled: overdraftEnabled,
        overdraftLimit: overdraftEnabled ? parseFloat(overdraftLimit) || 0 : 0
      };
      
      // Save to Firebase
      const result = await FirebaseService.addCard(user.uid, cardData);
      
      if (result.success) {
        AnalyticsService.trackAddCard('debit');
        Alert.alert('Success', 'Debit card created successfully!');
        closeDebitCardModal();
      } else {
        Alert.alert('Error', result.error || 'Failed to create card');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create card. Please try again.');
      console.error('Error creating debit card:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCreditCard = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create cards');
      return;
    }

    // Validation
    const errors = {};
    if (!selectedDebitCard) errors.debitCard = 'Please select a debit card for payments';
    if (!creditCardName.trim()) errors.cardName = 'Card name is required';
    if (!creditLastFour || creditLastFour.length !== 4) errors.lastFour = 'Enter last 4 digits';
    if (!creditExpiry || !creditExpiry.match(/^\d{2}\/\d{2}$/)) {
      errors.expiryDate = 'Enter MM/YY format';
    } else {
      // Check if card is expired
      const [month, year] = creditExpiry.split('/');
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const now = new Date();
      if (expiry < now) {
        errors.expiryDate = 'Card has expired';
      }
    }
    if (!creditLimit.trim()) errors.creditLimit = 'Credit limit is required';
    if (!creditBalance.trim()) errors.currentBalance = 'Current balance is required';
    
    // Validate statement day and due day
    if (!creditStatementDay.trim()) {
      errors.statementDay = 'Statement day is required';
    } else if (parseInt(creditStatementDay) < 1 || parseInt(creditStatementDay) > 31) {
      errors.statementDay = 'Enter a valid day (1-31)';
    }
    
    if (!creditDueDay.trim()) {
      errors.dueDay = 'Due day is required';
    } else if (parseInt(creditDueDay) < 1 || parseInt(creditDueDay) > 31) {
      errors.dueDay = 'Enter a valid day (1-31)';
    }
    
    // APR is now optional - no validation needed
    
    // Validate minimum payment if minimum is selected
    if (directDebitAmount === 'minimum' && !creditMinPayment.trim()) {
      errors.minPayment = 'Minimum payment amount is required';
    }
    
    // Check for duplicate
    const isDuplicate = cards.some(card => 
      card.name?.toLowerCase() === creditCardName.toLowerCase() && card.lastFour === creditLastFour
    );
    if (isDuplicate) errors.duplicate = 'This card already exists';
    
    if (Object.keys(errors).length > 0) {
      setCreditErrors(errors);
      return;
    }
    
    try {
      setLoading(true);
      
      // Create new credit card data
      const cardData = {
        type: 'credit',
        name: creditCardName,
        bank: creditCardName.split(' ')[0], // Extract first word as bank name for display
        lastFour: creditLastFour,
        balance: parseFloat(creditBalance),
        limit: parseFloat(creditLimit),
        color: creditSelectedColor,
        expiryDate: creditExpiry,
        statementDay: parseInt(creditStatementDay),
        dueDay: parseInt(creditDueDay),
        linkedDebitCardId: selectedDebitCard.id,
        linkedDebitCard: `${selectedDebitCard.bank} ****${selectedDebitCard.lastFour}`,
        directDebitType: directDebitAmount,
        apr: creditAPR ? parseFloat(creditAPR) : null,
        minPayment: creditMinPayment ? parseFloat(creditMinPayment) : 25
      };
      
      // Save to Firebase
      const result = await FirebaseService.addCard(user.uid, cardData);
      
      if (result.success) {
        // Calculate next payment date based on due day
        const now = new Date();
        let nextPaymentDate = new Date(now.getFullYear(), now.getMonth(), parseInt(creditDueDay));
        // If the due day has passed this month, set to next month
        if (nextPaymentDate <= now) {
          nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, parseInt(creditDueDay));
        }
        
        // Create Direct Debit for this credit card on the selected debit card
        const directDebitData = {
          name: `${creditCardName} Payment`,
          amount: directDebitAmount === 'minimum' 
            ? (creditMinPayment ? `£${parseFloat(creditMinPayment).toFixed(2)}` : '£25.00')
            : 'Variable',
          frequency: 'Monthly',
          category: 'Credit Card',
          nextDate: nextPaymentDate.toLocaleDateString('en-GB'), // DD/MM/YYYY format
          statementDay: parseInt(creditStatementDay),
          dueDay: parseInt(creditDueDay),
          status: 'Active',
          cardId: selectedDebitCard.id, // The debit card this direct debit is paid FROM
          cardName: `${selectedDebitCard.bank} ****${selectedDebitCard.lastFour}`,
          creditCardId: result.id, // The credit card this payment is FOR
          creditCardName: creditCardName,
          paymentType: directDebitAmount === 'minimum' ? 'Minimum Payment' : 'Statement Balance',
          description: `Auto-payment for ${creditCardName} credit card`
        };
        
        await FirebaseService.addDirectDebit(user.uid, directDebitData);
        
        AnalyticsService.trackAddCard('credit');
        Alert.alert(
          'Success', 
          `Credit card created successfully!\n\nDirect debit set up on ${selectedDebitCard.bank} ****${selectedDebitCard.lastFour} for ${directDebitAmount === 'minimum' ? 'minimum payment' : 'statement balance'}.`
        );
        closeCreditCardModal();
      } else {
        Alert.alert('Error', result.error || 'Failed to create card');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create card. Please try again.');
      console.error('Error creating credit card:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.background}
      style={styles.container}
    >
      <LinearGradient
        colors={theme.gradient}
        style={[styles.header, { paddingTop: Platform.OS === 'web' ? 10 : insets.top + 20 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Your Wallet</Text>
            <Text style={styles.userName}>Manage your accounts</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content area - menu will overlay this */}
      <View style={styles.contentArea}>
        <MobileMenu 
          visible={menuVisible}
          onClose={closeMenu}
          navigation={navigation}
          currentScreen="Wallet"
        />

        <View style={[styles.filterContainer, { 
          backgroundColor: theme.background[0], 
          borderBottomColor: theme.textSecondary + '20' 
        }]}>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' },
            activeFilter === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => handleFilterChange('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: activeFilter === 'all' ? '#ffffff' : theme.text }]}>
            🎴 All Cards
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' },
            activeFilter === 'debit' && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => handleFilterChange('debit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: activeFilter === 'debit' ? '#ffffff' : theme.text }]}>
            💳 Debit Card
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' },
            activeFilter === 'credit' && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => handleFilterChange('credit')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, { color: activeFilter === 'credit' ? '#ffffff' : theme.text }]}>
            💎 Credit Card
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: theme.background[0] }]} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {activeFilter === 'all' ? 'All Cards' :
               activeFilter === 'debit' ? 'Debit Cards' : 'Credit Cards'}
            </Text>
            <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>Tap to view details</Text>
          </View>

          {cards.filter(card => activeFilter === 'all' || card.type === activeFilter).map((card) => (
            <Pressable
              key={card.id}
              style={({ pressed }) => [
                styles.cardItem,
                Platform.OS !== 'ios' && { 
                  transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }]
                },
                pressed && { opacity: 0.8 }
              ]}
              onPress={() => {
                if (!card || !card.id) {
                  Alert.alert('Error', 'Unable to view card details. Please try again.');
                  return;
                }
                navigation.navigate('ViewCard', { 
                  cardId: card.id,
                  card: card, // Still pass the full card object for immediate display
                  availableCards: cards
                });
              }}
            >
              <LinearGradient
                colors={[card.color, card.color + 'DD']}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardEmoji}>
                      {card.type === 'debit' ? '💳' : '💎'}
                    </Text>
                    <View style={styles.cardDetails}>
                      <Text style={styles.cardNameWhite}>{card.name}</Text>
                      <Text style={styles.cardBankWhite}>{`${card.bank} • • • • ${card.lastFour}`}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRightSection}>
                    <Text style={styles.cardBalanceWhite}>{formatAmount ? formatAmount(card.balance) : card.balance}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBottom}>
                  <Text style={styles.cardExpiryWhite}>{`Expires ${card.expiryDate}`}</Text>
                  {card.limit && (
                    <Text style={styles.cardLimitWhite}>{`Limit: ${formatAmount ? formatAmount(card.limit) : card.limit}`}</Text>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          ))}

          {cards.filter(card => activeFilter === 'all' || card.type === activeFilter).length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.emptyStateEmoji}>
                {activeFilter === 'debit' ? '💳' : '💎'}
              </Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>{`No ${activeFilter} cards`}</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                {`You don't have any ${activeFilter} cards yet. Create one to get started!`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => {
        toggleFabOptions();
        setShowTooltip(false);
      }}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>


      {/* Tooltip for FAB */}
      {showTooltip && !fabOptionsVisible && (
        <View style={[styles.fabTooltip, { backgroundColor: theme.cardBg, borderColor: theme.primary }]}>
          <Text style={[styles.fabTooltipText, { color: theme.text }]}>
            💳 Add Card
          </Text>
          <View style={[styles.fabTooltipArrow, { borderTopColor: theme.cardBg }]} />
        </View>
      )}

      {fabOptionsVisible && (
        <>
          <View style={[styles.fabOptionsContainer, { backgroundColor: theme.cardBg }]}>
            <TouchableOpacity style={styles.fabOption} onPress={handleCreateDebitCard}>
              <Text style={styles.fabOptionEmoji}>💳</Text>
              <Text style={[styles.fabOptionText, { color: theme.text }]}>Create Debit Card</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.fabOption} onPress={handleCreateCreditCard}>
              <Text style={styles.fabOptionEmoji}>💎</Text>
              <Text style={[styles.fabOptionText, { color: theme.text }]}>Create Credit Card</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Debit Card Creation Modal */}
      <Modal
        visible={debitCardModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDebitCardModal}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>💳 Create Debit Card</Text>
              <TouchableOpacity onPress={closeDebitCardModal}>
                <Text style={modalStyles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={modalStyles.modalBody}>
              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Bank Name *</Text>
                <TextInput
                  style={[modalStyles.input, debitErrors.bankName && modalStyles.inputError]}
                  value={bankName}
                  onChangeText={(text) => {
                    // Only allow letters, spaces, and common bank characters
                    const filteredText = text.replace(/[^a-zA-Z\s&-]/g, '');
                    setBankName(filteredText);
                  }}
                  placeholder="e.g., Chase, Barclays"
                  placeholderTextColor="#a0aec0"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {debitErrors.bankName && <Text style={modalStyles.errorText}>{debitErrors.bankName}</Text>}
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Last 4 Digits *</Text>
                <TextInput
                  style={[modalStyles.input, debitErrors.lastFour && modalStyles.inputError]}
                  value={lastFourDigits}
                  onChangeText={(text) => {
                    // Only allow numbers
                    const numericText = text.replace(/[^0-9]/g, '');
                    setLastFourDigits(numericText);
                  }}
                  placeholder="1234"
                  keyboardType="numeric"
                  maxLength={4}
                  placeholderTextColor="#a0aec0"
                />
                {debitErrors.lastFour && <Text style={modalStyles.errorText}>{debitErrors.lastFour}</Text>}
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Expiry Date *</Text>
                <TextInput
                  style={[modalStyles.input, debitErrors.expiryDate && modalStyles.inputError]}
                  value={expiryDate}
                  onChangeText={(text) => {
                    // Only allow numbers and format as MM/YY
                    const numericText = text.replace(/[^0-9]/g, '');
                    let formattedText = numericText;
                    
                    if (numericText.length >= 2) {
                      formattedText = numericText.substring(0, 2) + '/' + numericText.substring(2, 4);
                    }
                    
                    setExpiryDate(formattedText);
                  }}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  maxLength={5}
                  placeholderTextColor="#a0aec0"
                />
                {debitErrors.expiryDate && <Text style={modalStyles.errorText}>{debitErrors.expiryDate}</Text>}
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Current Balance *</Text>
                <TextInput
                  style={[modalStyles.input, debitErrors.balance && modalStyles.inputError]}
                  value={currentBalance}
                  onChangeText={(text) => {
                    // Only allow numbers, decimal point, and format as currency
                    const numericText = text.replace(/[^0-9.]/g, '');
                    
                    // Ensure only one decimal point
                    const parts = numericText.split('.');
                    let formattedText = parts[0];
                    if (parts.length > 1) {
                      formattedText += '.' + parts[1].substring(0, 2); // Max 2 decimal places
                    }
                    
                    setCurrentBalance(formattedText);
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#a0aec0"
                />
                {debitErrors.balance && <Text style={modalStyles.errorText}>{debitErrors.balance}</Text>}
              </View>

              <View style={modalStyles.formGroup}>
                <View style={modalStyles.switchRow}>
                  <Text style={modalStyles.label}>Enable Overdraft</Text>
                  <TouchableOpacity
                    style={[modalStyles.switch, overdraftEnabled && modalStyles.switchActive]}
                    onPress={() => setOverdraftEnabled(!overdraftEnabled)}
                  >
                    <View style={[modalStyles.switchThumb, overdraftEnabled && modalStyles.switchThumbActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {overdraftEnabled && (
                <View style={modalStyles.formGroup}>
                  <Text style={modalStyles.label}>Overdraft Limit</Text>
                  <TextInput
                    style={modalStyles.input}
                    value={overdraftLimit}
                    onChangeText={setOverdraftLimit}
                    placeholder="£500"
                    keyboardType="numeric"
                    placeholderTextColor="#a0aec0"
                  />
                </View>
              )}

              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Card Color</Text>
                <View style={modalStyles.colorPaletteContainer}>
                  <TouchableOpacity 
                    style={[modalStyles.colorPreview, { backgroundColor: debitSelectedColor }]}
                    onPress={() => setShowDebitColorPalette(!showDebitColorPalette)}
                  >
                    <Text style={modalStyles.colorPreviewText}>
                      {showDebitColorPalette ? 'Close Palette' : 'Choose Color'}
                    </Text>
                    <Text style={modalStyles.colorPreviewArrow}>
                      {showDebitColorPalette ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  {showDebitColorPalette && (
                    <View style={modalStyles.colorPalette}>
                    {/* Row 1 - Basic Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            debitSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setDebitSelectedColor(color)}
                        />
                      ))}
                    </View>
                    {/* Row 2 - Standard Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#000000'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            debitSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setDebitSelectedColor(color)}
                        />
                      ))}
                    </View>
                    {/* Row 3 - Nature Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#228B22', '#8B4513', '#4B0082', '#DC143C', '#FF1493', '#32CD32'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            debitSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setDebitSelectedColor(color)}
                        />
                      ))}
                    </View>
                    {/* Row 4 - Professional Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#1E90FF', '#FF6347', '#9370DB', '#20B2AA', '#DAA520', '#CD853F'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            debitSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setDebitSelectedColor(color)}
                        />
                      ))}
                    </View>
                    </View>
                  )}
                </View>
              </View>

              {debitErrors.duplicate && (
                <View style={modalStyles.alertBox}>
                  <Text style={modalStyles.alertText}>⚠️ {debitErrors.duplicate}</Text>
                </View>
              )}
            </ScrollView>

            <View style={modalStyles.modalFooter}>
              <TouchableOpacity style={modalStyles.cancelButton} onPress={closeDebitCardModal}>
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.createButton} onPress={handleSubmitDebitCard}>
                <Text style={modalStyles.createButtonText}>Create Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credit Card Creation Modal */}
      <Modal
        visible={creditCardModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeCreditCardModal}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <View style={modalStyles.modalHeader}>
              <Text style={modalStyles.modalTitle}>💎 Create Credit Card</Text>
              <TouchableOpacity onPress={closeCreditCardModal}>
                <Text style={modalStyles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={modalStyles.modalBody}>
              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Card Name *</Text>
                <TextInput
                  style={[modalStyles.input, creditErrors.cardName && modalStyles.inputError]}
                  value={creditCardName}
                  onChangeText={setCreditCardName}
                  placeholder="e.g., Barclays "
                  placeholderTextColor="#a0aec0"
                />
                {creditErrors.cardName && <Text style={modalStyles.errorText}>{creditErrors.cardName}</Text>}
              </View>

              {/* Side by side: Last 4 Digits & Expiry */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[modalStyles.formGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Last 4 Digits *</Text>
                  <TextInput
                    style={[modalStyles.input, creditErrors.lastFour && modalStyles.inputError]}
                    value={creditLastFour}
                    onChangeText={setCreditLastFour}
                    placeholder="1234"
                    keyboardType="numeric"
                    maxLength={4}
                    placeholderTextColor="#a0aec0"
                  />
                  {creditErrors.lastFour && <Text style={modalStyles.errorText}>{creditErrors.lastFour}</Text>}
                </View>

                <View style={[modalStyles.formGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Expiry Date *</Text>
                  <TextInput
                    style={[modalStyles.input, creditErrors.expiryDate && modalStyles.inputError]}
                    value={creditExpiry}
                    onChangeText={setCreditExpiry}
                    placeholder="MM/YY"
                    maxLength={5}
                    placeholderTextColor="#a0aec0"
                  />
                  {creditErrors.expiryDate && <Text style={modalStyles.errorText}>{creditErrors.expiryDate}</Text>}
                </View>
              </View>

              {/* Side by side: Credit Limit & Balance */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[modalStyles.formGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Credit Limit *</Text>
                  <TextInput
                    style={[modalStyles.input, creditErrors.creditLimit && modalStyles.inputError]}
                    value={creditLimit}
                    onChangeText={setCreditLimit}
                    placeholder="5000"
                    keyboardType="numeric"
                    placeholderTextColor="#a0aec0"
                  />
                  {creditErrors.creditLimit && <Text style={modalStyles.errorText}>{creditErrors.creditLimit}</Text>}
                </View>

                <View style={[modalStyles.formGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Balance Owed *</Text>
                  <TextInput
                    style={[modalStyles.input, creditErrors.currentBalance && modalStyles.inputError]}
                    value={creditBalance}
                    onChangeText={setCreditBalance}
                    placeholder="0.00"
                    keyboardType="numeric"
                    placeholderTextColor="#a0aec0"
                  />
                  {creditErrors.currentBalance && <Text style={modalStyles.errorText}>{creditErrors.currentBalance}</Text>}
                </View>
              </View>

              {/* Side by side: Statement Day & Due Day */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[modalStyles.formGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Statement Day *</Text>
                  <TextInput
                    style={[modalStyles.input, creditErrors.statementDay && modalStyles.inputError]}
                    value={creditStatementDay}
                    onChangeText={setCreditStatementDay}
                    placeholder="15"
                    keyboardType="numeric"
                    maxLength={2}
                    placeholderTextColor="#a0aec0"
                  />
                  {creditErrors.statementDay && <Text style={modalStyles.errorText}>{creditErrors.statementDay}</Text>}
                </View>

                <View style={[modalStyles.formGroup, { flex: 1 }]}>
                  <Text style={modalStyles.label}>Due Day *</Text>
                  <TextInput
                    style={[modalStyles.input, creditErrors.dueDay && modalStyles.inputError]}
                    value={creditDueDay}
                    onChangeText={setCreditDueDay}
                    placeholder="5"
                    keyboardType="numeric"
                    maxLength={2}
                    placeholderTextColor="#a0aec0"
                  />
                  {creditErrors.dueDay && <Text style={modalStyles.errorText}>{creditErrors.dueDay}</Text>}
                </View>
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>APR (%) - Optional</Text>
                <TextInput
                  style={modalStyles.input}
                  value={creditAPR}
                  onChangeText={setCreditAPR}
                  placeholder="19.99"
                  keyboardType="numeric"
                  placeholderTextColor="#a0aec0"
                />
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Card Color</Text>
                <View style={modalStyles.colorPaletteContainer}>
                  <TouchableOpacity 
                    style={[modalStyles.colorPreview, { backgroundColor: creditSelectedColor }]}
                    onPress={() => setShowCreditColorPalette(!showCreditColorPalette)}
                  >
                    <Text style={modalStyles.colorPreviewText}>
                      {showCreditColorPalette ? 'Close Palette' : 'Choose Color'}
                    </Text>
                    <Text style={modalStyles.colorPreviewArrow}>
                      {showCreditColorPalette ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  {showCreditColorPalette && (
                    <View style={modalStyles.colorPalette}>
                    {/* Row 1 - Basic Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            creditSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setCreditSelectedColor(color)}
                        />
                      ))}
                    </View>
                    {/* Row 2 - Standard Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#000000'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            creditSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setCreditSelectedColor(color)}
                        />
                      ))}
                    </View>
                    {/* Row 3 - Nature Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#228B22', '#8B4513', '#4B0082', '#DC143C', '#FF1493', '#32CD32'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            creditSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setCreditSelectedColor(color)}
                        />
                      ))}
                    </View>
                    {/* Row 4 - Professional Colors */}
                    <View style={modalStyles.colorRow}>
                      {['#1E90FF', '#FF6347', '#9370DB', '#20B2AA', '#DAA520', '#CD853F'].map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[modalStyles.colorOption, { backgroundColor: color }, 
                            creditSelectedColor === color && modalStyles.colorOptionSelected]}
                          onPress={() => setCreditSelectedColor(color)}
                        />
                      ))}
                    </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Debit Card Dropdown */}
              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Payment Debit Card *</Text>
                <TouchableOpacity 
                  style={[modalStyles.dropdown, creditErrors.debitCard && modalStyles.inputError]}
                  onPress={() => {
                    setShowDebitDropdown(!showDebitDropdown);
                    setShowDirectDebitDropdown(false);
                  }}
                >
                  <Text style={[modalStyles.dropdownText, !selectedDebitCard && modalStyles.dropdownPlaceholder]}>
                    {selectedDebitCard ? `${selectedDebitCard.bank} ****${selectedDebitCard.lastFour}` : 'Select a debit card'}
                  </Text>
                  <Text style={modalStyles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {creditErrors.debitCard && <Text style={modalStyles.errorText}>{creditErrors.debitCard}</Text>}
                
                {/* Dropdown Options */}
                {showDebitDropdown && (
                  <View style={modalStyles.dropdownOptions}>
                    {cards.filter(card => card.type === 'debit').map((debitCard) => (
                      <TouchableOpacity
                        key={debitCard.id}
                        style={[
                          modalStyles.dropdownOption,
                          selectedDebitCard?.id === debitCard.id && modalStyles.dropdownOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedDebitCard(debitCard);
                          setShowDebitDropdown(false);
                        }}
                      >
                        <Text style={modalStyles.dropdownOptionText}>
                          {debitCard.bank} ****{debitCard.lastFour}
                        </Text>
                        <Text style={modalStyles.dropdownOptionSubtext}>
                          Balance: {debitCard.balance}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Direct Debit Amount Dropdown */}
              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.label}>Direct Debit Type *</Text>
                <TouchableOpacity 
                  style={modalStyles.dropdown}
                  onPress={() => {
                    setShowDirectDebitDropdown(!showDirectDebitDropdown);
                    setShowDebitDropdown(false);
                  }}
                >
                  <Text style={modalStyles.dropdownText}>
                    {directDebitAmount === 'minimum' ? 'Minimum Payment' : 'Statement Balance'}
                  </Text>
                  <Text style={modalStyles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                
                {/* Dropdown Options */}
                {showDirectDebitDropdown && (
                  <View style={modalStyles.dropdownOptions}>
                    <TouchableOpacity
                      style={[modalStyles.dropdownOption, directDebitAmount === 'minimum' && modalStyles.dropdownOptionSelected]}
                      onPress={() => {
                        setDirectDebitAmount('minimum');
                        setShowDirectDebitDropdown(false);
                      }}
                    >
                      <Text style={modalStyles.dropdownOptionText}>Minimum Payment</Text>
                      <Text style={modalStyles.dropdownOptionSubtext}>Pay only the required minimum each month</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[modalStyles.dropdownOption, directDebitAmount === 'statement' && modalStyles.dropdownOptionSelected]}
                      onPress={() => {
                        setDirectDebitAmount('statement');
                        setShowDirectDebitDropdown(false);
                      }}
                    >
                      <Text style={modalStyles.dropdownOptionText}>Statement Balance</Text>
                      <Text style={modalStyles.dropdownOptionSubtext}>Pay the full statement amount (avoid interest)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Minimum Payment Amount - only show if minimum is selected */}
              {directDebitAmount === 'minimum' && (
                <View style={modalStyles.formGroup}>
                  <Text style={modalStyles.label}>Minimum Payment Amount *</Text>
                  <TextInput
                    style={modalStyles.input}
                    value={creditMinPayment}
                    onChangeText={setCreditMinPayment}
                    placeholder="e.g., 25 or 2%"
                    placeholderTextColor="#a0aec0"
                  />
                </View>
              )}

              {creditErrors.duplicate && (
                <View style={modalStyles.alertBox}>
                  <Text style={modalStyles.alertText}>⚠️ {creditErrors.duplicate}</Text>
                </View>
              )}
            </ScrollView>

            <View style={modalStyles.modalFooter}>
              <TouchableOpacity style={modalStyles.cancelButton} onPress={closeCreditCardModal}>
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.createButton} onPress={handleSubmitCreditCard}>
                <Text style={modalStyles.createButtonText}>Create Card</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>

      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  profileIcon: {
    fontSize: 32,
    color: '#ffffff',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  profileButton: {
    padding: 4,
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  activeFilter: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardsSection: {
    paddingVertical: 20,
    paddingBottom: 180, // Increased to ensure content doesn't show behind nav
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
  },
  sectionHint: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
  cardItem: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
    boxShadow: Platform.OS === 'web' ? '0 4px 8px rgba(0, 0, 0, 0.15)' : undefined,
    userSelect: Platform.OS === 'web' ? 'none' : undefined,
    touchAction: Platform.OS === 'web' ? 'manipulation' : undefined,
    overflow: 'hidden',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
    minHeight: 120,
  },
  cardItemGrid: {
    flex: 1,
    marginHorizontal: 6,
  },
  cardRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  cardGradient: {
    padding: 14,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  cardEmoji: {
    fontSize: 24,
    color: '#ffffff',
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
    flexShrink: 0,
  },
  cardNameWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cardBankWhite: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardBalanceWhite: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardLimitWhite: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  cardExpiryWhite: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  emptyState: {
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    boxShadow: Platform.OS === 'web' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : undefined,
  },
  fabIcon: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
  },
  fabOptionsContainer: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 200,
    zIndex: 1001,
    boxShadow: Platform.OS === 'web' ? '0 4px 8px rgba(0, 0, 0, 0.2)' : undefined,
  },
  fabOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  fabTooltip: {
    position: 'absolute',
    bottom: 25,
    right: 90,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 998,
  },
  fabTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  fabTooltipArrow: {
    position: 'absolute',
    right: -8,
    top: '50%',
    marginTop: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
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
  modalCloseIcon: {
    fontSize: 24,
    color: '#718096',
  },
  modalBody: {
    padding: 20,
    paddingBottom: 0,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a202c',
  },
  inputError: {
    borderColor: '#fc8181',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e0',
    justifyContent: 'center',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#667eea',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  colorPaletteContainer: {
    marginTop: 8,
  },
  colorPreview: {
    height: 50,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorPreviewText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  colorPreviewArrow: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorPalette: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  colorOptionSelected: {
    borderColor: '#1a202c',
    borderWidth: 3,
    ...(Platform.OS === 'ios' ? {} : { transform: [{ scale: 1.1 }] }),
  },
  alertBox: {
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#feb2b2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    color: '#c53030',
    fontSize: 14,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  cancelButtonText: {
    color: '#4a5568',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#667eea',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 6,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1a202c',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#a0aec0',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 8,
  },
  dropdownOptions: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  dropdownOptionSelected: {
    backgroundColor: '#ebf4ff',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
  },
  dropdownOptionSubtext: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
});
