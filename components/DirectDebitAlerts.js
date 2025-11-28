import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import DirectDebitService from '../services/DirectDebitService';
import FirebaseService from '../services/FirebaseService';

export default function DirectDebitAlerts() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [upcomingDebits, setUpcomingDebits] = useState([]);
  const [simulation, setSimulation] = useState([]);
  const [userCards, setUserCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      // Set up real-time subscription for user cards
      const cardsUnsubscribe = FirebaseService.subscribeToUserCards(
        user.uid,
        (cards) => {
          setUserCards(cards);
        }
      );
      
      // Set up real-time subscription for direct debits
      const debitsUnsubscribe = FirebaseService.subscribeToUserDirectDebits(
        user.uid,
        (debits) => {
          // Process the debits to add upcoming info
          console.log('Raw debits from Firebase:', debits.length);
          
          const processedDebits = debits
            .filter(debit => {
              const isActive = debit.status === 'Active';
              const hasNextDate = debit.nextDate;
              console.log(`Debit ${debit.name}: status=${debit.status}, nextDate=${debit.nextDate}, isActive=${isActive}, hasNextDate=${hasNextDate}`);
              return isActive && hasNextDate;
            })
            .map(debit => {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Start of today
              
              const nextPaymentDate = new Date(debit.nextDate);
              nextPaymentDate.setHours(0, 0, 0, 0); // Start of payment day
              
              const daysUntilPayment = Math.ceil((nextPaymentDate - today) / (24 * 60 * 60 * 1000));
              
              console.log(`Processed ${debit.name}: nextPaymentDate=${nextPaymentDate.toISOString().split('T')[0]}, daysUntilPayment=${daysUntilPayment}`);
              
              return {
                ...debit,
                nextPaymentDate,
                daysUntilPayment
              };
            })
            .filter(debit => {
              const thirtyDaysFromNow = new Date();
              thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
              const isWithinRange = debit.nextPaymentDate <= thirtyDaysFromNow && debit.daysUntilPayment >= 0;
              console.log(`${debit.name} within 30 days: ${isWithinRange}`);
              return isWithinRange;
            })
            .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate);
          
          console.log('Final processed debits:', processedDebits.length);
          
          setUpcomingDebits(processedDebits);
        }
      );
      
      simulateToday();
      
      // Return cleanup function
      return () => {
        if (cardsUnsubscribe) cardsUnsubscribe();
        if (debitsUnsubscribe) debitsUnsubscribe();
      };
    }
  }, [user]);


  const simulateToday = async () => {
    try {
      const result = await DirectDebitService.simulateDirectDebitProcessing(user.uid);
      if (result.success) {
        setSimulation(result.simulation || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error simulating debits:', error);
      setLoading(false);
    }
  };

  const processDirectDebits = async () => {
    Alert.alert(
      'Process Direct Debits',
      'This will process all direct debits due today. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Process', 
          onPress: async () => {
            try {
              const result = await DirectDebitService.processDirectDebits(user.uid);
              
              if (result.success) {
                Alert.alert(
                  'Direct Debits Processed',
                  `✅ Processed: ${result.totalProcessed}\n❌ Failed: ${result.totalFailed}`,
                  [{ text: 'OK', onPress: () => {
                    loadUpcomingDebits();
                    simulateToday();
                  }}]
                );
              } else {
                Alert.alert('Error', result.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to process direct debits');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.title, { color: theme.text }]}>Loading direct debits...</Text>
      </View>
    );
  }

  // Show today's due debits with warnings
  const todayDebits = simulation.filter(s => !s.willSucceed);
  const upcomingThisWeek = upcomingDebits.filter(d => d.daysUntilPayment <= 7 && d.daysUntilPayment >= 0);
  
  // Debug logs removed for production

  // Always show the component, even if empty
  const hasAnyAlerts = todayDebits.length > 0 || upcomingThisWeek.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
      {/* Today's Failed Debits Warning */}
      {todayDebits.length > 0 && (
        <View style={[styles.alertCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <Text style={[styles.alertTitle, { color: '#dc2626' }]}>⚠️ Insufficient Funds Alert</Text>
          <Text style={[styles.alertText, { color: '#7f1d1d' }]}>
            {todayDebits.length} direct debit{todayDebits.length > 1 ? 's' : ''} due today will fail due to insufficient funds:
          </Text>
          {todayDebits.map((item, index) => (
            <View key={index} style={styles.debitItem}>
              <Text style={styles.debitName}>{item.debit.name}</Text>
              <Text style={styles.debitAmount}>£{item.amount.toFixed(2)}</Text>
              <Text style={styles.debitBalance}>Available: {item.availableBalance}</Text>
            </View>
          ))}
          <TouchableOpacity 
            style={[styles.actionButton, styles.warningButton]}
            onPress={() => Alert.alert(
              'Add Funds',
              'Please add funds to your account or contact your bank to avoid failed payments.'
            )}
          >
            <Text style={styles.buttonText}>Add Funds</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Process Today's Debits */}
      {simulation.length > 0 && (
        <View style={[styles.alertCard, styles.infoCard]}>
          <Text style={styles.alertTitle}>📅 Direct Debits Due Today</Text>
          <Text style={styles.alertText}>
            {simulation.length} direct debit{simulation.length > 1 ? 's' : ''} scheduled for today:
          </Text>
          {simulation.map((item, index) => (
            <View key={index} style={styles.debitItem}>
              <Text style={styles.debitName}>{item.debit.name}</Text>
              <Text style={styles.debitAmount}>£{item.amount.toFixed(2)}</Text>
              <Text style={[
                styles.debitStatus, 
                { color: item.willSucceed ? '#10b981' : '#ef4444' }
              ]}>
                {item.willSucceed ? '✅ Ready' : '❌ Insufficient funds'}
              </Text>
            </View>
          ))}
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={processDirectDebits}
          >
            <Text style={styles.buttonText}>Process Payments</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upcoming This Week */}
      <View style={[styles.alertCard, { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' }]}>
        <Text style={[styles.alertTitle, { color: theme.text }]}>📋 Upcoming This Week</Text>
        {upcomingThisWeek.length > 0 ? (
          <>
            {upcomingThisWeek.slice(0, 3).map((debit, index) => {
              const linkedCard = userCards.find(card => card.id === debit.cardId);
              return (
                <View key={index} style={styles.upcomingItem}>
                  <View style={styles.debitInfo}>
                    <Text style={[styles.debitName, { color: theme.text }]}>{debit.name}</Text>
                    {linkedCard && (
                      <Text style={[styles.cardInfo, { color: theme.textSecondary }]}>
                        {linkedCard.bank} ****{linkedCard.lastFour}
                      </Text>
                    )}
                  </View>
                  <View style={styles.debitRight}>
                    <Text style={[styles.debitAmount, { color: theme.text }]}>{debit.amount}</Text>
                    <Text style={[styles.debitDate, { color: theme.textSecondary }]}>
                      {debit.daysUntilPayment === 0 ? 'Today' : 
                       debit.daysUntilPayment === 1 ? 'Tomorrow' : 
                       `In ${debit.daysUntilPayment} days`}
                    </Text>
                  </View>
                </View>
              );
            })}
            {upcomingThisWeek.length > 3 && (
              <Text style={[styles.moreText, { color: theme.textSecondary }]}>
                +{upcomingThisWeek.length - 3} more this week
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No bills due this week
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  alertCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  infoCard: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  debitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  debitName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  debitAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 8,
  },
  debitBalance: {
    fontSize: 12,
    color: '#6b7280',
  },
  debitStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  debitDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  debitInfo: {
    flex: 1,
  },
  debitRight: {
    alignItems: 'flex-end',
  },
  cardInfo: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
