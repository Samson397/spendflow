import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, Modal, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';

const SCREENS = [
  { name: 'Dashboard', icon: '🏠', route: 'Dashboard', keywords: ['home', 'overview', 'summary'] },
  { name: 'Wallet', icon: '💳', route: 'Wallet', keywords: ['cards', 'accounts', 'balance'] },
  { name: 'Savings', icon: '🏦', route: 'SavingsAccount', keywords: ['save', 'interest', 'deposit'] },
  { name: 'Direct Debits', icon: '📅', route: 'DirectDebits', keywords: ['bills', 'payments', 'recurring'] },
  { name: 'Calendar', icon: '📆', route: 'Calendar', keywords: ['schedule', 'dates', 'events'] },
  { name: 'Goals', icon: '🎯', route: 'Goals', keywords: ['targets', 'savings goals', 'objectives'] },
  { name: 'Budgets', icon: '💰', route: 'Budget', keywords: ['spending limits', 'categories'] },
  { name: 'Reports', icon: '📊', route: 'Reports', keywords: ['analytics', 'pdf', 'export'] },
  { name: 'Recurring Transfers', icon: '🔄', route: 'RecurringTransfers', keywords: ['auto', 'scheduled'] },
  { name: 'Notifications', icon: '🔔', route: 'NotificationCenter', keywords: ['alerts', 'messages'] },
  { name: 'Theme', icon: '🎨', route: 'Theme', keywords: ['colors', 'dark mode', 'appearance'] },
  { name: 'Profile', icon: '👤', route: 'Profile', keywords: ['settings', 'account', 'preferences'] },
  { name: 'Community Tips', icon: '💡', route: 'CommunityTips', keywords: ['advice', 'suggestions'] },
  { name: 'Leaderboard', icon: '🏆', route: 'Leaderboard', keywords: ['ranking', 'competition'] },
];

export default function GlobalSearch({ visible, onClose, navigation, transactions = [], cards = [] }) {
  const { theme } = useTheme();
  const { currency } = useCurrency();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ screens: [], transactions: [], cards: [] });

  const search = useCallback((q) => {
    if (!q.trim()) {
      setResults({ screens: [], transactions: [], cards: [] });
      return;
    }
    const lower = q.toLowerCase();

    // Search screens
    const matchedScreens = SCREENS.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.keywords.some(k => k.includes(lower))
    ).slice(0, 5);

    // Search transactions
    const matchedTx = transactions.filter(tx =>
      (tx.description || '').toLowerCase().includes(lower) ||
      (tx.category || '').toLowerCase().includes(lower) ||
      (tx.merchant || '').toLowerCase().includes(lower)
    ).slice(0, 8);

    // Search cards
    const matchedCards = cards.filter(c =>
      (c.name || '').toLowerCase().includes(lower) ||
      (c.bank || '').toLowerCase().includes(lower) ||
      (c.lastFour || '').includes(lower)
    ).slice(0, 4);

    setResults({ screens: matchedScreens, transactions: matchedTx, cards: matchedCards });
  }, [transactions, cards]);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const handleSelect = (type, item) => {
    onClose();
    setQuery('');
    if (type === 'screen') {
      navigation.navigate(item.route);
    } else if (type === 'transaction') {
      navigation.navigate('Statements', { card: cards.find(c => c.id === item.cardId) || cards[0] });
    } else if (type === 'card') {
      navigation.navigate('ViewCard', { card: item });
    }
  };

  const hasResults = results.screens.length > 0 || results.transactions.length > 0 || results.cards.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: theme.cardBg }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.searchBox, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Search screens, transactions, cards..."
              placeholderTextColor={theme.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Text style={{ color: theme.textSecondary, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {!query && (
            <View style={styles.hints}>
              <Text style={[styles.hintTitle, { color: theme.text }]}>Quick Navigation</Text>
              <View style={styles.quickLinks}>
                {SCREENS.slice(0, 8).map(s => (
                  <TouchableOpacity key={s.route} style={[styles.quickLink, { backgroundColor: theme.background[0] }]} onPress={() => handleSelect('screen', s)}>
                    <Text style={styles.quickIcon}>{s.icon}</Text>
                    <Text style={[styles.quickName, { color: theme.text }]}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {query && !hasResults && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsEmoji}>🔎</Text>
              <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>No results for "{query}"</Text>
            </View>
          )}

          {hasResults && (
            <FlatList
              data={[
                ...results.screens.map(s => ({ type: 'screen', item: s })),
                ...results.cards.map(c => ({ type: 'card', item: c })),
                ...results.transactions.map(t => ({ type: 'transaction', item: t })),
              ]}
              keyExtractor={(r, i) => `${r.type}-${r.item.id || i}`}
              renderItem={({ item: r }) => {
                if (r.type === 'screen') {
                  return (
                    <TouchableOpacity style={[styles.resultItem, { borderBottomColor: theme.background[0] }]} onPress={() => handleSelect('screen', r.item)}>
                      <Text style={styles.resultIcon}>{r.item.icon}</Text>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultTitle, { color: theme.text }]}>{r.item.name}</Text>
                        <Text style={[styles.resultSub, { color: theme.textSecondary }]}>Screen</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                if (r.type === 'card') {
                  return (
                    <TouchableOpacity style={[styles.resultItem, { borderBottomColor: theme.background[0] }]} onPress={() => handleSelect('card', r.item)}>
                      <Text style={styles.resultIcon}>💳</Text>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultTitle, { color: theme.text }]}>{r.item.bank} •••• {r.item.lastFour}</Text>
                        <Text style={[styles.resultSub, { color: theme.textSecondary }]}>Card</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                if (r.type === 'transaction') {
                  return (
                    <TouchableOpacity style={[styles.resultItem, { borderBottomColor: theme.background[0] }]} onPress={() => handleSelect('transaction', r.item)}>
                      <Text style={styles.resultIcon}>📝</Text>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultTitle, { color: theme.text }]}>{r.item.description || r.item.merchant || 'Transaction'}</Text>
                        <Text style={[styles.resultSub, { color: theme.textSecondary }]}>{r.item.category} • {r.item.amount}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                }
                return null;
              }}
              style={styles.resultsList}
            />
          )}

          <View style={[styles.footer, { borderTopColor: theme.background[0] }]}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Press ESC or tap outside to close</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: Platform.OS === 'web' ? 80 : 120, paddingHorizontal: 20 },
  container: { borderRadius: 16, maxHeight: '70%', overflow: 'hidden' },
  searchBox: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 10 },
  searchIcon: { fontSize: 20 },
  input: { flex: 1, fontSize: 16 },
  hints: { padding: 16 },
  hintTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickLink: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  quickIcon: { fontSize: 16 },
  quickName: { fontSize: 13 },
  noResults: { padding: 40, alignItems: 'center' },
  noResultsEmoji: { fontSize: 40, marginBottom: 8 },
  noResultsText: { fontSize: 15 },
  resultsList: { maxHeight: 350 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, gap: 12 },
  resultIcon: { fontSize: 24 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: '500' },
  resultSub: { fontSize: 13, marginTop: 2 },
  footer: { padding: 12, borderTopWidth: 1, alignItems: 'center' },
  footerText: { fontSize: 12 },
});
