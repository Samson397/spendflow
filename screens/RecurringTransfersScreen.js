import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import FirebaseService from '../services/FirebaseService';

const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly'];

export default function RecurringTransfersScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const [rules, setRules] = useState([]);
  const [cards, setCards] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Form
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState('Monthly');
  const [formFromCard, setFormFromCard] = useState('');
  const [formToAccount, setFormToAccount] = useState('');
  const [formDayOfMonth, setFormDayOfMonth] = useState('1');

  useEffect(() => {
    if (!user?.uid) return;
    const unsubRules = FirebaseService.subscribeToRecurringTransfers(user.uid, setRules);
    const unsubCards = FirebaseService.subscribeToUserCards(user.uid, setCards);
    const unsubSavings = FirebaseService.subscribeToUserSavingsAccounts(user.uid, setSavingsAccounts);
    return () => { unsubRules(); unsubCards(); unsubSavings(); };
  }, [user]);

  const openAdd = () => {
    setEditingRule(null);
    setFormAmount('');
    setFormFrequency('Monthly');
    setFormFromCard(cards[0]?.id || '');
    setFormToAccount(savingsAccounts[0]?.id || '');
    setFormDayOfMonth('1');
    setModalVisible(true);
  };

  const openEdit = (r) => {
    setEditingRule(r);
    setFormAmount(String(r.amount || ''));
    setFormFrequency(r.frequency || 'Monthly');
    setFormFromCard(r.fromCardId || '');
    setFormToAccount(r.toAccountId || '');
    setFormDayOfMonth(String(r.dayOfMonth || 1));
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(formAmount.replace(/[^0-9.]/g, ''));
    const day = parseInt(formDayOfMonth, 10);
    if (isNaN(amount) || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    if (!formFromCard || !formToAccount) { Alert.alert('Invalid', 'Select card and savings account'); return; }
    if (isNaN(day) || day < 1 || day > 28) { Alert.alert('Invalid', 'Day must be 1-28'); return; }

    const data = {
      amount,
      frequency: formFrequency,
      fromCardId: formFromCard,
      toAccountId: formToAccount,
      dayOfMonth: day,
      enabled: true
    };

    try {
      if (editingRule) {
        await FirebaseService.updateRecurringTransfer(user.uid, editingRule.id, data);
      } else {
        await FirebaseService.addRecurringTransfer(user.uid, data);
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save rule');
    }
  };

  const handleDelete = (r) => {
    Alert.alert('Delete Rule', 'Remove this recurring transfer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await FirebaseService.deleteRecurringTransfer(user.uid, r.id); } catch {}
      }}
    ]);
  };

  const getCardName = (id) => cards.find(c => c.id === id)?.bank || 'Card';
  const getAccountName = (id) => savingsAccounts.find(a => a.id === id)?.name || 'Account';

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Recurring Transfers</Text>
          <TouchableOpacity onPress={openAdd}>
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {rules.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.cardBg }]}>
            <Text style={styles.emptyEmoji}>🔄</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Recurring Transfers</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Set up automatic transfers to your savings accounts.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={openAdd}>
              <Text style={styles.primaryBtnText}>Create Transfer Rule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {rules.map(r => (
              <TouchableOpacity key={r.id} style={[styles.card, { backgroundColor: theme.cardBg }]} onPress={() => openEdit(r)}>
                <View style={styles.cardRow}>
                  <Text style={[styles.cardAmount, { color: theme.text }]}>{currency.symbol}{(r.amount || 0).toFixed(2)}</Text>
                  <Text style={[styles.cardFreq, { color: theme.primary }]}>{r.frequency}</Text>
                </View>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                  From {getCardName(r.fromCardId)} → {getAccountName(r.toAccountId)}
                </Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Day {r.dayOfMonth} of each period</Text>
                <TouchableOpacity style={styles.deleteLink} onPress={() => handleDelete(r)}>
                  <Text style={{ color: '#ef4444' }}>Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingRule ? 'Edit Rule' : 'New Rule'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 22, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                value={formAmount}
                onChangeText={t => setFormAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder={`${currency.symbol}0.00`}
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: theme.text }]}>Frequency</Text>
              <View style={styles.chips}>
                {FREQUENCIES.map(f => (
                  <TouchableOpacity key={f} style={[styles.chip, { borderColor: theme.textSecondary + '30', backgroundColor: formFrequency === f ? theme.primary : theme.background[0] }]} onPress={() => setFormFrequency(f)}>
                    <Text style={{ color: formFrequency === f ? '#fff' : theme.textSecondary }}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>From Card</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {cards.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.chip, { borderColor: theme.textSecondary + '30', backgroundColor: formFromCard === c.id ? theme.primary : theme.background[0] }]} onPress={() => setFormFromCard(c.id)}>
                    <Text style={{ color: formFromCard === c.id ? '#fff' : theme.textSecondary }}>{c.bank}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.text }]}>To Savings Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {savingsAccounts.map(a => (
                  <TouchableOpacity key={a.id} style={[styles.chip, { borderColor: theme.textSecondary + '30', backgroundColor: formToAccount === a.id ? theme.primary : theme.background[0] }]} onPress={() => setFormToAccount(a.id)}>
                    <Text style={{ color: formToAccount === a.id ? '#fff' : theme.textSecondary }}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.text }]}>Day of Month (1-28)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                value={formDayOfMonth}
                onChangeText={t => setFormDayOfMonth(t.replace(/[^0-9]/g, '').slice(0, 2))}
                placeholder="1"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 16 }]} onPress={handleSave}>
                <Text style={styles.primaryBtnText}>{editingRule ? 'Save Changes' : 'Create Rule'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#fff', fontSize: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  addBtn: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  empty: { margin: 20, padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyEmoji: { fontSize: 54, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 12 },
  primaryBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  list: { padding: 20, gap: 12 },
  card: { borderRadius: 12, padding: 16 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardAmount: { fontSize: 18, fontWeight: 'bold' },
  cardFreq: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 13, marginBottom: 4 },
  deleteLink: { marginTop: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 12 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: 16, marginRight: 8 },
});
