import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Platform, Alert, Modal, TextInput, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FirebaseService from '../services/FirebaseService';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { safeGoBack } from '../utils/NavigationHelper';
import { CATEGORY_NAMES, CATEGORY_MAP } from '../constants/categories';

export default function StatementsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  // Get card data from route params
  const card = route?.params?.card || {
    name: 'Premium Rewards',
    bank: 'American Express',
    lastFour: '2345'
  };

  // Attach receipt to transaction
  const handleAttachReceipt = async () => {
    try {
      if (!selectedTransaction) return;
      const pick = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (pick.canceled) return;
      const file = pick.assets?.[0];
      if (!file) return;

      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileName = file.name || `receipt_${Date.now()}`;
      const storageRef = ref(storage, `users/${user.uid}/transactions/${selectedTransaction.id}/${fileName}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      const existing = Array.isArray(selectedTransaction.attachments) ? selectedTransaction.attachments : [];
      const attachment = { name: fileName, url, uploadedAt: new Date().toISOString() };
      await FirebaseService.updateTransaction(user.uid, selectedTransaction.id, { attachments: [...existing, attachment] });
      Alert.alert('Success', 'Receipt attached');
    } catch (e) {
      console.error('Attach receipt failed:', e);
      Alert.alert('Error', 'Failed to attach receipt');
    }
  };

  // Statements data
  const [statements, setStatements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Transaction management modals
  const [transactionDetailsModalVisible, setTransactionDetailsModalVisible] = useState(false);
  const [editTransactionModalVisible, setEditTransactionModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Edit form state
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDate, setEditDate] = useState('');
  
  // Category options for dropdown
  const categoryOptions = CATEGORY_NAMES;
  
  // Category mapping to handle different formats (with/without emojis)
  const categoryMap = CATEGORY_MAP;
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All'); // All, 7days, 30days, 90days, Custom
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Load transactions for this specific card and generate statements
  useEffect(() => {
    if (user?.uid && card?.id) {
      const unsubscribe = FirebaseService.subscribeToCardTransactions(
        user.uid,
        card.id,
        (cardTransactions) => {
          // Store transactions in state for current period calculation
          setTransactions(cardTransactions);
          // Generate statements from card-specific transactions
          const generatedStatements = generateStatementsFromTransactions(cardTransactions);
          setStatements(generatedStatements);
        }
      );
      
      return unsubscribe;
    }
  }, [user, card?.id]);
  
  // Generate statements from transaction data
  const generateStatementsFromTransactions = (transactions) => {
    // Group transactions by month
    const monthlyGroups = {};
    
    transactions.forEach(transaction => {
      if (transaction.date) {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyGroups[monthKey]) {
          monthlyGroups[monthKey] = [];
        }
        monthlyGroups[monthKey].push(transaction);
      }
    });
    
    // Create statements for each month
    const statements = Object.entries(monthlyGroups).map(([monthKey, monthTransactions]) => {
      const [year, month] = monthKey.split('-');
      const monthDate = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      
      // Calculate totals
      let totalSpent = 0;
      let totalDeposits = 0;
      
      monthTransactions.forEach(t => {
        const amount = parseFloat(t.amount?.replace(/[^0-9.-]/g, '') || 0);
        if (t.amount?.startsWith('-')) {
          totalSpent += Math.abs(amount);
        } else if (t.amount?.startsWith('+')) {
          totalDeposits += Math.abs(amount);
        }
      });
      
      const baseStatement = {
        id: monthKey,
        period: monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        startDate: new Date(year, month - 1, 1).toISOString(),
        endDate: lastDay.toISOString(),
        statementDate: new Date(year, month, 1).toISOString(),
        totalSpent: `£${totalSpent.toFixed(2)}`,
        totalSpend: `£${totalSpent.toFixed(2)}`, // For PDF compatibility
        totalDeposits: `£${totalDeposits.toFixed(2)}`,
        netChange: `${totalDeposits > totalSpent ? '+' : '-'}£${Math.abs(totalDeposits - totalSpent).toFixed(2)}`,
        balance: `£${(totalDeposits - totalSpent).toFixed(2)}`,
        transactions: monthTransactions.length,
        transactionData: monthTransactions, // Store actual transactions for PDF
        status: monthKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}` ? 'Current' : 'Available'
      };

      // Only add payment info for credit cards
      if (card.type === 'credit') {
        baseStatement.dueDate = new Date(year, month, 25).toISOString(); // Due 25th of next month
        baseStatement.paymentDate = totalSpent > 0 ? new Date(year, month, Math.floor(Math.random() * 20) + 5).toISOString() : null;
        baseStatement.minimumPayment = `£${Math.max(25, totalSpent * 0.03).toFixed(2)}`; // 3% or £25 minimum
      }

      return baseStatement;
    });
    
    // Filter out current month (statements not ready yet) and sort by date (newest first)
    const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const availableStatements = statements.filter(statement => {
      if (statement.id === currentMonthKey) {
        // For current month, only show if we're past the statement generation date
        const today = new Date();
        const statementDay = card.type === 'credit' ? 20 : 31; // Credit cards: 20th, Debit: end of month
        
        if (card.type === 'credit') {
          // Credit card: available next day after 20th (e.g., available 21st at 00:01)
          const statementDate = new Date(today.getFullYear(), today.getMonth(), statementDay + 1);
          return today >= statementDate;
        } else {
          // Debit card: available next day after month end (e.g., available 1st at 00:01)
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          return today >= nextMonth;
        }
      }
      return true; // Show all past months
    });
    
    return availableStatements.sort((a, b) => b.startDate.localeCompare(a.startDate));
  };

  // Current period data
  // Calculate first and last day of current month for statements
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthName = today.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  
  const [currentPeriod, setCurrentPeriod] = useState({
    period: monthName,
    startDate: firstDayOfMonth.toISOString(),
    endDate: lastDayOfMonth.toISOString(),
    status: 'Active',
    currentSpend: '£0.00',
    transactions: 0,
    totalSpent: '£0.00',
    totalDeposits: '£0.00',
    netChange: '+£0.00',
    currentBalance: '£0.00',
    statementDate: lastDayOfMonth.toISOString() // Statement ready at end of month
  });
  
  // Update current period with real transaction data directly from transactions
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Filter transactions for current month
      const currentMonthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });
      
      // Calculate totals for current month
      let totalSpent = 0;
      let totalDeposits = 0;
      
      currentMonthTransactions.forEach(t => {
        const amount = parseFloat(t.amount?.replace(/[^0-9.-]/g, '') || 0);
        if (t.amount?.startsWith('-')) {
          totalSpent += Math.abs(amount);
        } else if (t.amount?.startsWith('+')) {
          totalDeposits += Math.abs(amount);
        }
      });
      
      setCurrentPeriod(prev => ({
        ...prev,
        currentSpend: `£${totalSpent.toFixed(2)}`,
        totalSpend: `£${totalSpent.toFixed(2)}`,
        transactions: currentMonthTransactions.length,
        totalSpent: `£${totalSpent.toFixed(2)}`,
        totalDeposits: `£${totalDeposits.toFixed(2)}`,
        netChange: `${totalDeposits > totalSpent ? '+' : '-'}£${Math.abs(totalDeposits - totalSpent).toFixed(2)}`
      }));
    }
  }, [transactions]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return '#10b981';
      case 'Overdue': return '#ef4444';
      case 'Due': return '#f59e0b';
      case 'Active': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return '✅';
      case 'Overdue': return '⚠️';
      case 'Due': return '⏰';
      case 'Active': return '🔄';
      default: return '📄';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleStatementPress = (statement) => {
    // Show coming soon message for now
    Alert.alert(
      'Statement Details',
      `Detailed view for ${statement.period} coming soon. You can download the PDF version instead.`,
      [{ text: 'OK' }]
    );
  };
  
  // Handle transaction tap to show details
  const handleTransactionPress = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDetailsModalVisible(true);
  };
  
  // Handle edit transaction
  const handleEditTransaction = () => {
    if (!selectedTransaction) return;
    
    // Pre-fill form with current values
    const amount = selectedTransaction.amount?.replace(/[^0-9.-]/g, '') || '';
    setEditAmount(Math.abs(parseFloat(amount)).toString());
    setEditDescription(selectedTransaction.description || '');
    setEditCategory(selectedTransaction.category || 'Other');
    setEditDate(selectedTransaction.date || new Date().toISOString().split('T')[0]);
    
    setTransactionDetailsModalVisible(false);
    setEditTransactionModalVisible(true);
  };
  
  // Save edited transaction
  const handleSaveEdit = async () => {
    if (!selectedTransaction || !editAmount || !editDescription) {
      Alert.alert('Validation Error', 'Please fill in amount and description');
      return;
    }
    
    const amountNum = parseFloat(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }
    
    try {
      // Determine if it's income or expense based on original transaction
      const isIncome = selectedTransaction.amount?.startsWith('+') || parseFloat(selectedTransaction.amount?.replace(/[^0-9.-]/g, '')) >= 0;
      const formattedAmount = isIncome ? `+£${amountNum.toFixed(2)}` : `-£${amountNum.toFixed(2)}`;
      
      const updates = {
        amount: formattedAmount,
        description: editDescription,
        category: editCategory,
        date: editDate,
        updatedAt: new Date().toISOString()
      };
      
      const result = await FirebaseService.updateTransaction(user.uid, selectedTransaction.id, updates);
      
      if (result.success) {
        Alert.alert('Success', 'Transaction updated successfully');
        setEditTransactionModalVisible(false);
        setSelectedTransaction(null);
        // Transactions will auto-update via subscription
      } else {
        Alert.alert('Error', 'Failed to update transaction. Please try again.');
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    }
  };
  
  // Delete transaction
  const handleDeleteTransaction = () => {
    if (!selectedTransaction) return;
    
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?\n\n${selectedTransaction.description}\n${selectedTransaction.amount}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await FirebaseService.deleteTransaction(user.uid, selectedTransaction.id);
              
              if (result.success) {
                Alert.alert('Success', 'Transaction deleted successfully');
                setTransactionDetailsModalVisible(false);
                setSelectedTransaction(null);
                // Transactions will auto-update via subscription
              } else {
                Alert.alert('Error', 'Failed to delete transaction. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  // Filter transactions based on search and filters
  const getFilteredTransactions = () => {
    let filtered = [...transactions];
    
    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.amount?.includes(query)
      );
    }
    
    // Apply category filter
    if (filterCategory !== 'All') {
      const matchingCategories = categoryMap[filterCategory] || [filterCategory];
      filtered = filtered.filter(t => {
        const transactionCategory = t.category || '';
        return matchingCategories.some(cat => 
          transactionCategory === cat || 
          transactionCategory.includes(cat) ||
          cat.includes(transactionCategory)
        );
      });
    }
    
    // Apply date range filter
    const now = new Date();
    if (filterDateRange !== 'All') {
      filtered = filtered.filter(t => {
        const transDate = new Date(t.date);
        
        switch (filterDateRange) {
          case '7days':
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return transDate >= sevenDaysAgo;
          case '30days':
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return transDate >= thirtyDaysAgo;
          case '90days':
            const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            return transDate >= ninetyDaysAgo;
          case 'Custom':
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              return transDate >= start && transDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };
  
  const filteredTransactions = getFilteredTransactions();
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterCategory('All');
    setFilterDateRange('All');
    setCustomStartDate('');
    setCustomEndDate('');
  };
  
  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() || filterCategory !== 'All' || filterDateRange !== 'All';

  const handleDownloadCSV = async (statement) => {
    try {
      // Generate CSV content
      const csvHeader = 'Date,Description,Category,Amount,Type\n';
      const csvRows = statement.transactionData ? statement.transactionData.map(transaction => {
        const date = new Date(transaction.date).toLocaleDateString('en-GB');
        const description = `"${(transaction.description || 'Transaction').replace(/"/g, '""')}"`;
        const category = `"${(transaction.category || 'Other').replace(/"/g, '""')}"`;
        const amount = parseFloat(transaction.amount?.replace(/[^0-9.-]/g, '') || 0);
        const type = amount < 0 ? 'Expense' : 'Income';
        const formattedAmount = Math.abs(amount).toFixed(2);
        
        return `${date},${description},${category},${formattedAmount},${type}`;
      }).join('\n') : '';
      
      const csvContent = csvHeader + csvRows;
      
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Web download using data URL (avoids blob URL security warning)
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', dataUrl);
        link.setAttribute('download', `${statement.period.replace(' ', '_')}_Statement_${card.name.replace(' ', '_')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('✅ CSV Downloaded', `${statement.period} statement exported successfully!`);
      } else {
        // Mobile sharing
        const fileName = `${statement.period.replace(' ', '_')}_Statement.csv`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `${statement.period} Statement - ${card.name}`,
          });
        }
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      Alert.alert('Error', 'Failed to export CSV. Please try again.');
    }
  };

  const handlePreviewStatement = (statement) => {
    // Generate the same HTML content for preview
    const htmlContent = generateStatementHTML(statement);
    
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const newWindow = window.open('', '_blank', 'width=800,height=1000');
      if (newWindow && newWindow.document) {
        newWindow.document.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    }
  };

  const generateStatementHTML = (statement) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${statement.period} Statement - ${card.name}</title>
        <style>
          @page {
            margin: 0.5in;
            size: A4;
          }
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 0;
            padding: 40px;
            color: #000;
            line-height: 1.6;
            font-size: 12px;
            max-width: 800px;
          }
          .letterhead {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding: 20px 0;
            padding-bottom: 25px;
            border-bottom: 3px solid #003d82;
          }
          .bank-logo {
            flex: 1;
          }
          .bank-name {
            font-size: 28px;
            font-weight: bold;
            color: #003d82;
            margin-bottom: 5px;
            letter-spacing: 1px;
          }
          .bank-tagline {
            font-size: 10px;
            color: #666;
            font-style: italic;
          }
          .statement-info {
            text-align: right;
            flex: 1;
          }
          .statement-title {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
          }
          .statement-date {
            font-size: 10px;
            color: #666;
          }
          .customer-address {
            display: flex;
            justify-content: space-between;
            margin-bottom: 35px;
            padding: 25px;
            background: #f9f9f9;
            border-radius: 8px;
          }
          .address-block {
            flex: 1;
            padding: 0 20px;
          }
          .address-title {
            font-weight: bold;
            font-size: 11px;
            color: #000;
            margin-bottom: 10px;
            text-transform: uppercase;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .address-line {
            font-size: 11px;
            color: #333;
            margin-bottom: 6px;
            padding: 4px 0;
          }
          .account-summary {
            background: #f5f5f5;
            border: 1px solid #ddd;
            padding: 25px;
            margin-bottom: 30px;
            border-radius: 8px;
          }
          .account-summary-title {
            font-size: 12px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
            text-transform: uppercase;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
            font-size: 11px;
          }
          .summary-label {
            color: #333;
          }
          .summary-value {
            font-weight: bold;
            color: #000;
          }
          .summary-value.negative {
            color: #d32f2f;
          }
          .summary-value.positive {
            color: #2e7d32;
          }
          .important-info {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            margin-bottom: 30px;
            border-radius: 8px;
          }
          .important-title {
            font-weight: bold;
            font-size: 11px;
            color: #856404;
            margin-bottom: 5px;
          }
          .important-text {
            font-size: 10px;
            color: #856404;
            line-height: 1.5;
          }
          .transactions-section {
            margin-top: 40px;
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #000;
            margin-bottom: 15px;
            text-transform: uppercase;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
          }
          .transaction-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #ddd;
            margin-bottom: 30px;
            border-radius: 8px;
            overflow: hidden;
          }
          .transaction-table th {
            background: #f0f0f0;
            padding: 16px 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            border-right: 1px solid #ddd;
            font-weight: bold;
            font-size: 11px;
            color: #000;
            text-transform: uppercase;
          }
          .transaction-table td {
            padding: 14px 12px;
            border-bottom: 1px solid #eee;
            border-right: 1px solid #eee;
            font-size: 11px;
            color: #333;
            vertical-align: top;
            line-height: 1.4;
          }
          .amount-positive {
            color: #2e7d32;
            font-weight: bold;
            text-align: right;
          }
          .amount-negative {
            color: #d32f2f;
            font-weight: bold;
            text-align: right;
          }
          .footer {
            margin-top: 50px;
            padding: 30px 20px 20px 20px;
            border-top: 2px solid #003d82;
            font-size: 10px;
            color: #666;
            background: #f9f9f9;
            border-radius: 8px;
          }
          .footer-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 4px 0;
            line-height: 1.4;
          }
          .page-number {
            text-align: center;
            margin-top: 20px;
            font-size: 8px;
            color: #999;
          }
        </style>
      </head>
      <body>
        <!-- SpendFlow Header -->
        <div class="letterhead">
          <div class="bank-logo">
            <div class="bank-name">SpendFlow</div>
            <div class="bank-tagline">Personal Finance Tracking</div>
          </div>
          <div class="statement-info">
            <div class="statement-title">${card.type === 'credit' ? 'CREDIT CARD TRANSACTION SUMMARY' : 'DEBIT CARD TRANSACTION SUMMARY'}</div>
            <div class="statement-date">Report Date: ${formatDate(statement.statementDate)}</div>
          </div>
        </div>

        <!-- Account Information -->
        <div class="customer-address">
          <div class="address-block">
            <div class="address-title">Statement Information</div>
            <div class="address-line">Account: ${card.name}</div>
            <div class="address-line">Card: **** **** **** ${card.lastFour}</div>
            <div class="address-line">Provider: ${card.bank}</div>
            <div class="address-line">Statement Period: ${formatDate(statement.startDate)} to ${formatDate(statement.endDate)}</div>
          </div>
          <div class="address-block">
            <div class="address-title">Contact Information</div>
            <div class="address-line">SpendFlow Support</div>
            <div class="address-line">Email: spendflowapp@gmail.com</div>
            <div class="address-line">Web: www.spendflow.uk</div>
            <div class="address-line">Page 1 of 1</div>
          </div>
        </div>

        <!-- Account Summary Box -->
        <div class="account-summary">
          <div class="account-summary-title">Account Summary</div>
          <div class="summary-row">
            <span class="summary-label">Opening Balance:</span>
            <span class="summary-value">£0.00</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Money In:</span>
            <span class="summary-value positive">${statement.totalDeposits}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Money Out:</span>
            <span class="summary-value negative">${statement.totalSpent}</span>
          </div>
          ${card.type === 'credit' ? `
          <div class="summary-row">
            <span class="summary-label">Fees/Interest:</span>
            <span class="summary-value">£0.00</span>
          </div>
          ` : ''}
          <div class="summary-row" style="border-top: 1px solid #000; padding-top: 5px; margin-top: 5px;">
            <span class="summary-label"><strong>${card.type === 'credit' ? 'New Balance:' : 'Closing Balance:'}</strong></span>
            <span class="summary-value"><strong>${statement.balance}</strong></span>
          </div>
          ${card.type === 'credit' ? `
          <div class="summary-row">
            <span class="summary-label">Minimum Payment Due:</span>
            <span class="summary-value">${statement.minimumPayment}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Payment Due Date:</span>
            <span class="summary-value">${formatDate(statement.dueDate)}</span>
          </div>
          ` : ''}
        </div>

        ${card.type === 'credit' ? `
        <!-- Important Notice for Credit Cards -->
        <div class="important-info">
          <div class="important-title">IMPORTANT NOTICE</div>
          <div class="important-text">
            This is a transaction summary generated by SpendFlow based on data you have entered. 
            This is NOT an official bank statement. Payment calculations are estimates only. 
            For official statements and payment information, please contact ${card.bank} directly.
          </div>
        </div>
        ` : `
        <!-- Account Information for Debit Cards -->
        <div class="important-info" style="background: #e3f2fd; border: 1px solid #90caf9;">
          <div class="important-title" style="color: #1565c0;">IMPORTANT NOTICE</div>
          <div class="important-text" style="color: #1565c0;">
            This is a transaction summary generated by SpendFlow based on data you have entered. 
            This is NOT an official bank statement. For official statements and account enquiries, please contact ${card.bank} directly.
          </div>
        </div>
        `}

        <!-- Transaction Details -->
        <div class="transactions-section">
          <div class="section-title">Transaction Details</div>
          <table class="transaction-table">
            <thead>
              <tr>
                <th style="width: 15%;">Trans Date</th>
                <th style="width: 15%;">Post Date</th>
                <th style="width: 45%;">Description</th>
                <th style="width: 15%;">Reference</th>
                <th style="width: 10%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${statement.transactionData ? statement.transactionData.map((transaction, index) => {
                const date = new Date(transaction.date);
                const amount = parseFloat(transaction.amount?.replace(/[^0-9.-]/g, '') || 0);
                const isNegative = transaction.amount?.startsWith('-') || amount < 0;
                const formattedAmount = `${isNegative ? '-' : '+'}£${Math.abs(amount).toFixed(2)}`;
                
                // Transaction date (when it happened)
                const transDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                // Post date (usually 1-2 days later for processing)
                const postDateObj = new Date(date);
                postDateObj.setDate(postDateObj.getDate() + (Math.random() > 0.7 ? 1 : 0)); // Sometimes same day, sometimes next day
                const postDate = postDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                
                // More realistic reference - just sequential numbers
                const reference = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(index + 1).padStart(3, '0')}`;
                
                return `
                  <tr>
                    <td>${transDate}</td>
                    <td>${postDate}</td>
                    <td>${transaction.description || 'Transaction'}</td>
                    <td>${reference}</td>
                    <td class="${isNegative ? 'amount-negative' : 'amount-positive'}">${formattedAmount}</td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 20px; color: #718096;">
                    No transactions found for this period
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- Statement Footer -->
        <div class="footer">
          <div class="footer-row">
            <span>SpendFlow Support: spendflowapp@gmail.com</span>
            <span>Web: www.spendflow.uk</span>
          </div>
          <div class="footer-row">
            <span>SpendFlow is a personal finance tracking platform. We do not provide banking or card services. This statement shows transactions tracked in your SpendFlow account.</span>
            <span>Statement Date: ${formatDate(statement.statementDate)}</span>
          </div>
          <div class="footer-row">
            <span>Please retain this statement for your records.</span>
            <span>Generated by SpendFlow</span>
          </div>
        </div>
        
        <div class="page-number">
          Page 1 of 1
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async (statement) => {
    
    try {
      // Generate HTML content for the statement using the extracted function
      const htmlContent = generateStatementHTML(statement);

      if (Platform.OS === 'web') {
        // Web-specific PDF generation - open formatted HTML in new window
        try {
          const newWindow = window.open('', '_blank', 'width=800,height=1000');
          
          if (newWindow && newWindow.document) {
            // Write the complete HTML document directly (avoids blob URLs)
            newWindow.document.open();
            newWindow.document.write(htmlContent);
            newWindow.document.close();
            
            // Wait for content to load, then trigger print
            newWindow.onload = () => {
              setTimeout(() => {
                newWindow.focus();
                newWindow.print();
              }, 1000);
            };
            
            // If onload doesn't fire, use a backup timer
            setTimeout(() => {
              if (newWindow && !newWindow.closed) {
                newWindow.focus();
                newWindow.print();
              }
            }, 2000);
            
            Alert.alert(
              "✅ Bank Statement Ready", 
              `Your professional ${statement.period} bank statement is opening in a new window. The print dialog will appear automatically, or press Ctrl+P (Cmd+P on Mac) to print/save as PDF.`,
              [{ text: "OK" }]
            );
          } else {
            // Popup blocked - use data URL
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
            const newTab = window.open(dataUrl, '_blank');
            
            if (newTab) {
              Alert.alert(
                "✅ Statement Ready", 
                `Your bank statement is ready in a new tab. Press Ctrl+P (Cmd+P on Mac) to print or save as PDF.`,
                [{ text: "OK" }]
              );
            } else {
              throw new Error('Unable to open new window - popup blocked');
            }
          }
        } catch (webError) {
          console.error('Web PDF error:', webError);
          
          // Final fallback - download as HTML file using data URL
          if (typeof document !== 'undefined') {
            const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${statement.period.replace(' ', '_')}_Statement_${card.name.replace(' ', '_')}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          
          Alert.alert(
            "Statement Downloaded", 
            "Your bank statement has been downloaded as an HTML file. Open it in your browser and use Ctrl+P to save as PDF.",
            [{ text: "OK" }]
          );
        }
      } else {
        // Mobile PDF generation
        try {
          const result = await Print.printToFileAsync({
            html: htmlContent,
            base64: false
          });

          if (result && result.uri) {
            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();
            
            if (isAvailable) {
              // Share/download the PDF
              await Sharing.shareAsync(result.uri, {
                mimeType: 'application/pdf',
                dialogTitle: `${statement.period} Statement - ${card.name}`,
                UTI: 'com.adobe.pdf'
              });
            } else {
              Alert.alert(
                "PDF Generated", 
                `Your ${statement.period} statement has been generated successfully!`,
                [{ text: "OK" }]
              );
            }
          } else {
            throw new Error('PDF generation failed - no URI returned');
          }
        } catch (pdfError) {
          console.error('Mobile PDF generation error:', pdfError);
          // Fallback to print dialog on mobile too
          Alert.alert(
            "PDF Generation", 
            "Unable to generate PDF file. Please use the browser's print function to save as PDF.",
            [{ text: "OK" }]
          );
        }
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert(
        "Error", 
        "Sorry, there was an error generating your statement. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => safeGoBack(navigation, 'Dashboard')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Statements</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardText}>{card.name} • • • • {card.lastFour}</Text>
          <Text style={styles.bankText}>{card.bank}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Current Period */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Current Period</Text>
          
          <View style={[styles.statementCard, { backgroundColor: theme.cardBg, borderColor: theme.primary, borderWidth: 2 }]}>
            <View style={styles.statementHeader}>
              <View>
                <Text style={[styles.statementTitle, { color: theme.text }]}>{monthName}</Text>
                <Text style={[styles.statementPeriod, { color: theme.textSecondary }]}>
                  {firstDayOfMonth.toLocaleDateString('en-GB')} - {lastDayOfMonth.toLocaleDateString('en-GB')}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.statusText, { color: theme.primary }]}>Live</Text>
              </View>
            </View>

            <View style={styles.statementStats}>
              <View style={styles.statementStat}>
                <Text style={[styles.statementStatLabel, { color: theme.textSecondary }]}>Total Spend</Text>
                <Text style={[styles.statementStatValue, { color: theme.text }]}>{currentPeriod.totalSpend}</Text>
              </View>
              <View style={styles.statementStat}>
                <Text style={[styles.statementStatLabel, { color: theme.textSecondary }]}>Transactions</Text>
                <Text style={[styles.statementStatValue, { color: theme.text }]}>{currentPeriod.transactions}</Text>
              </View>
            </View>

            <View style={styles.statementFooter}>
              <Text style={[styles.statementFooterText, { color: theme.textSecondary }]}>
                {card.type === 'credit' 
                  ? (new Date().getDate() < 20 
                      ? `Statement ready ${20 - new Date().getDate()} days (21st)` 
                      : `Statement ready next month (21st)`)
                  : `Statement ready ${new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()} days (1st)`
                }
              </Text>
              <View style={styles.downloadButtons}>
                <View style={[styles.downloadButton, { backgroundColor: theme.textSecondary + '20', opacity: 0.5 }]}>
                  <Text style={[styles.downloadText, { color: theme.textSecondary }]}>📄 PDF</Text>
                </View>
                <View style={[styles.downloadButton, { backgroundColor: theme.textSecondary + '20', opacity: 0.5 }]}>
                  <Text style={[styles.downloadText, { color: theme.textSecondary }]}>📊 CSV</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Search and Filter Bar */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '20' }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search transactions..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={[styles.clearIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme.cardBg, borderColor: theme.primary }]}
              onPress={() => setShowFilterModal(true)}
            >
              <Text style={[styles.filterButtonText, { color: theme.primary }]}>
                🎛️ Filters {hasActiveFilters && `(${[filterCategory !== 'All', filterDateRange !== 'All', searchQuery.trim()].filter(Boolean).length})`}
              </Text>
            </TouchableOpacity>
            
            {hasActiveFilters && (
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: theme.textSecondary + '20' }]}
                onPress={handleClearFilters}
              >
                <Text style={[styles.clearFiltersText, { color: theme.textSecondary }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {hasActiveFilters && (
            <View style={styles.activeFiltersRow}>
              {filterCategory !== 'All' && (
                <View style={[styles.activeFilterChip, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: theme.primary }]}>{filterCategory}</Text>
                  <TouchableOpacity onPress={() => setFilterCategory('All')}>
                    <Text style={[styles.activeFilterClose, { color: theme.primary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              {filterDateRange !== 'All' && (
                <View style={[styles.activeFilterChip, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: theme.primary }]}>
                    {filterDateRange === 'Custom' ? 'Custom Date' : filterDateRange}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterDateRange('All')}>
                    <Text style={[styles.activeFilterClose, { color: theme.primary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* All Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transactions {filteredTransactions.length > 0 && `(${filteredTransactions.length})`}
            </Text>
          </View>
          
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                style={[styles.transactionCard, { backgroundColor: theme.cardBg }]}
                onPress={() => handleTransactionPress(transaction)}
              >
                <View style={styles.transactionRow}>
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDescription, { color: theme.text }]}>
                      {transaction.description || 'Transaction'}
                    </Text>
                    <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                      {new Date(transaction.date).toLocaleDateString('en-GB')} • {transaction.category || 'Other'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.amount?.startsWith('-') ? '#ef4444' : '#10b981' }
                  ]}>
                    {transaction.amount}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.emptyStateEmoji}>💳</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Transactions</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No transactions for this month yet.
              </Text>
            </View>
          )}
        </View>

        {/* Previous Statements */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Previous Statements</Text>
          
          {statements.map((statement) => (
            <TouchableOpacity 
              key={statement.id}
              style={[styles.statementCard, { backgroundColor: theme.cardBg }]}
              onPress={() => handleStatementPress(statement)}
            >
              <View style={styles.statementHeader}>
                <View style={styles.statementInfo}>
                  <Text style={[styles.statementPeriod, { color: theme.text }]}>{statement.period}</Text>
                  <Text style={[styles.statementDates, { color: theme.textSecondary }]}>
                    {formatDate(statement.startDate)} - {formatDate(statement.endDate)}
                  </Text>
                </View>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusIcon}>{getStatusIcon(statement.status)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statement.status) }]}>
                    <Text style={styles.statusText}>{statement.status}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statementStats}>
                <View style={styles.statementStat}>
                  <Text style={[styles.statementStatLabel, { color: theme.textSecondary }]}>Total Spend</Text>
                  <Text style={[styles.statementStatValue, { color: theme.text }]}>{statement.totalSpend}</Text>
                </View>
                {card.type === 'credit' && statement.minimumPayment && (
                  <View style={styles.statementStat}>
                    <Text style={[styles.statementStatLabel, { color: theme.textSecondary }]}>Min Payment</Text>
                    <Text style={[styles.statementStatValue, { color: theme.text }]}>{statement.minimumPayment}</Text>
                  </View>
                )}
                <View style={styles.statementStat}>
                  <Text style={[styles.statementStatLabel, { color: theme.textSecondary }]}>Transactions</Text>
                  <Text style={[styles.statementStatValue, { color: theme.text }]}>{statement.transactions}</Text>
                </View>
              </View>

              <View style={styles.statementFooter}>
                <Text style={[styles.statementFooterText, { color: theme.textSecondary }]}>
                  {card.type === 'credit' && statement.dueDate
                    ? (statement.status === 'Paid' 
                        ? `Paid on ${formatDate(statement.paymentDate)}`
                        : `Due: ${formatDate(statement.dueDate)}`)
                    : `Statement Period: ${statement.period}`
                  }
                </Text>
                <View style={styles.downloadButtons}>
                  <TouchableOpacity 
                    style={[styles.downloadButton, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => handleDownloadPDF(statement)}
                  >
                    <Text style={[styles.downloadText, { color: theme.primary }]}>📄 PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.downloadButton, { backgroundColor: '#10b981' + '20' }]}
                    onPress={() => handleDownloadCSV(statement)}
                  >
                    <Text style={[styles.downloadText, { color: '#10b981' }]}>📊 CSV</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {statements.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.emptyStateEmoji}>📄</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Statements</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No previous statements available for this card.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Transaction Details Modal */}
      <Modal
        visible={transactionDetailsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setTransactionDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Transaction Details</Text>
              <TouchableOpacity onPress={() => setTransactionDetailsModalVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Description</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedTransaction.description || 'Transaction'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Amount</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: selectedTransaction.amount?.startsWith('-') ? '#ef4444' : '#10b981' }
                  ]}>
                    {selectedTransaction.amount}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Category</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {selectedTransaction.category || 'Other'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Date</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {new Date(selectedTransaction.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                </View>

                {Array.isArray(selectedTransaction.attachments) && selectedTransaction.attachments.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Attachments</Text>
                    {selectedTransaction.attachments.map((att, idx) => (
                      <TouchableOpacity key={idx} onPress={() => Linking.openURL(att.url)}>
                        <Text style={[styles.detailValue, { color: theme.primary }]}>{att.name || `Attachment ${idx+1}`}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteTransaction}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleEditTransaction}
              >
                <Text style={styles.modalButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category Filter */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                      filterCategory === 'All' && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => setFilterCategory('All')}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      { color: theme.textSecondary },
                      filterCategory === 'All' && { color: '#ffffff' }
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categoryOptions.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                        filterCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => setFilterCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        { color: theme.textSecondary },
                        filterCategory === cat && { color: '#ffffff' }
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date Range Filter */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Date Range</Text>
                <View style={styles.dateRangeButtons}>
                  {['All', '7days', '30days', '90days', 'Custom'].map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.dateRangeButton,
                        { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                        filterDateRange === range && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => setFilterDateRange(range)}
                    >
                      <Text style={[
                        styles.dateRangeButtonText,
                        { color: theme.textSecondary },
                        filterDateRange === range && { color: '#ffffff' }
                      ]}>
                        {range === '7days' ? 'Last 7 Days' :
                         range === '30days' ? 'Last 30 Days' :
                         range === '90days' ? 'Last 90 Days' :
                         range}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Date Range */}
              {filterDateRange === 'Custom' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Custom Date Range</Text>
                  <View style={styles.customDateRow}>
                    <View style={styles.customDateField}>
                      <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>From</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.textSecondary}
                        value={customStartDate}
                        onChangeText={setCustomStartDate}
                      />
                    </View>
                    <View style={styles.customDateField}>
                      <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>To</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={theme.textSecondary}
                        value={customEndDate}
                        onChangeText={setCustomEndDate}
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]}
                onPress={handleClearFilters}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.submitButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        visible={editTransactionModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditTransactionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Transaction</Text>
              <TouchableOpacity onPress={() => setEditTransactionModalVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Amount (£)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textSecondary}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="Transaction description"
                  placeholderTextColor={theme.textSecondary}
                  value={editDescription}
                  onChangeText={setEditDescription}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categoryOptions.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' },
                        editCategory === cat && { backgroundColor: theme.primary, borderColor: theme.primary }
                      ]}
                      onPress={() => setEditCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        { color: theme.textSecondary },
                        editCategory === cat && { color: '#ffffff' }
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text, borderColor: theme.textSecondary + '30' }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  value={editDate}
                  onChangeText={setEditDate}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.background[0] }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]}
                onPress={() => setEditTransactionModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.background[0], borderWidth: 1, borderColor: theme.textSecondary + '30' }]}
                onPress={handleAttachReceipt}
              >
                <Text style={[styles.submitButtonText, { color: theme.text }]}>Attach Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary, marginTop: 10 }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.submitButtonText}>Save Changes</Text>
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
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 60,
  },
  cardInfo: {
    alignItems: 'center',
  },
  cardText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  bankText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  currentCycleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 2px 8px rgba(0, 0, 0, 0.05)' : undefined,
  },
  statementCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 1px 4px rgba(0, 0, 0, 0.05)' : undefined,
  },
  statementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statementInfo: {
    flex: 1,
  },
  statementPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  statementDates: {
    fontSize: 14,
    color: '#718096',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: {
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  statementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statementStat: {
    flex: 1,
    alignItems: 'center',
  },
  statementStatLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  statementStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
  },
  statementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc',
  },
  statementFooterText: {
    fontSize: 12,
    color: '#718096',
  },
  downloadButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  downloadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 1px 4px rgba(0, 0, 0, 0.05)' : undefined,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  transactionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#718096',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
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
  detailRow: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 6,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1a202c',
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a202c',
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a202c',
  },
  clearIcon: {
    fontSize: 20,
    padding: 4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeFilterClose: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateRangeButtons: {
    gap: 8,
  },
  dateRangeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  dateRangeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  customDateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customDateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
});
