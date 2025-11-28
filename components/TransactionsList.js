import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

const getCategoryEmoji = (category) => {
  switch (category) {
    case 'Groceries': return '🛒';
    case 'Entertainment': return '🎬';
    case 'Income': return '💰';
    case 'Food & Drink': return '☕';
    case 'Shopping': return '🛍️';
    case 'Transport': return '🚇';
    case 'Bills': return '📄';
    case 'Health': return '🏥';
    default: return '💳';
  }
};

const getTransactionColor = (amount) => {
  return amount.startsWith('+') ? '#10b981' : '#ef4444';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short' 
    });
  }
};

export default function TransactionsList({ transactions, limit = null }) {
  const displayTransactions = limit ? transactions.slice(0, limit) : transactions;
  
  return (
    <View style={styles.transactionsList}>
      {displayTransactions.map((transaction) => (
        <View key={transaction.id} style={styles.transactionItem}>
          <View style={styles.transactionLeft}>
            <View style={styles.transactionIcon}>
              <Text style={styles.categoryEmoji}>
                {getCategoryEmoji(transaction.category)}
              </Text>
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>
                {transaction.description}
              </Text>
              <Text style={styles.transactionMeta}>
                {formatDate(transaction.date)} • {transaction.time}
              </Text>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text style={[
              styles.transactionAmount,
              { color: getTransactionColor(transaction.amount) }
            ]}>
              {transaction.amount}
            </Text>
            <Text style={styles.transactionCategory}>
              {transaction.category}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  transactionsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  transactionMeta: {
    fontSize: 14,
    color: '#718096',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#718096',
  },
});
