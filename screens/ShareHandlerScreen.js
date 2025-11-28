import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { formatNumericInput, amountInputProps, textInputProps } from '../utils/InputUtils';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CATEGORIES = [
  { name: 'Food & Drink', icon: 'food', color: '#ef4444' },
  { name: 'Shopping', icon: 'shopping', color: '#f59e0b' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Entertainment', icon: 'movie', color: '#8b5cf6' },
  { name: 'Bills', icon: 'receipt', color: '#10b981' },
  { name: 'Health', icon: 'heart-pulse', color: '#ec4899' },
  { name: 'Other', icon: 'dots-horizontal', color: '#6b7280' },
];

export default function ShareHandlerScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { showAlert } = useCustomAlert();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharedData, setSharedData] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    handleSharedContent();
  }, []);

  const handleSharedContent = async () => {
    try {
      // In a real PWA, the shared content would come from the service worker
      // For now, we'll simulate parsing shared data
      if (Platform.OS === 'web') {
        // Get form data from the URL or local storage
        const urlParams = new URLSearchParams(window.location.search);
        const sharedText = urlParams.get('text') || '';
        const sharedTitle = urlParams.get('title') || '';
        const sharedUrl = urlParams.get('url') || '';

        setSharedData({
          text: sharedText,
          title: sharedTitle,
          url: sharedUrl
        });

        // Parse the shared content to extract transaction details
        parseSharedContent(sharedText || sharedTitle);
      }
    } catch (error) {
      console.error('Error handling shared content:', error);
      showAlert('Processing Error', 'Unable to process the shared content. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const parseSharedContent = (text) => {
    if (!text) return;

    // Extract amount using regex patterns
    const amountPatterns = [
      /£(\d+\.?\d*)/,  // £45.99
      /\$(\d+\.?\d*)/,  // $45.99
      /€(\d+\.?\d*)/,   // €45.99
      /(\d+\.?\d*)\s*(?:pounds|dollars|euros)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        setAmount(match[1]);
        break;
      }
    }

    // Extract merchant/description
    const merchantPatterns = [
      /at\s+([A-Za-z\s]+)/i,
      /from\s+([A-Za-z\s]+)/i,
      /([A-Za-z\s]+)\s+transaction/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        setDescription(match[1].trim());
        break;
      }
    }

    // Auto-detect category based on keywords
    const keywords = {
      'Food & Drink': ['food', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'mcdonald', 'kfc', 'starbucks', 'tesco', 'sainsbury'],
      'Shopping': ['shopping', 'amazon', 'ebay', 'store', 'purchase', 'bought'],
      'Transport': ['uber', 'taxi', 'bus', 'train', 'petrol', 'fuel', 'parking'],
      'Entertainment': ['cinema', 'movie', 'netflix', 'spotify', 'game'],
      'Bills': ['bill', 'electric', 'water', 'gas', 'phone', 'internet'],
      'Health': ['pharmacy', 'doctor', 'hospital', 'medical', 'health'],
    };

    const lowerText = text.toLowerCase();
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some(word => lowerText.includes(word))) {
        setCategory(cat);
        break;
      }
    }

    // If no description was extracted, use the whole text
    if (!description && text.length < 50) {
      setDescription(text);
    }
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
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: -Math.abs(parseFloat(amount)), // Assume expenses from shared content
        description: description || 'Shared transaction',
        category: category,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        type: 'expense',
        source: 'share-target',
        sharedData: sharedData
      });

      showAlert('Success', 'Transaction added from shared content!');

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
    processingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    processingText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 10,
    },
    sharedContentCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    sharedLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 5,
    },
    sharedText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
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
      width: 100,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.cardBg,
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

  if (processing) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.gradient} style={styles.header}>
          <Text style={styles.headerTitle}>Processing...</Text>
          <Text style={styles.headerSubtitle}>Analyzing shared content</Text>
        </LinearGradient>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.processingText}>Extracting transaction details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <Text style={styles.headerTitle}>Shared Content</Text>
        <Text style={styles.headerSubtitle}>Create transaction from shared data</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="close" size={24} color={theme.text} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Shared Content Display */}
        {sharedData && (sharedData.text || sharedData.title) && (
          <View style={styles.sharedContentCard}>
            <Text style={styles.sharedLabel}>📤 Shared Content</Text>
            <Text style={styles.sharedText}>
              {sharedData.text || sharedData.title}
            </Text>
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.amountContainer}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>{currency.symbol}</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(text) => {
                const numericText = text.replace(/[^0-9.]/g, '');
                const parts = numericText.split('.');
                const formattedText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
                setAmount(formattedText);
              }}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.amountContainer}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter description"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="sentences"
            autoCorrect={true}
          />
        </View>

        {/* Category Selector */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryButton,
                  category === cat.name && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat.name)}
              >
                <Icon name={cat.icon} size={24} color={cat.color} />
                <Text style={styles.categoryName}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButton}>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <LinearGradient
            colors={theme.gradient}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Add Transaction'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
