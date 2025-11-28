import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCustomAlert } from '../contexts/AlertContext';
import FirebaseService from '../services/FirebaseService';
import { ErrorUtils } from '../utils/ErrorUtils';
import { parseDirectDebitDate } from '../utils/DateUtils';

export default function CalendarScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showAlert } = useCustomAlert();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Event details modal state
  const [eventDetailsModalVisible, setEventDetailsModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Financial events data from Firebase
  const [financialEvents, setFinancialEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCards, setUserCards] = useState([]);
  
  // Monthly summary data
  const [monthSummary, setMonthSummary] = useState({
    outgoing: 0,
    incoming: 0,
    directDebitsCount: 0
  });

  // Fetch financial events from Firebase
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user?.uid) return;
      
      try {
        setLoading(true);
        
        // Fetch user cards first for color mapping
        const cardsResult = await FirebaseService.getUserCards(user.uid);
        let cards = [];
        if (cardsResult.success && cardsResult.data) {
          cards = cardsResult.data;
          setUserCards(cards);
        }
        
        // Helper function to get card color
        const getCardColor = (cardId) => {
          const card = cards.find(c => c.id === cardId);
          return card?.color || '#667eea';
        };
        
        // Helper function to get card name
        const getCardName = (cardId) => {
          const card = cards.find(c => c.id === cardId);
          return card ? `${card.bank} ${card.type}` : 'Account';
        };
        const getCard = (cardId) => cards.find(c => c.id === cardId) || null;
        
        const allEvents = [];
        
        // Fetch transactions as events
        const transactionsResult = await FirebaseService.getUserTransactions(user.uid);
        if (transactionsResult.success && transactionsResult.data) {
          const transactionEvents = transactionsResult.data
            .filter(transaction => transaction && transaction.date && transaction.amount)
            .map(transaction => {
              const transactionDate = transaction.date.includes('T') ? transaction.date.split('T')[0] : transaction.date;
              return {
                id: transaction.id,
                date: transactionDate,
                title: transaction.description || 'Transaction',
                category: transaction.category || 'Other',
                amount: transaction.amount,
                type: parseFloat(transaction.amount.replace(/[^0-9.-]/g, '')) >= 0 ? 'income' : 'expense',
                cardName: getCardName(transaction.cardId),
                cardColor: getCardColor(transaction.cardId),
                cardId: transaction.cardId,
                card: getCard(transaction.cardId),
                status: new Date(transactionDate) < new Date() ? 'completed' : 'upcoming',
                eventType: 'transaction'
              };
            });
          allEvents.push(...transactionEvents);
        }
        
        // Fetch direct debits as recurring events
        const debitsResult = await FirebaseService.getUserDirectDebits(user.uid);
        if (debitsResult.success && debitsResult.data) {
          const debitEvents = [];
          
          debitsResult.data
            .filter(dd => dd && dd.status === 'Active' && dd.nextDate && dd.name)
            .forEach(debit => {
              // Generate recurring events for the next 12 months
              const baseDate = new Date(debit.nextDate);
              const dayOfMonth = baseDate.getDate();
              
              for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
                const eventDate = new Date();
                eventDate.setMonth(eventDate.getMonth() + monthOffset);
                eventDate.setDate(dayOfMonth);
                
                // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
                if (eventDate.getDate() !== dayOfMonth) {
                  eventDate.setDate(0); // Go to last day of previous month
                }
                
                const formattedDate = eventDate.toISOString().split('T')[0];
                
                debitEvents.push({
                  id: `dd-${debit.id}-${monthOffset}`,
                  date: formattedDate,
                  title: `🔄 ${debit.name}`,
                  category: debit.category || 'Direct Debit',
                  amount: debit.amount || '£0.00',
                  type: 'direct_debit',
                  cardName: getCardName(debit.cardId),
                  cardColor: getCardColor(debit.cardId),
                  cardId: debit.cardId,
                  card: getCard(debit.cardId),
                  status: new Date(formattedDate) < new Date() ? 'completed' : 'upcoming',
                  eventType: 'direct_debit',
                  frequency: debit.frequency || 'Monthly'
                });
              }
            });
          
          allEvents.push(...debitEvents);
        }
        
        setFinancialEvents(allEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        showAlert('Loading Error', 'Unable to load calendar events. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    
    // Subscribe to real-time updates
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserTransactions(user.uid, async (transactions) => {
        // Helper functions
        const getCardColor = (cardId) => {
          const card = userCards.find(c => c.id === cardId);
          return card?.color || '#667eea';
        };
        
        const getCardName = (cardId) => {
          const card = userCards.find(c => c.id === cardId);
          return card ? `${card.bank} ${card.type}` : 'Account';
        };
        const getCard = (cardId) => userCards.find(c => c.id === cardId) || null;
        
        const allEvents = [];
        
        // Add transaction events
        const transactionEvents = transactions
          .filter(transaction => transaction && transaction.date && transaction.amount)
          .map(transaction => {
            const transactionDate = transaction.date.includes('T') ? transaction.date.split('T')[0] : transaction.date;
            return {
              id: transaction.id,
              date: transactionDate,
              title: transaction.description || 'Transaction',
              category: transaction.category || 'Other',
              amount: transaction.amount,
              type: parseFloat(transaction.amount.replace(/[^0-9.-]/g, '')) >= 0 ? 'income' : 'expense',
              cardName: getCardName(transaction.cardId),
              cardColor: getCardColor(transaction.cardId),
              cardId: transaction.cardId,
              card: getCard(transaction.cardId),
              status: new Date(transactionDate) < new Date() ? 'completed' : 'upcoming',
              eventType: 'transaction'
            };
          });
        allEvents.push(...transactionEvents);
        
        // Fetch and add direct debit events
        const debitsResult = await FirebaseService.getUserDirectDebits(user.uid);
        if (debitsResult.success && debitsResult.data) {
          const debitEvents = [];
          
          debitsResult.data
            .filter(dd => dd && dd.status === 'Active' && dd.nextDate && dd.name)
            .forEach(debit => {
              // Generate recurring events for the next 12 months
              const baseDate = new Date(debit.nextDate);
              const dayOfMonth = baseDate.getDate();
              
              for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
                const eventDate = new Date();
                eventDate.setMonth(eventDate.getMonth() + monthOffset);
                eventDate.setDate(dayOfMonth);
                
                // Handle month-end edge cases (e.g., Jan 31 -> Feb 28)
                if (eventDate.getDate() !== dayOfMonth) {
                  eventDate.setDate(0); // Go to last day of previous month
                }
                
                const formattedDate = eventDate.toISOString().split('T')[0];
                
                debitEvents.push({
                  id: `dd-${debit.id}-${monthOffset}`,
                  date: formattedDate,
                  title: `🔄 ${debit.name}`,
                  category: debit.category || 'Direct Debit',
                  amount: debit.amount || '£0.00',
                  type: 'direct_debit',
                  cardName: getCardName(debit.cardId),
                  cardColor: getCardColor(debit.cardId),
                  cardId: debit.cardId,
                  card: getCard(debit.cardId),
                  status: new Date(formattedDate) < new Date() ? 'completed' : 'upcoming',
                  eventType: 'direct_debit',
                  frequency: debit.frequency || 'Monthly'
                });
              }
            });
          
          allEvents.push(...debitEvents);
        }
        
        setFinancialEvents(allEvents);
        
        // Calculate monthly summary
        const now = new Date();
        const currentMonthTransactions = transactions.filter(t => {
          const transDate = new Date(t.date);
          return transDate.getMonth() === now.getMonth() && 
                 transDate.getFullYear() === now.getFullYear();
        });
        
        let outgoing = 0;
        let incoming = 0;
        
        currentMonthTransactions.forEach(t => {
          if (t && t.amount) {
            const amount = parseFloat(t.amount.replace(/[^0-9.-]/g, ''));
            if (!isNaN(amount)) {
              if (amount < 0) {
                outgoing += Math.abs(amount);
              } else {
                incoming += Math.abs(amount);
              }
            }
          }
        });
        
        // Fetch direct debits count within the same callback to avoid flickering
        const debitsCountResult = await FirebaseService.getUserDirectDebits(user.uid);
        const activeDebitsCount = debitsCountResult.success && debitsCountResult.data
          ? debitsCountResult.data.filter(dd => dd.status === 'Active').length
          : 0;

        setMonthSummary({
          outgoing,
          incoming,
          directDebitsCount: activeDebitsCount
        });
      });
      
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [user, userCards]);

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return financialEvents.filter(event => event.date === dateString);
  };

  // Get events for selected date
  const selectedDateEvents = getEventsForDate(selectedDate);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dayEvents = getEventsForDate(current);
      const today = new Date();
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        hasEvents: dayEvents.length > 0,
        events: dayEvents,
        isToday: current.toDateString() === today.toDateString(),
        isSelected: current.toDateString() === selectedDate.toDateString()
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'direct_debit': return '🔄';
      case 'credit_card': return '💳';
      case 'salary': return '💰';
      case 'transfer': return '↗️';
      default: return '📅';
    }
  };

  const getEventColor = (type, status) => {
    if (status === 'completed') return '#9ca3af';
    
    switch (type) {
      case 'direct_debit': return '#ef4444';
      case 'credit_card': return '#dc2626';
      case 'salary': return '#10b981';
      case 'transfer': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const formatAmount = (amount, type) => {
    if (!amount) return '£0.00';
    
    // Remove any existing currency symbols and clean the amount
    const cleanAmount = amount.toString().replace(/[£$€,]/g, '');
    const numAmount = parseFloat(cleanAmount);
    
    if (isNaN(numAmount)) return '£0.00';
    
    const formattedAmount = `£${Math.abs(numAmount).toFixed(2)}`;
    
    // Add prefix based on type
    if (type === 'income' || type === 'refund') {
      return `+${formattedAmount}`;
    } else if (type === 'expense' || type === 'direct_debit') {
      return `-${formattedAmount}`;
    }
    
    return formattedAmount;
  };

  const handleEventPress = (event) => {
    setSelectedEvent(event);
    setEventDetailsModalVisible(true);
  };

  const handleEditEvent = () => {
    setEventDetailsModalVisible(false);
    // Navigate to appropriate screen based on event type
    if (selectedEvent?.type === 'direct_debit') {
      navigation.navigate('DirectDebits', { card: selectedEvent.card });
    } else {
      navigation.navigate('Statements', { card: selectedEvent.card });
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete this ${selectedEvent?.type === 'direct_debit' ? 'direct debit' : 'transaction'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (selectedEvent?.type === 'direct_debit') {
                await FirebaseService.deleteDirectDebit(user.uid, selectedEvent.id);
              } else {
                await FirebaseService.deleteTransaction(user.uid, selectedEvent.id);
              }
              setEventDetailsModalVisible(false);
              showAlert('Success', 'Event deleted successfully');
            } catch (error) {
              showAlert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
          <Text style={styles.title}>Payment Calendar</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.monthNavigation}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(-1)}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Calendar Grid */}
        <View style={[styles.calendarContainer, { backgroundColor: theme.cardBg }]}>
          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {dayNames.map((day) => (
              <Text key={day} style={[styles.dayHeader, { color: theme.textSecondary }]}>{day}</Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.calendarDay,
                  !day.isCurrentMonth && styles.otherMonth,
                  day.isToday && { backgroundColor: theme.primary + '20' },
                  day.isSelected && { backgroundColor: theme.primary },
                ]}
                onPress={() => setSelectedDate(day.date)}
              >
                <Text style={[
                  styles.dayNumber,
                  { color: theme.text },
                  !day.isCurrentMonth && { color: theme.textSecondary },
                  day.isToday && { color: theme.primary },
                  day.isSelected && { color: '#fff' }
                ]}>
                  {day.date.getDate()}
                </Text>
                
                {/* Show direct debits with card colors */}
                {day.events.length > 0 && (
                  <View style={styles.dayEventsContainer}>
                    {day.events.slice(0, 3).map((event, eventIndex) => (
                      <View 
                        key={eventIndex} 
                        style={[
                          styles.dayEventDot,
                          { backgroundColor: event.cardColor },
                          event.status === 'completed' && styles.completedEventDot
                        ]}
                      >
                        <Text style={styles.dayEventText} numberOfLines={1}>
                          {event.title}
                        </Text>
                      </View>
                    ))}
                    {day.events.length > 3 && (
                      <View style={styles.moreEventsIndicator}>
                        <Text style={styles.moreEventsText}>+{day.events.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Date Events */}
        <View style={[styles.eventsSection, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.eventsTitle, { color: theme.text }]}>
            {selectedDate.toDateString() === new Date().toDateString() 
              ? 'Today\'s Events' 
              : `Events for ${selectedDate.toLocaleDateString('en-GB', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long' 
                })}`
            }
          </Text>

          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[styles.eventCard, { backgroundColor: theme.cardBg }]}
                onPress={() => handleEventPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfo}>
                    <View style={[styles.eventCardIndicator, { backgroundColor: item.cardColor }]} />
                    <View style={styles.eventDetails}>
                      <Text style={[styles.eventTitle, { color: theme.text }]}>{item.title}</Text>
                      <Text style={[styles.eventCardName, { color: theme.textSecondary }]}>{item.cardName}</Text>
                      <Text style={[styles.eventCategory, { color: theme.textSecondary }]}>{item.category}</Text>
                    </View>
                  </View>
                  <View style={styles.eventAmountContainer}>
                    <Text style={[
                      styles.eventAmount,
                      { color: getEventColor(item.type, item.status) }
                    ]}>
                      {formatAmount(item.amount, item.type)}
                    </Text>
                    <Text style={[
                      styles.eventStatus,
                      item.status === 'completed' ? styles.completedStatus : styles.upcomingStatus
                    ]}>
                      {item.status === 'completed' ? '✓ Completed' : '⏳ Upcoming'}
                    </Text>
                  </View>
                </View>
                <View style={styles.tapIndicator}>
                  <Text style={[styles.tapText, { color: theme.textSecondary }]}>Tap for details →</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.noEvents, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.noEventsEmoji}>📅</Text>
              <Text style={[styles.noEventsText, { color: theme.text }]}>No events scheduled</Text>
              <Text style={[styles.noEventsSubtext, { color: theme.textSecondary }]}>
                Your payments and transfers will appear here
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Text style={[styles.quickStatsTitle, { color: theme.text }]}>This Month Summary</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.statIcon}>💸</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Outgoing</Text>
              <Text style={[styles.statAmount, { color: theme.text }]}>
                £{monthSummary.outgoing.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Incoming</Text>
              <Text style={[styles.statAmount, { color: theme.text }]}>
                £{monthSummary.incoming.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.statIcon}>🔄</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Direct Debits</Text>
              <Text style={[styles.statAmount, { color: theme.text }]}>
                {monthSummary.directDebitsCount} active
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Event Details Modal */}
      <Modal
        visible={eventDetailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEventDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Event Details</Text>
              <TouchableOpacity onPress={() => setEventDetailsModalVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <ScrollView style={styles.modalBody}>
                {/* Event Header */}
                <View style={styles.eventDetailHeader}>
                  <View style={[styles.eventTypeIndicator, { backgroundColor: selectedEvent.cardColor }]} />
                  <View style={styles.eventDetailInfo}>
                    <Text style={[styles.eventDetailTitle, { color: theme.text }]}>
                      {selectedEvent.title}
                    </Text>
                    <Text style={[styles.eventDetailSubtitle, { color: theme.textSecondary }]}>
                      {selectedEvent.type === 'direct_debit' ? 'Direct Debit' : 'Transaction'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.eventDetailAmount,
                    { color: getEventColor(selectedEvent.type, selectedEvent.status) }
                  ]}>
                    {formatAmount(selectedEvent.amount, selectedEvent.type)}
                  </Text>
                </View>

                {/* Event Details */}
                <View style={styles.detailsSection}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {new Date(selectedEvent.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Card</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedEvent.cardName}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Category</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedEvent.category}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Status</Text>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: selectedEvent.status === 'completed' ? '#10b981' + '20' : '#f59e0b' + '20' }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: selectedEvent.status === 'completed' ? '#10b981' : '#f59e0b' }
                      ]}>
                        {selectedEvent.status === 'completed' ? '✓ Completed' : '⏳ Upcoming'}
                      </Text>
                    </View>
                  </View>

                  {selectedEvent.description && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Description</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {selectedEvent.description}
                      </Text>
                    </View>
                  )}

                  {selectedEvent.type === 'direct_debit' && selectedEvent.frequency && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Frequency</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        {selectedEvent.frequency}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteEvent}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleEditEvent}
              >
                <Text style={styles.modalButtonText}>✏️ Edit</Text>
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    minHeight: 60,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 8,
    marginBottom: 4,
    paddingTop: 4,
  },
  otherMonth: {
    opacity: 0.3,
  },
  today: {
    backgroundColor: '#667eea',
  },
  selectedDay: {
    backgroundColor: '#10b981',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a202c',
    marginBottom: 2,
  },
  otherMonthText: {
    color: '#9ca3af',
  },
  todayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  dayEventsContainer: {
    width: '100%',
    paddingHorizontal: 2,
    flex: 1,
  },
  dayEventDot: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 1,
    minHeight: 12,
    justifyContent: 'center',
  },
  completedEventDot: {
    opacity: 0.5,
  },
  dayEventText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  moreEventsIndicator: {
    backgroundColor: '#6b7280',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: 'center',
  },
  moreEventsText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: '600',
  },
  eventsSection: {
    marginBottom: 20,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 16,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventCardIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  eventCardName: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  eventCategory: {
    fontSize: 14,
    color: '#718096',
  },
  eventAmountContainer: {
    alignItems: 'flex-end',
  },
  eventAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  eventStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  completedStatus: {
    color: '#10b981',
  },
  upcomingStatus: {
    color: '#f59e0b',
  },
  noEvents: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  noEventsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noEventsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickStats: {
    marginBottom: 20,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
    textAlign: 'center',
  },
  statAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
  },
  // Tap indicator styles
  tapIndicator: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 8,
  },
  tapText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Modal styles
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
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeIcon: {
    fontSize: 24,
    color: '#718096',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  eventDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  eventDetailInfo: {
    flex: 1,
  },
  eventDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 4,
  },
  eventDetailSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  eventDetailAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a202c',
    flex: 2,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
