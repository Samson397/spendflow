import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { FirebaseService } from '../services/FirebaseService';

export default function AdminSupportScreen({ navigation }) {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    urgent: 0
  });

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, selectedFilter]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Load real support tickets from Firebase
      const ticketsData = await FirebaseService.getSupportTickets();
      const ticketStats = await FirebaseService.getSupportStats();
      
      setTickets(ticketsData);
      setStats(ticketStats);
      
    } catch (error) {
      console.error('Failed to load tickets:', error);
      
      // Set empty state on error
      setTickets([]);
      setStats({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        urgent: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(ticket => 
        ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'open':
        filtered = filtered.filter(ticket => ticket.status === 'open');
        break;
      case 'in_progress':
        filtered = filtered.filter(ticket => ticket.status === 'in_progress');
        break;
      case 'resolved':
        filtered = filtered.filter(ticket => ticket.status === 'resolved');
        break;
      case 'urgent':
        filtered = filtered.filter(ticket => ticket.priority === 'high' || ticket.priority === 'urgent');
        break;
      default:
        break;
    }

    // Sort by priority and date
    filtered.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setFilteredTickets(filtered);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await FirebaseService.updateTicketStatus(ticketId, newStatus);
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      ));
      Alert.alert('Success', `Ticket ${newStatus} successfully`);
    } catch (error) {
      console.error('Failed to update ticket:', error);
      Alert.alert('Error', 'Failed to update ticket status');
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const reply = {
        id: Date.now().toString(),
        message: replyText.trim(),
        isAdmin: true,
        createdAt: new Date().toISOString()
      };

      await FirebaseService.addTicketReply(selectedTicket.id, reply);
      
      setTickets(tickets.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, replies: [...(ticket.replies || []), reply] }
          : ticket
      ));

      setReplyText('');
      setReplyModalVisible(false);
      Alert.alert('Success', 'Reply sent successfully');
    } catch (error) {
      console.error('Failed to send reply:', error);
      Alert.alert('Error', 'Failed to send reply');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#dc2626';
      case 'in_progress': return '#ca8a04';
      case 'resolved': return '#16a34a';
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
      <Text style={[
        styles.filterButtonCount,
        { color: selectedFilter === value ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
      ]}>
        {count}
      </Text>
    </TouchableOpacity>
  );

  const TicketCard = ({ ticket }) => (
    <TouchableOpacity
      style={[styles.ticketCard, { backgroundColor: theme.cardBg }]}
      onPress={() => navigation.navigate('AdminTicketDetail', { ticketId: ticket.id })}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={[styles.ticketTitle, { color: theme.text }]} numberOfLines={2}>
            {ticket.title}
          </Text>
          <Text style={[styles.ticketUser, { color: theme.textSecondary }]}>
            {ticket.userName} • {ticket.userEmail}
          </Text>
          <Text style={[styles.ticketDate, { color: theme.textSecondary }]}>
            {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.ticketBadges}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(ticket.priority) }]}>
            <Text style={styles.badgeText}>{ticket.priority?.toUpperCase()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
            <Text style={styles.badgeText}>{ticket.status?.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.ticketDescription, { color: theme.textSecondary }]} numberOfLines={3}>
        {ticket.description}
      </Text>

      <View style={styles.ticketFooter}>
        <Text style={[styles.ticketCategory, { color: theme.textSecondary }]}>
          📁 {ticket.category?.replace('_', ' ')}
        </Text>
        <View style={styles.ticketActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setSelectedTicket(ticket);
              setReplyModalVisible(true);
            }}
          >
            <Text style={styles.actionButtonText}>Reply</Text>
          </TouchableOpacity>
          {ticket.status !== 'resolved' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#16a34a' }]}
              onPress={() => updateTicketStatus(ticket.id, 'resolved')}
            >
              <Text style={styles.actionButtonText}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.headerTitle}>Support Tickets</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{stats.total} Total</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search tickets..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <FilterButton title="All" value="all" count={stats.total} />
          <FilterButton title="Open" value="open" count={stats.open} />
          <FilterButton title="In Progress" value="in_progress" count={stats.inProgress} />
          <FilterButton title="Resolved" value="resolved" count={stats.resolved} />
          <FilterButton title="Urgent" value="urgent" count={stats.urgent} />
        </ScrollView>
      </View>

      {/* Tickets List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
          {filteredTickets.length} tickets found
        </Text>
        
        {filteredTickets.map((ticket, index) => (
          <TicketCard key={ticket.id || index} ticket={ticket} />
        ))}

        {filteredTickets.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              No tickets found matching your criteria
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Reply to Ticket</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Text style={[styles.modalClose, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.replyInput, { backgroundColor: theme.background[0], color: theme.text }]}
              placeholder="Type your reply..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={6}
              value={replyText}
              onChangeText={setReplyText}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.textSecondary }]}
                onPress={() => setReplyModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={sendReply}
              >
                <Text style={styles.modalButtonText}>Send Reply</Text>
              </TouchableOpacity>
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
  headerStats: {
    alignItems: 'flex-end',
  },
  headerStatsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
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
  ticketCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketUser: {
    fontSize: 14,
    marginBottom: 2,
  },
  ticketDate: {
    fontSize: 12,
  },
  ticketBadges: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  ticketDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketCategory: {
    fontSize: 12,
  },
  ticketActions: {
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
  replyInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 120,
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
