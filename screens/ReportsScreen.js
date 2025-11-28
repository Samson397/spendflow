import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import FirebaseService from '../services/FirebaseService';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ReportsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { currency } = useCurrency();

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState('monthly'); // 'monthly' | 'annual' | 'budget'

  useEffect(() => {
    if (!user?.uid) return;
    const unsubTx = FirebaseService.subscribeToUserTransactions(user.uid, setTransactions);
    const unsubBudgets = FirebaseService.subscribeToUserBudgets(user.uid, setBudgets);
    return () => { unsubTx(); unsubBudgets(); };
  }, [user]);

  const getFilteredTransactions = () => {
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      if (reportType === 'annual') {
        return d.getFullYear() === selectedYear;
      }
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  };

  const getSpendingByCategory = () => {
    const filtered = getFilteredTransactions();
    const byCategory = {};
    filtered.forEach(tx => {
      const cat = tx.category || 'Other';
      const amt = Math.abs(parseFloat(String(tx.amount).replace(/[^0-9.-]/g, '')) || 0);
      if (tx.type === 'expense' || (tx.amount && String(tx.amount).startsWith('-'))) {
        byCategory[cat] = (byCategory[cat] || 0) + amt;
      }
    });
    return Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  };

  const getTotalIncome = () => {
    return getFilteredTransactions()
      .filter(tx => tx.type === 'income' || (tx.amount && String(tx.amount).startsWith('+')))
      .reduce((sum, tx) => sum + Math.abs(parseFloat(String(tx.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
  };

  const getTotalExpenses = () => {
    return getFilteredTransactions()
      .filter(tx => tx.type === 'expense' || (tx.amount && String(tx.amount).startsWith('-')))
      .reduce((sum, tx) => sum + Math.abs(parseFloat(String(tx.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
  };

  const getBudgetComparison = () => {
    const spending = getSpendingByCategory();
    const spendingMap = Object.fromEntries(spending);
    return budgets.map(b => ({
      ...b,
      spent: spendingMap[b.category] || 0,
      remaining: b.amount - (spendingMap[b.category] || 0),
      percentage: ((spendingMap[b.category] || 0) / b.amount) * 100
    }));
  };

  const generatePDF = async () => {
    const income = getTotalIncome();
    const expenses = getTotalExpenses();
    const spending = getSpendingByCategory();
    const budgetComp = getBudgetComparison();
    const period = reportType === 'annual' ? selectedYear : `${MONTHS[selectedMonth]} ${selectedYear}`;

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
            h1 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            h2 { color: #4a5568; margin-top: 30px; }
            .summary { display: flex; gap: 20px; margin: 20px 0; }
            .summary-card { flex: 1; padding: 20px; border-radius: 8px; text-align: center; }
            .income { background: #d1fae5; color: #065f46; }
            .expense { background: #fee2e2; color: #991b1b; }
            .net { background: #e0e7ff; color: #3730a3; }
            .amount { font-size: 24px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f7fafc; font-weight: 600; }
            .over-budget { color: #dc2626; font-weight: bold; }
            .under-budget { color: #059669; }
            .progress-bar { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; background: #667eea; }
            .progress-over { background: #dc2626; }
          </style>
        </head>
        <body>
          <h1>SpendFlow Financial Report</h1>
          <p><strong>Period:</strong> ${period}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

          <div class="summary">
            <div class="summary-card income">
              <div>Income</div>
              <div class="amount">${currency.symbol}${income.toFixed(2)}</div>
            </div>
            <div class="summary-card expense">
              <div>Expenses</div>
              <div class="amount">${currency.symbol}${expenses.toFixed(2)}</div>
            </div>
            <div class="summary-card net">
              <div>Net</div>
              <div class="amount">${currency.symbol}${(income - expenses).toFixed(2)}</div>
            </div>
          </div>

          <h2>Spending by Category</h2>
          <table>
            <tr><th>Category</th><th>Amount</th></tr>
            ${spending.map(([cat, amt]) => `<tr><td>${cat}</td><td>${currency.symbol}${amt.toFixed(2)}</td></tr>`).join('')}
          </table>

          ${budgetComp.length > 0 ? `
            <h2>Budget vs Actual</h2>
            <table>
              <tr><th>Category</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Status</th></tr>
              ${budgetComp.map(b => `
                <tr>
                  <td>${b.category}</td>
                  <td>${currency.symbol}${b.amount.toFixed(2)}</td>
                  <td>${currency.symbol}${b.spent.toFixed(2)}</td>
                  <td class="${b.remaining < 0 ? 'over-budget' : 'under-budget'}">${currency.symbol}${b.remaining.toFixed(2)}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill ${b.percentage > 100 ? 'progress-over' : ''}" style="width: ${Math.min(b.percentage, 100)}%"></div>
                    </div>
                    ${b.percentage.toFixed(0)}%
                  </td>
                </tr>
              `).join('')}
            </table>
          ` : ''}
        </body>
      </html>
    `;

    try {
      const result = await Print.printToFileAsync({ html });
      const uri = result?.uri || result;
      
      if (uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else if (uri) {
        Alert.alert('Success', 'PDF generated: ' + uri);
      } else {
        // Fallback for web - just print
        await Print.printAsync({ html });
        Alert.alert('Success', 'Report printed successfully');
      }
    } catch (e) {
      console.error('PDF generation failed:', e);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const income = getTotalIncome();
  const expenses = getTotalExpenses();
  const spending = getSpendingByCategory();
  const budgetComp = getBudgetComparison();

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
          <TouchableOpacity onPress={generatePDF}>
            <Text style={styles.exportBtn}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Report Type Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.cardBg }]}>
        {['monthly', 'annual', 'budget'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.tab, reportType === type && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setReportType(type)}
          >
            <Text style={[styles.tabText, { color: reportType === type ? theme.primary : theme.textSecondary }]}>
              {type === 'monthly' ? '📅 Monthly' : type === 'annual' ? '📊 Annual' : '💰 Budget'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Period Selector */}
      <View style={[styles.periodSelector, { backgroundColor: theme.cardBg }]}>
        {reportType !== 'annual' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, { borderColor: theme.textSecondary + '30', backgroundColor: selectedMonth === i ? theme.primary : theme.background[0] }]}
                onPress={() => setSelectedMonth(i)}
              >
                <Text style={{ color: selectedMonth === i ? '#fff' : theme.textSecondary }}>{m.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[2023, 2024, 2025].map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.chip, { borderColor: theme.textSecondary + '30', backgroundColor: selectedYear === y ? theme.primary : theme.background[0] }]}
              onPress={() => setSelectedYear(y)}
            >
              <Text style={{ color: selectedYear === y ? '#fff' : theme.textSecondary }}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.summaryLabel, { color: '#065f46' }]}>Income</Text>
            <Text style={[styles.summaryAmount, { color: '#065f46' }]}>{currency.symbol}{income.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.summaryLabel, { color: '#991b1b' }]}>Expenses</Text>
            <Text style={[styles.summaryAmount, { color: '#991b1b' }]}>{currency.symbol}{expenses.toFixed(2)}</Text>
          </View>
        </View>
        <View style={[styles.netCard, { backgroundColor: income - expenses >= 0 ? '#d1fae5' : '#fee2e2' }]}>
          <Text style={[styles.netLabel, { color: income - expenses >= 0 ? '#065f46' : '#991b1b' }]}>Net</Text>
          <Text style={[styles.netAmount, { color: income - expenses >= 0 ? '#065f46' : '#991b1b' }]}>{currency.symbol}{(income - expenses).toFixed(2)}</Text>
        </View>

        {/* Spending by Category */}
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Spending by Category</Text>
          {spending.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No expenses this period</Text>
          ) : (
            spending.map(([cat, amt]) => (
              <View key={cat} style={styles.catRow}>
                <Text style={[styles.catName, { color: theme.text }]}>{cat}</Text>
                <Text style={[styles.catAmount, { color: theme.text }]}>{currency.symbol}{amt.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Budget vs Actual */}
        {reportType === 'budget' && (
          <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Budget vs Actual</Text>
            {budgetComp.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No budgets set up</Text>
            ) : (
              budgetComp.map(b => (
                <View key={b.id} style={styles.budgetRow}>
                  <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetCat, { color: theme.text }]}>{b.category}</Text>
                    <Text style={[styles.budgetStatus, { color: b.remaining < 0 ? '#dc2626' : '#059669' }]}>
                      {b.remaining < 0 ? 'Over' : 'Under'} by {currency.symbol}{Math.abs(b.remaining).toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: theme.background[0] }]}>
                    <View style={[styles.progressFill, { width: `${Math.min(b.percentage, 100)}%`, backgroundColor: b.percentage > 100 ? '#dc2626' : theme.primary }]} />
                  </View>
                  <View style={styles.budgetFooter}>
                    <Text style={[styles.budgetSpent, { color: theme.textSecondary }]}>{currency.symbol}{b.spent.toFixed(2)} spent</Text>
                    <Text style={[styles.budgetTotal, { color: theme.textSecondary }]}>of {currency.symbol}{b.amount.toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

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
  exportBtn: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600' },
  periodSelector: { padding: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: 16, marginRight: 8 },
  content: { flex: 1, padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 14, marginBottom: 4 },
  summaryAmount: { fontSize: 22, fontWeight: 'bold' },
  netCard: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  netLabel: { fontSize: 14, marginBottom: 4 },
  netAmount: { fontSize: 26, fontWeight: 'bold' },
  section: { borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  catName: { fontSize: 15 },
  catAmount: { fontSize: 15, fontWeight: '600' },
  budgetRow: { marginBottom: 16 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetCat: { fontSize: 15, fontWeight: '600' },
  budgetStatus: { fontSize: 13, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  budgetFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  budgetSpent: { fontSize: 13 },
  budgetTotal: { fontSize: 13 },
});
