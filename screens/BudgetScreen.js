import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import FirebaseService from '../services/FirebaseService';
import { CATEGORY_NAMES } from '../constants/categories';

export default function BudgetScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);

  // Form state
  const [formCategory, setFormCategory] = useState('Food & Dining');
  const [formAmount, setFormAmount] = useState('');
  const [formThreshold, setFormThreshold] = useState('80'); // percent

  useEffect(() => {
    if (!user?.uid) return;

    const unsubTx = FirebaseService.subscribeToUserTransactions(user.uid, (tx) => {
      setTransactions(tx || []);
    });
    const unsubBudgets = FirebaseService.subscribeToUserBudgets(user.uid, (b) => setBudgets(b || []));

    return () => {
      unsubTx && unsubTx();
      unsubBudgets && unsubBudgets();
    };
  }, [user]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const spentByCategory = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const d = t.date ? new Date(t.date) : null;
      if (!d || isNaN(d)) return;
      if (d < startOfMonth) return;
      const amt = parseFloat(String(t.amount || '0').replace(/[^0-9.-]/g, ''));
      if (isNaN(amt) || amt >= 0) return; // only expenses
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + Math.abs(amt);
    });
    return map;
  }, [transactions, startOfMonth]);

  const handleOpenAdd = () => {
    setSelectedBudget(null);
    setFormCategory('Food & Dining');
    setFormAmount('');
    setFormThreshold('80');
    setAddModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const amount = parseFloat(formAmount.replace(/[^0-9.]/g, ''));
    const threshold = parseInt(formThreshold, 10);
    if (!formCategory || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid', 'Please enter a valid category and amount');
      return;
    }
    if (isNaN(threshold) || threshold < 1 || threshold > 100) {
      Alert.alert('Invalid', 'Threshold must be between 1 and 100');
      return;
    }
    try {
      if (selectedBudget) {
        await FirebaseService.updateBudget(user.uid, selectedBudget.id, {
          category: formCategory,
          amount,
          threshold
        });
        setEditModalVisible(false);
      } else {
        await FirebaseService.addBudget(user.uid, {
          category: formCategory,
          amount,
          threshold,
          period: 'monthly'
        });
        setAddModalVisible(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save budget');
    }
  };

  const handleEdit = (b) => {
    setSelectedBudget(b);
    setFormCategory(b.category);
    setFormAmount(String(b.amount));
    setFormThreshold(String(b.threshold ?? 80));
    setEditModalVisible(true);
  };

  const handleDelete = (b) => {
    Alert.alert(
      'Delete Budget',
      `Delete "${b.category}" budget?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await FirebaseService.deleteBudget(user.uid, b.id);
            } catch (e) {
              Alert.alert('Error', 'Failed to delete budget');
            }
          }
        }
      ]
    );
  };

  const renderBudgetItem = (b) => {
    const spent = spentByCategory[b.category] || 0;
    const pct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 999) : 0;
    const warn = pct >= (b.threshold ?? 80);
    const over = spent > b.amount;

    return (
      <View key={b.id} style={[styles.budgetCard, { backgroundColor: theme.cardBg }]}>
        <View style={styles.budgetHeader}>
          <Text style={[styles.budgetCategory, { color: theme.text }]}>{b.category}</Text>
          <TouchableOpacity onPress={() => handleEdit(b)}>
            <Text style={[styles.editLink, { color: theme.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.progressBar, { backgroundColor: theme.background[0] }]}>
          <View style={[styles.progressFill, { width: `${Math.min(pct,100)}%`, backgroundColor: over ? '#ef4444' : warn ? '#f59e0b' : '#10b981' }]} />
        </View>
        <View style={styles.budgetRow}>
          <Text style={[styles.budgetText, { color: theme.textSecondary }]}>
            Spent: {currency.symbol}{spent.toFixed(2)} / {currency.symbol}{(b.amount || 0).toFixed(2)}
          </Text>
          {over && (
            <Text style={styles.overBadge}>Over</Text>
          )}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.deleteBtn, { borderColor: theme.textSecondary + '30' }]} onPress={() => handleDelete(b)}>
            <Text style={[styles.deleteBtnText, { color: '#ef4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Budgets</Text>
          <TouchableOpacity onPress={handleOpenAdd}>
            <Text style={styles.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {budgets.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
            <Text style={styles.emptyEmoji}>⚙️</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Budgets Yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Create your first monthly budget to get alerts and control spending.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={handleOpenAdd}>
              <Text style={styles.primaryBtnText}>Create Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {budgets.map(renderBudgetItem)}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={addModalVisible || editModalVisible} transparent animationType="fade" onRequestClose={() => { setAddModalVisible(false); setEditModalVisible(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}> 
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{selectedBudget ? 'Edit Budget' : 'Add Budget'}</Text>
              <TouchableOpacity onPress={() => { setAddModalVisible(false); setEditModalVisible(false); }}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {[...new Set([formCategory, ...CATEGORIES])].map(cat => (
                  <TouchableOpacity key={cat} onPress={() => setFormCategory(cat)} style={[styles.chip, { borderColor: theme.textSecondary + '30', backgroundColor: formCategory === cat ? theme.primary : theme.background[0] }]}>
                    <Text style={[styles.chipText, { color: formCategory === cat ? '#fff' : theme.textSecondary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.text }]}>Monthly Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                value={formAmount}
                onChangeText={(t)=> setFormAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder={`${currency.symbol}0.00`}
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, { color: theme.text }]}>Alert Threshold (%)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                value={formThreshold}
                onChangeText={(t)=> setFormThreshold(t.replace(/[^0-9]/g, '').slice(0,3))}
                placeholder="80"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
              />

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 12 }]} onPress={handleSaveBudget}>
                <Text style={styles.primaryBtnText}>{selectedBudget ? 'Save Changes' : 'Create Budget'}</Text>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { color: '#fff', fontSize: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  addBtn: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  emptyState: { alignItems: 'center', margin: 20, padding: 24, borderRadius: 12 },
  emptyEmoji: { fontSize: 54, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', color: '#6b7280' },
  primaryBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  listWrap: { padding: 20, gap: 12 },
  budgetCard: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetCategory: { fontSize: 16, fontWeight: '600' },
  editLink: { fontSize: 14, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetText: { fontSize: 13 },
  overBadge: { backgroundColor: '#ef4444', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 12, fontWeight: '600' },
  actionsRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  deleteBtn: { flex: 1, borderWidth: 1, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  closeIcon: { fontSize: 22 },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 16, marginRight: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
});
