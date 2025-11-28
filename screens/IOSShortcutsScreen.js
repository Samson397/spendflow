import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Clipboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PRESET_SHORTCUTS = [
  {
    name: 'Add Coffee',
    icon: 'coffee',
    color: '#8b4513',
    siriPhrase: 'add coffee',
    params: { type: 'expense', amount: '4.50', category: 'Food & Drink', description: 'Coffee' }
  },
  {
    name: 'Add Lunch',
    icon: 'food',
    color: '#ef4444',
    siriPhrase: 'add lunch',
    params: { type: 'expense', amount: '8.00', category: 'Food & Drink', description: 'Lunch' }
  },
  {
    name: 'Add Fuel',
    icon: 'gas-station',
    color: '#3b82f6',
    siriPhrase: 'log fuel',
    params: { type: 'expense', amount: '50.00', category: 'Transport', description: 'Fuel' }
  },
  {
    name: 'Add Groceries',
    icon: 'cart',
    color: '#10b981',
    siriPhrase: 'add groceries',
    params: { type: 'expense', category: 'Shopping', description: 'Groceries' }
  },
  {
    name: 'Quick Expense',
    icon: 'cash-minus',
    color: '#f59e0b',
    siriPhrase: 'add expense',
    params: { type: 'expense' }
  },
  {
    name: 'Add Income',
    icon: 'cash-plus',
    color: '#22c55e',
    siriPhrase: 'add income',
    params: { type: 'income', category: 'Income' }
  }
];

export default function IOSShortcutsScreen({ navigation }) {
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const [copiedUrl, setCopiedUrl] = useState('');

  const generateShortcutUrl = (params) => {
    const baseUrl = Platform.OS === 'web' ? window.location.origin : 'https://spendflow.uk';
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    return `${baseUrl}/quick-add?${queryParams.toString()}`;
  };

  const copyToClipboard = async (url, shortcutName) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
      } else {
        Clipboard.setString(url);
      }
      
      setCopiedUrl(url);
      Alert.alert(
        '✅ Copied!', 
        `URL for "${shortcutName}" copied to clipboard.\n\nNext: Open iOS Shortcuts app and create a new shortcut with "Open URL" action.`,
        [{ text: 'Got it!' }]
      );
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopiedUrl(''), 3000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy URL');
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
    backButton: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      left: 20,
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
    infoCard: {
      backgroundColor: theme.primary + '15',
      borderRadius: 12,
      padding: 15,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    infoText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 15,
    },
    shortcutCard: {
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      padding: 15,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    shortcutIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    shortcutInfo: {
      flex: 1,
    },
    shortcutName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    shortcutPhrase: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    shortcutDetails: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    copyButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    copyButtonCopied: {
      backgroundColor: '#22c55e',
    },
    copyButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffff',
    },
    setupGuide: {
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      padding: 15,
      marginTop: 20,
    },
    stepContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    stepNumberText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>iOS Shortcuts</Text>
        <Text style={styles.headerSubtitle}>Set up Siri voice commands</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            🎤 Create Siri shortcuts to add transactions with voice commands like "Hey Siri, add coffee" or "Hey Siri, log fuel"!
          </Text>
        </View>

        {/* Preset Shortcuts */}
        <Text style={styles.sectionTitle}>📱 Ready-Made Shortcuts</Text>
        
        {PRESET_SHORTCUTS.map((shortcut, index) => {
          const url = generateShortcutUrl(shortcut.params);
          const isCopied = copiedUrl === url;
          
          return (
            <View key={index} style={styles.shortcutCard}>
              <View style={[styles.shortcutIcon, { backgroundColor: shortcut.color + '20' }]}>
                <Icon name={shortcut.icon} size={24} color={shortcut.color} />
              </View>
              
              <View style={styles.shortcutInfo}>
                <Text style={styles.shortcutName}>{shortcut.name}</Text>
                <Text style={styles.shortcutPhrase}>
                  🎤 "Hey Siri, {shortcut.siriPhrase}"
                </Text>
                <Text style={styles.shortcutDetails}>
                  {shortcut.params.amount ? `${currency.symbol}${shortcut.params.amount} • ` : ''}
                  {shortcut.params.category || 'Ask for details'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.copyButton, isCopied && styles.copyButtonCopied]}
                onPress={() => copyToClipboard(url, shortcut.name)}
              >
                <Text style={styles.copyButtonText}>
                  {isCopied ? '✓ Copied' : 'Copy URL'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Setup Guide */}
        <View style={styles.setupGuide}>
          <Text style={styles.sectionTitle}>🛠️ How to Set Up</Text>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Tap "Copy URL" on any shortcut above
            </Text>
          </View>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Open the "Shortcuts" app on your iPhone
            </Text>
          </View>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Tap "+" to create a new shortcut
            </Text>
          </View>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Add "Open URL" action and paste the copied URL
            </Text>
          </View>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>5</Text>
            </View>
            <Text style={styles.stepText}>
              Tap "Add to Siri" and record your voice phrase
            </Text>
          </View>
          
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>6</Text>
            </View>
            <Text style={styles.stepText}>
              Test it! Say "Hey Siri, [your phrase]" 🎉
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
