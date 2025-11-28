import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { name: 'Food & Drink', icon: 'food', color: '#ef4444' },
  { name: 'Shopping', icon: 'shopping', color: '#f59e0b' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Entertainment', icon: 'movie', color: '#8b5cf6' },
  { name: 'Bills', icon: 'receipt', color: '#10b981' },
  { name: 'Health', icon: 'heart-pulse', color: '#ec4899' },
  { name: 'Income', icon: 'cash-plus', color: '#22c55e' },
  { name: 'Other', icon: 'dots-horizontal', color: '#6b7280' },
];

export default function QuickAddScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { showAlert } = useCustomAlert();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Get transaction type from URL params
  useEffect(() => {
    if (route.params?.type) {
      setType(route.params.type);
      if (route.params.type === 'income') {
        setCategory('Income');
      }
    }
    
    // Handle URL parameters from Siri shortcuts
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlType = urlParams.get('type');
      const urlAmount = urlParams.get('amount');
      const urlCategory = urlParams.get('category');
      const urlDescription = urlParams.get('description');
      
      if (urlType) setType(urlType);
      if (urlAmount) setAmount(urlAmount);
      if (urlCategory) setCategory(urlCategory);
      if (urlDescription) setDescription(urlDescription);
    }
  }, [route.params]);

  // Load recent transactions for quick repeat
  useEffect(() => {
    loadRecentTransactions();
  }, [user]);

  const loadRecentTransactions = async () => {
    if (!user) return;

    try {
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        orderBy('date', 'desc'),
        limit(5)
      );
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      showAlert('Loading Error', 'Unable to load recent transactions. Please try again.');
    }
  };

  const handleQuickRepeat = (transaction) => {
    setAmount(Math.abs(transaction.amount).toString());
    setDescription(transaction.description || '');
    setCategory(transaction.category || '');
    setType(transaction.amount < 0 ? 'expense' : 'income');
  };

  const handleSave = async () => {
    // Validate amount using ValidationUtils
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      showValidationError(amountValidation);
      return;
    }

    if (!category) {
      showAlert('Error', 'Please select a category');
      return;
    }

    setLoading(true);

    try {
      const transactionAmount = type === 'expense' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));

      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: transactionAmount,
        description: description || `${category} transaction`,
        category: category,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: type,
        source: 'quick-add'
      });

      // Show success message (works on all platforms)
      showAlert('Success', 'Transaction added successfully!');

      // Reset form
      setAmount('');
      setDescription('');
      setCategory('');

      // Navigate to dashboard after short delay
      setTimeout(() => {
        navigation.navigate('Dashboard');
      }, 500);
    } catch (error) {
      console.error('Error saving transaction:', error);
      showAlert('Error', 'Failed to save transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background[0],
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 50 : 20,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    closeButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.cardBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    typeSelector: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 10,
    },
    typeButton: {
      flex: 1,
      padding: 15,
      borderRadius: 12,
      backgroundColor: theme.cardBg,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    typeButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    typeText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    amountContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: theme.textSecondary + '30',
    },
    currencySymbol: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginRight: 5,
    },
    amountInput: {
      flex: 1,
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      padding: 15,
    },
    descriptionInput: {
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      padding: 15,
      fontSize: 16,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.textSecondary + '30',
    },
    categoriesContainer: {
      marginBottom: 20,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    categoryButton: {
      width: (width - 60) / 4,
      aspectRatio: 1,
      borderRadius: 12,
      backgroundColor: theme.cardBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryButtonActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '20',
    },
    categoryName: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.text,
      marginTop: 5,
      textAlign: 'center',
    },
    recentSection: {
      marginBottom: 20,
    },
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.cardBg,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    recentText: {
      flex: 1,
      marginLeft: 10,
    },
    recentDescription: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    recentCategory: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    recentAmount: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    saveButton: {
      marginBottom: Platform.OS === 'ios' ? 30 : 20,
      borderRadius: 12,
      overflow: 'hidden',
    },
    saveButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#ffffff',
    },
  });

  const filteredCategories = type === 'income' 
    ? CATEGORIES.filter(c => c.name === 'Income')
    : CATEGORIES.filter(c => c.name !== 'Income');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Quick Add</Text>
        <Text style={styles.headerSubtitle}>Fast transaction entry</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
            onPress={() => {
              setType('expense');
              setCategory('');
            }}
          >
            <Icon name="minus-circle" size={24} color="#ef4444" />
            <Text style={styles.typeText}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
            onPress={() => {
              setType('income');
              setCategory('Income');
            }}
          >
            <Icon name="plus-circle" size={24} color="#22c55e" />
            <Text style={styles.typeText}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <Text style={styles.label}>Amount</Text>

{/* Description Input */}
<View style={styles.amountContainer}>
<Text style={styles.label}>Description (Optional)</Text>
<TextInput
style={styles.descriptionInput}
value={description}
onChangeText={setDescription}
placeholder="Enter description (optional)"
placeholderTextColor={theme.textSecondary}
autoCapitalize="sentences"
autoCorrect={true}
/>
</View>

{/* Category Selector */}
<View style={styles.categoriesContainer}>
<Text style={styles.label}>Category</Text>
<View style={styles.categoriesGrid}>
{filteredCategories.map((cat) => (
<TouchableOpacity
key={cat.name}
style={[
styles.categoryButton,
category === cat.name && styles.categoryButtonActive
]}
onPress={() => setCategory(cat.name)}
>
<Icon name={cat.icon} size={28} color={cat.color} />
<Text style={styles.categoryName}>{cat.name}</Text>
</TouchableOpacity>
))}
</View>
</View>
          <View style={styles.categoriesGrid}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryButton,
                  category === cat.name && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Icon name={cat.icon} size={28} color={cat.color} />
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.label}>Quick Repeat</Text>
            {recentTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={styles.recentItem}
                onPress={() => handleQuickRepeat(transaction)}
              >
                <Icon 
                  name={CATEGORIES.find(c => c.name === transaction.category)?.icon || 'cash'} 
                  size={24} 
                  color={CATEGORIES.find(c => c.name === transaction.category)?.color || theme.primary}
                />
                <View style={styles.recentText}>
                  <Text style={styles.recentDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.recentCategory}>
                    {transaction.category}
                  </Text>
                </View>
                <Text style={[
                  styles.recentAmount,
                  { color: transaction.amount < 0 ? '#ef4444' : '#22c55e' }
                ]}>
                  {currency.symbol}{Math.abs(transaction.amount).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButton}>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <LinearGradient
            colors={theme.gradient}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
