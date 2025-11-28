import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useCharts } from '../contexts/ChartContext';
import MobileMenu from '../components/MobileMenu';
import ProfileButton from '../components/ProfileButton';
import DirectDebitAlerts from '../components/DirectDebitAlerts';
import AIAssistant from '../components/AIAssistant';
import FirebaseService from '../services/FirebaseService';
import AnalyticsService from '../services/AnalyticsService';
import GlobalSearch from '../components/GlobalSearch';
import { validateTransaction, validateTransfer, showValidationError } from '../utils/ValidationUtils';
import { useCustomAlert } from '../contexts/AlertContext';

export default function DashboardScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { currency, formatAmount, openCurrencySettings } = useCurrency();
  const { getChartData } = useCharts();
  const { showAlert } = useCustomAlert();
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  
  // Quick Actions Menu State
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  
  // Transaction Modals State
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form states for transactions
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    category: '',
    description: '',
    card: '',
    date: new Date().toISOString()
  });
  
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    source: '',
    description: '',
    account: '',
    date: new Date().toISOString()
  });
  
  const [refundForm, setRefundForm] = useState({
    amount: '',
    originalTransaction: '',
    reason: '',
    card: '',
    date: new Date().toISOString()
  });
  const [processingRefund, setProcessingRefund] = useState(false);
  
  const [transferForm, setTransferForm] = useState({
    amount: '',
    fromAccount: '',
    toAccount: '',
    note: '',
    date: new Date().toISOString(),
    transferType: 'internal', // 'internal', 'incoming', 'outgoing'
    externalSource: '', // For incoming transfers
    externalDestination: '' // For outgoing transfers
  });
  
  // User's cards for card selector
  const [userCards, setUserCards] = useState([]);
  
  // User's transactions for refund modal
  const [userTransactions, setUserTransactions] = useState([]);
  
  // User's direct debits for upcoming bills
  const [userDirectDebits, setUserDirectDebits] = useState([]);
  
  // User's goals for goals widget
  const [userGoals, setUserGoals] = useState([]);
  
  // User's savings accounts
  const [userSavingsAccounts, setUserSavingsAccounts] = useState([]);
  
  // User budgets
  const [userBudgets, setUserBudgets] = useState([]);
  
  // Notifications state
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Insights and analytics state
  const [spendingInsights, setSpendingInsights] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  
  // User rank state
  const [userRank, setUserRank] = useState(null);
  const [userBadges, setUserBadges] = useState([]);
  
  // Calculate monthly stats
  const getMonthlyStats = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyTransactions = userTransactions.filter(t => {
      if (!t) return false;
      
      let date;
      if (t.date) {
        date = new Date(t.date);
      } else if (t.createdAt) {
        date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      } else {
        return false;
      }
      
      return !isNaN(date.getTime()) && date >= startOfMonth;
    });
    
    const income = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
    
    const spent = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
    
    return { income, spent, saved: income - spent };
  };
  
  const monthlyStats = getMonthlyStats();
  
  // Get upcoming bills (next 7 days)
  const getUpcomingBills = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return userDirectDebits.filter(dd => {
      if (!dd.nextDate || dd.status !== 'Active') {
        return false;
      }
      
      const nextDate = dd.nextDate?.toDate ? dd.nextDate.toDate() : new Date(dd.nextDate);
      nextDate.setHours(0, 0, 0, 0); // Start of day for comparison
      
      return nextDate >= now && nextDate <= weekFromNow;
    }).slice(0, 3);
  };
  
  const upcomingBills = getUpcomingBills();

  // Get category emoji for bills
  const getCategoryEmoji = (category) => {
    const categoryMap = {
      'Credit Card': '💳',
      'Entertainment': '🎬', 
      'Utilities': '⚡',
      'Health & Fitness': '🏥',
      'Transport': '🚗',
      'Insurance': '🛡️',
      'Subscriptions': '📱',
      'Education': '📚',
      'Charity': '❤️',
      'Mortgage/Rent': '🏠',
      'Loans': '💰',
      'Childcare': '👶',
      'Professional Services': '💼',
      'Government/Tax': '🏛️',
      'Other': '📄'
    };
    return categoryMap[category] || '📄';
  };

  // Calculate total balance across all accounts
  const getTotalBalance = () => {
    const debitBalance = userCards
      .filter(c => c.type === 'debit')
      .reduce((sum, c) => sum + (c.balance || 0), 0);
    
    const savingsBalance = userSavingsAccounts
      .reduce((sum, a) => sum + parseFloat(String(a.balance).replace(/[^0-9.-]/g, '') || 0), 0);
    
    // Credit cards show amount owed (negative)
    const creditOwed = userCards
      .filter(c => c.type === 'credit')
      .reduce((sum, c) => sum + (c.balance || 0), 0);
    
    return {
      total: debitBalance + savingsBalance - creditOwed,
      debit: debitBalance,
      savings: savingsBalance,
      creditOwed: creditOwed
    };
  };
  
  const balances = getTotalBalance();
  
  // Calculate credit utilization
  const getCreditUtilization = () => {
    const creditCards = userCards.filter(c => c.type === 'credit');
    if (creditCards.length === 0) return { percentage: 0, used: 0, limit: 0 };
    
    const totalUsed = creditCards.reduce((sum, c) => sum + (c.balance || 0), 0);
    const totalLimit = creditCards.reduce((sum, c) => sum + (c.limit || 0), 0);
    
    return {
      percentage: totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0,
      used: totalUsed,
      limit: totalLimit
    };
  };
  
  const creditUtil = getCreditUtilization();
  
  // Calculate month-over-month comparison
  const getMonthComparison = () => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthSpent = userTransactions
      .filter(t => {
        if (!t) return false;
        
        let date;
        if (t.date) {
          date = new Date(t.date);
        } else if (t.createdAt) {
          date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        } else {
          return false;
        }
        
        return !isNaN(date.getTime()) && date >= startOfThisMonth && t.type === 'expense';
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
    
    const lastMonthSpent = userTransactions
      .filter(t => {
        if (!t) return false;
        
        let date;
        if (t.date) {
          date = new Date(t.date);
        } else if (t.createdAt) {
          date = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        } else {
          return false;
        }
        
        return !isNaN(date.getTime()) && date >= startOfLastMonth && date <= endOfLastMonth && t.type === 'expense';
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
    
    const difference = thisMonthSpent - lastMonthSpent;
    const percentChange = lastMonthSpent > 0 ? ((difference / lastMonthSpent) * 100) : 0;
    
    // Round to avoid floating point issues (consider < 1% as flat)
    const roundedPercent = Math.abs(percentChange) < 1 ? 0 : Math.round(percentChange);
    
    return {
      thisMonth: thisMonthSpent,
      lastMonth: lastMonthSpent,
      difference,
      percentChange,
      isUp: roundedPercent > 0,
      isFlat: roundedPercent === 0,
      isDown: roundedPercent < 0
    };
  };
  
  const monthComparison = getMonthComparison();
  
  // Get active goals with progress
  const getActiveGoals = () => {
    return userGoals
      .filter(g => g.status === 'active')
      .map(g => ({
        ...g,
        progress: Math.min((g.currentAmount / g.targetAmount) * 100, 100)
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  };
  
  const activeGoals = getActiveGoals();
  
  // Generate spending insights
  const generateSpendingInsights = () => {
    const insights = [];
    const monthlyStats = getMonthlyStats();
    const now = new Date();
    
    // Top spending category insight
    const categoryTotals = {};
    userTransactions.forEach(t => {
      if (t.category && t.amount) {
        const amount = Math.abs(parseFloat(t.amount.replace(/[^0-9.-]/g, '')));
        if (!isNaN(amount) && t.amount.startsWith('-')) {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amount;
        }
      }
    });
    
    const topCategory = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory) {
      insights.push({
        id: 'top-category',
        type: 'spending',
        icon: '📊',
        title: 'Top Spending Category',
        message: `You've spent £${topCategory[1].toFixed(2)} on ${topCategory[0]} this month`,
        color: '#3b82f6'
      });
    }
    
    // Weekly spending trend
    const weeklySpending = getWeeklySpending();
    if (weeklySpending.trend !== 'stable') {
      insights.push({
        id: 'weekly-trend',
        type: 'trend',
        icon: weeklySpending.trend === 'up' ? '📈' : '📉',
        title: 'Weekly Spending Trend',
        message: `Your spending is ${weeklySpending.trend === 'up' ? 'increasing' : 'decreasing'} by ${weeklySpending.percentage}% this week`,
        color: weeklySpending.trend === 'up' ? '#ef4444' : '#10b981'
      });
    }
    
    // Savings opportunity
    if (monthlyStats.income > monthlyStats.spent) {
      const savingsOpportunity = monthlyStats.income - monthlyStats.spent;
      insights.push({
        id: 'savings-opportunity',
        type: 'savings',
        icon: '💰',
        title: 'Savings Opportunity',
        message: `You could save an extra £${savingsOpportunity.toFixed(2)} this month`,
        color: '#10b981'
      });
    }
    
    return insights.slice(0, 3); // Show top 3 insights
  };
  
  // Get weekly spending trend
  const getWeeklySpending = () => {
    const now = new Date();
    const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(thisWeekStart.getTime() - 1);
    
    const thisWeekSpending = userTransactions
      .filter(t => {
        const date = new Date(t.date);
        return date >= thisWeekStart && t.amount?.startsWith('-');
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.replace(/[^0-9.-]/g, ''))), 0);
    
    const lastWeekSpending = userTransactions
      .filter(t => {
        const date = new Date(t.date);
        return date >= lastWeekStart && date <= lastWeekEnd && t.amount?.startsWith('-');
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.replace(/[^0-9.-]/g, ''))), 0);
    
    if (lastWeekSpending === 0) return { trend: 'stable', percentage: 0 };
    
    const percentageChange = ((thisWeekSpending - lastWeekSpending) / lastWeekSpending) * 100;
    
    if (Math.abs(percentageChange) < 5) return { trend: 'stable', percentage: 0 };
    
    return {
      trend: percentageChange > 0 ? 'up' : 'down',
      percentage: Math.abs(percentageChange).toFixed(1)
    };
  };
  
  // Generate budget alerts from userBudgets and this month's transactions
  const generateBudgetAlerts = () => {
    if (!userBudgets || userBudgets.length === 0) return [];
    const alerts = [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthTx = userTransactions.filter(t => {
      if (!t?.date) return false;
      const d = new Date(t.date);
      return !isNaN(d) && d >= startOfMonth;
    });

    userBudgets.forEach(b => {
      const budgetAmount = Number(b.amount) || 0;
      if (budgetAmount <= 0) return;
      const threshold = Number(b.threshold ?? 80);
      const spent = monthTx
        .filter(t => t.category === b.category && String(t.amount || '').startsWith('-'))
        .reduce((sum, t) => sum + Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0), 0);
      const pct = (spent / budgetAmount) * 100;
      if (pct >= threshold) {
        alerts.push({
          id: `budget-${b.id || b.category}`,
          category: b.category,
          spent,
          budget: budgetAmount,
          percentage: pct.toFixed(0),
          severity: pct >= 100 ? 'high' : 'medium'
        });
      }
    });
    return alerts;
  };
  
  // Update insights when transactions change
  useEffect(() => {
    if (userTransactions.length > 0) {
      setSpendingInsights(generateSpendingInsights());
      setBudgetAlerts(generateBudgetAlerts());
    }
  }, [userTransactions]);

  // Track screen view
  useEffect(() => {
    AnalyticsService.trackScreen('Dashboard');
  }, []);

  // Auto-hide tooltip after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);
  
  // Subscribe to notifications for unread count
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToNotifications(user.uid, (notifications) => {
        const unread = notifications.filter(n => !n.read).length;
        setUnreadNotifications(unread);
      });
      
      return unsubscribe;
    }
  }, [user]);

  // Load cards and transactions when component mounts
  React.useEffect(() => {
    // Load user's cards and transactions for forms
    if (user?.uid) {
      const cardsUnsubscribe = FirebaseService.subscribeToUserCards(
        user.uid,
        (cards) => {
          setUserCards(cards);
          // Auto-select first card if available
          if (cards.length > 0 && !transactionForm.card) {
            setTransactionForm(prev => ({ ...prev, card: cards[0].id }));
          }
        }
      );
      
      const transactionsUnsubscribe = FirebaseService.subscribeToUserTransactions(
        user.uid,
        (transactions) => {
          setUserTransactions(transactions);
        }
      );
      
      const directDebitsUnsubscribe = FirebaseService.subscribeToUserDirectDebits(
        user.uid,
        (debits) => {
          setUserDirectDebits(debits);
        }
      );
      
      const goalsUnsubscribe = FirebaseService.subscribeToUserGoals(
        user.uid,
        (goals) => {
          setUserGoals(goals);
        }
      );
      
      const savingsUnsubscribe = FirebaseService.subscribeToUserSavingsAccounts(
        user.uid,
        (accounts) => {
          setUserSavingsAccounts(accounts);
        }
      );

      // Load user rank and badges
      loadUserRankAndBadges();

      return () => {
        cardsUnsubscribe();
        transactionsUnsubscribe();
        directDebitsUnsubscribe();
        goalsUnsubscribe();
        savingsUnsubscribe();
      };
    }
  }, [user]);

  // Load user rank and badges
  const loadUserRankAndBadges = async () => {
    if (!user?.uid) return;
    
    try {
      // Get user's rank from leaderboard
      const leaderboardResult = await FirebaseService.getLeaderboard('points');
      if (leaderboardResult.success) {
        const userIndex = leaderboardResult.data.findIndex(item => item.userId === user.uid);
        setUserRank(userIndex >= 0 ? userIndex + 1 : null);
      }
      
      // Get user's badges
      const badgesResult = await FirebaseService.getUserBadges(user.uid);
      if (badgesResult.success) {
        setUserBadges(badgesResult.data.earned || []);
      }
    } catch (error) {
      console.error('Error loading user rank and badges:', error);
    }
  };

  // Get user's highest badge for display
  const getUserHighestBadge = () => {
    if (userBadges.length === 0) return null;
    
    // Badge definitions with points (simplified for dashboard)
    const badgePoints = {
      'monthly_saver_king': 500,
      'monthly_tip_master': 400,
      'monthly_community_star': 450,
      'quarterly_champion': 1000,
      'savings_milestone_10k': 2500,
      'savings_milestone_5k': 1200,
      'savings_milestone_1k': 500,
      'money_tracker': 300,
      'helpful_hero': 500,
      'tip_titan': 1200,
      'week_warrior': 400,
      'first_steps': 150
    };
    
    // Find highest point badge
    let highestBadge = null;
    let highestPoints = 0;
    
    userBadges.forEach(badgeId => {
      const points = badgePoints[badgeId] || 0;
      if (points > highestPoints) {
        highestPoints = points;
        highestBadge = badgeId;
      }
    });
    
    // Return badge emoji
    const badgeEmojis = {
      'monthly_saver_king': '👑',
      'monthly_tip_master': '🏆',
      'monthly_community_star': '⭐',
      'quarterly_champion': '🥇',
      'savings_milestone_10k': '🏦',
      'savings_milestone_5k': '💎',
      'savings_milestone_1k': '💰',
      'money_tracker': '📊',
      'helpful_hero': '🦸',
      'tip_titan': '🏅',
      'week_warrior': '📅',
      'first_steps': '👣'
    };
    
    return badgeEmojis[highestBadge] || null;
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const closeMenu = () => {
    setMenuVisible(false);
  };

  // Transaction submit handlers
  const handleAddExpense = async () => {
    // Validate required fields
    if (!transactionForm.amount || !transactionForm.category) {
      showAlert('Missing Information', 'Please fill in all required fields (amount and category).');
      return;
    }

    // Comprehensive validation using ValidationUtils
    const validation = validateTransaction({
      amount: transactionForm.amount,
      cardId: transactionForm.card,
      userCards: userCards,
      currency: currency.symbol,
      transactionType: 'expense'
    });

    // Show error if validation failed
    if (!validation.valid) {
      showAlert(validation.title, validation.message);
      return;
    }

    try {
      const { card: selectedCard, amount: expenseAmount } = validation;
      
      const transactionData = {
        type: 'expense',
        amount: `-${currency.symbol}${transactionForm.amount}`,
        category: transactionForm.category,
        description: transactionForm.description || 'Expense',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        cardId: transactionForm.card,
        cardName: selectedCard ? `${selectedCard.bank} ****${selectedCard.lastFour}` : ''
      };

      if (user?.uid) {
        // Save transaction
        await FirebaseService.addTransaction(user.uid, transactionData);
        
        // Update card balance (decrease for expense)
        if (selectedCard) {
          const newBalance = (selectedCard.balance || 0) - expenseAmount;
          await FirebaseService.updateCard(user.uid, transactionForm.card, { balance: newBalance });
        }
      }

      AnalyticsService.trackAddTransaction('expense', transactionForm.category, expenseAmount);
      Alert.alert('Success', 'Expense added successfully');
      setTransactionModalVisible(false);
      setCategoryDropdownVisible(false);
      setShowDatePicker(false);
      setTransactionForm({ amount: '', category: '', description: '', card: '', date: new Date().toISOString() });
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const handleAddIncome = async () => {
    if (!incomeForm.amount || !incomeForm.source) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!incomeForm.account) {
      Alert.alert('Error', 'Please select an account to deposit to');
      return;
    }

    try {
      const incomeAmount = parseFloat(incomeForm.amount);
      const selectedCard = userCards.find(c => c.id === incomeForm.account);
      
      const transactionData = {
        type: 'income',
        amount: `+${currency.symbol}${incomeForm.amount}`,
        category: incomeForm.source,
        description: incomeForm.description || 'Income',
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        cardId: incomeForm.account,
        cardName: selectedCard ? `${selectedCard.bank} ****${selectedCard.lastFour}` : ''
      };

      if (user?.uid) {
        // Save transaction
        await FirebaseService.addTransaction(user.uid, transactionData);
        
        // Update card balance (increase for income)
        if (selectedCard) {
          const newBalance = (selectedCard.balance || 0) + incomeAmount;
          const updateResult = await FirebaseService.updateCard(user.uid, incomeForm.account, { balance: newBalance });
          if (!updateResult.success) {
            console.error('Failed to update card balance:', updateResult.error);
            Alert.alert('Warning', 'Income transaction recorded, but card balance update failed. Please refresh to see updated balance.');
            return; // Don't show success if balance update failed
          }
        }
      }

      AnalyticsService.trackAddTransaction('income', incomeForm.source, incomeAmount);
      Alert.alert('Success', `Income of ${currency.symbol}${incomeAmount.toLocaleString()} added to ${selectedCard?.bank || 'account'}`);
      setIncomeModalVisible(false);
      setIncomeForm({ amount: '', source: '', description: '', account: '', date: new Date().toISOString() });
    } catch (error) {
      Alert.alert('Error', 'Failed to add income');
    }
  };

  const handleAddRefund = async () => {
    // Prevent double submission
    if (processingRefund) return;
    
    if (!refundForm.originalTransaction) {
      Alert.alert('Error', 'Please select the original transaction to refund');
      return;
    }
    if (!refundForm.amount) {
      Alert.alert('Error', 'Please enter refund amount');
      return;
    }
    if (!refundForm.card) {
      Alert.alert('Error', 'Please select a transaction first');
      return;
    }

    setProcessingRefund(true);
    try {
      const refundAmount = parseFloat(refundForm.amount);
      
      // Find the original transaction - get fresh data to check current refund status
      const originalTransaction = userTransactions.find(t => t.id === refundForm.originalTransaction);
      if (!originalTransaction) {
        Alert.alert('Error', 'Original transaction not found');
        setProcessingRefund(false);
        return;
      }
      
      // Check if transaction was already fully refunded
      if (originalTransaction.refundedAmount && originalTransaction.refundedAmount >= Math.abs(parseFloat(originalTransaction.amount.replace(/[^0-9.-]/g, '')))) {
        Alert.alert('Error', 'This transaction has already been fully refunded');
        setProcessingRefund(false);
        return;
      }
      
      // Calculate max refundable amount (original amount minus already refunded)
      const originalAmount = Math.abs(parseFloat(originalTransaction.amount.replace(/[^0-9.-]/g, '')));
      const alreadyRefunded = originalTransaction.refundedAmount || 0;
      const maxRefundable = originalAmount - alreadyRefunded;
      
      if (refundAmount > maxRefundable) {
        Alert.alert('Error', `Refund amount cannot exceed ${currency.symbol}${maxRefundable.toFixed(2)} (remaining refundable amount)`);
        setProcessingRefund(false);
        return;
      }
      
      if (refundAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid refund amount');
        setProcessingRefund(false);
        return;
      }
      
      const selectedCard = userCards.find(c => c.id === refundForm.card);
      
      const transactionData = {
        type: 'refund',
        amount: `+${currency.symbol}${refundForm.amount}`,
        category: 'Refund',
        description: refundForm.reason || `Refund for: ${originalTransaction.description || originalTransaction.category}`,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        cardId: refundForm.card,
        cardName: selectedCard ? `${selectedCard.bank} ****${selectedCard.lastFour}` : '',
        originalTransactionId: refundForm.originalTransaction
      };

      if (user?.uid) {
        // Save refund transaction
        await FirebaseService.addTransaction(user.uid, transactionData);
        
        // Update card balance (increase for refund)
        if (selectedCard) {
          const newBalance = (selectedCard.balance || 0) + refundAmount;
          await FirebaseService.updateCard(user.uid, refundForm.card, { balance: newBalance });
        }
        
        // Mark original transaction as (partially) refunded
        const newRefundedAmount = alreadyRefunded + refundAmount;
        await FirebaseService.updateTransaction(user.uid, refundForm.originalTransaction, { 
          refundedAmount: newRefundedAmount,
          refundStatus: newRefundedAmount >= originalAmount ? 'fully_refunded' : 'partially_refunded'
        });
      }

      Alert.alert('Success', 'Refund processed successfully');
      setRefundModalVisible(false);
      setRefundForm({ amount: '', originalTransaction: '', reason: '', card: '', date: new Date().toISOString() });
    } catch (error) {
      Alert.alert('Error', 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleAddTransfer = async () => {
    // Comprehensive transfer validation
    const validation = validateTransfer({
      amount: transferForm.amount,
      fromCardId: transferForm.fromAccount,
      toCardId: transferForm.toAccount,
      userCards: userCards,
      currency: currency.symbol
    });

    // Show error if validation failed
    if (!validation.valid) {
      showAlert(validation.title, validation.message);
      return;
    }

    try {
      const { fromCard, toCard, amount: transferAmount } = validation;
      
      const transactionData = {
        type: 'transfer',
        amount: `${currency.symbol}${transferForm.amount}`,
        category: 'Transfer',
        description: transferForm.note || `Transfer to ${toCard?.bank || 'account'}`,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        fromCardId: transferForm.fromAccount,
        toCardId: transferForm.toAccount,
        fromCardName: fromCard ? `${fromCard.bank} ****${fromCard.lastFour}` : '',
        toCardName: toCard ? `${toCard.bank} ****${toCard.lastFour}` : ''
      };

      if (user?.uid) {
        // Save transaction
        await FirebaseService.addTransaction(user.uid, transactionData);
        
        // Update source card balance (decrease)
        if (fromCard) {
          const newFromBalance = (fromCard.balance || 0) - transferAmount;
          await FirebaseService.updateCard(user.uid, transferForm.fromAccount, { balance: newFromBalance });
        }
        
        // Update destination card balance (increase)
        if (toCard) {
          const newToBalance = (toCard.balance || 0) + transferAmount;
          await FirebaseService.updateCard(user.uid, transferForm.toAccount, { balance: newToBalance });
        }
      }

      Alert.alert('Success', 'Transfer completed successfully');
      setTransferModalVisible(false);
      setTransferForm({ amount: '', fromAccount: '', toAccount: '', note: '', date: new Date().toISOString() });
    } catch (error) {
      Alert.alert('Error', 'Failed to complete transfer');
    }
  };

  return (
    <LinearGradient
      colors={theme.background}
      style={styles.container}
    >
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButtonAbsolute} onPress={toggleMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenterAbsolute}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{(user?.profile?.name || user?.name || 'User').split(' ')[0]}</Text>
              {userRank && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{userRank}</Text>
                </View>
              )}
              {getUserHighestBadge() && (
                <Text style={styles.userBadgeEmoji}>{getUserHighestBadge()}</Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.currencyIndicator}
              onPress={openCurrencySettings}
            >
              <Text style={styles.currencyText}>{currency.flag || '💰'} {currency.code}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerIconsAbsolute}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setSearchVisible(true)}
            >
              <Text style={styles.notificationIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('NotificationCenter')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Action Button */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.aiButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={() => {
              AnalyticsService.trackAIAssistantOpened();
              setAiAssistantVisible(true);
            }}
          >
            <Text style={styles.actionButtonIcon}>🤖</Text>
            <Text style={[styles.actionButtonText, { color: '#ffffff' }]}>AI Assistant</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content area - menu will overlay this */}
      <View style={styles.contentArea}>
        <MobileMenu 
          visible={menuVisible}
          onClose={closeMenu}
          navigation={navigation}
          currentScreen="Dashboard"
        />
        
        <ScrollView style={[styles.dashboardContent, { backgroundColor: 'transparent' }]} showsVerticalScrollIndicator={false}>
          
          {/* Direct Debit Alerts */}
          <DirectDebitAlerts />
          
          {/* Monthly Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Income</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                +{currency.symbol}{monthlyStats.income.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.statIcon}>💸</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Spent</Text>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>
                -{currency.symbol}{monthlyStats.spent.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.statIcon}>📈</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Saved</Text>
              <Text style={[styles.statValue, { color: monthlyStats.saved >= 0 ? '#10b981' : '#ef4444' }]}>
                {monthlyStats.saved >= 0 ? '+' : ''}{currency.symbol}{monthlyStats.saved.toFixed(2)}
              </Text>
            </View>
          </View>
          
          {/* Total Balance Card */}
          <TouchableOpacity 
            style={[styles.balanceCard, { backgroundColor: theme.cardBg }]}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={styles.balanceHeader}>
              <View>
                <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Total Balance</Text>
                <Text style={[styles.balanceAmount, { color: theme.text }]}>
                  {currency.symbol}{balances.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                {(userCards.length > 0 || userSavingsAccounts.length > 0) && (
                  <Text style={[styles.balanceAccountCount, { color: theme.textSecondary }]}>
                    {[
                      userCards.filter(c => c.type === 'debit').length > 0 ? `${userCards.filter(c => c.type === 'debit').length} debit` : null,
                      userCards.filter(c => c.type === 'credit').length > 0 ? `${userCards.filter(c => c.type === 'credit').length} credit` : null,
                      userSavingsAccounts.length > 0 ? `${userSavingsAccounts.length} savings` : null
                    ].filter(Boolean).join(' • ')}
                  </Text>
                )}
              </View>
              <View style={[styles.balanceIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Text style={styles.balanceIcon}>💳</Text>
              </View>
            </View>
            <View style={styles.balanceBreakdown}>
              <View style={styles.balanceItem}>
                <Text style={[styles.balanceItemLabel, { color: theme.textSecondary }]}>
                  {userCards.filter(c => c.type === 'debit').length > 1 ? `Debit (${userCards.filter(c => c.type === 'debit').length})` : 'Debit'}
                </Text>
                <Text style={[styles.balanceItemValue, { color: '#10b981' }]}>
                  {currency.symbol}{balances.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.balanceDivider, { backgroundColor: theme.textSecondary + '30' }]} />
              <View style={styles.balanceItem}>
                <Text style={[styles.balanceItemLabel, { color: theme.textSecondary }]}>
                  {userSavingsAccounts.length > 1 ? `Savings (${userSavingsAccounts.length})` : 'Savings'}
                </Text>
                <Text style={[styles.balanceItemValue, { color: '#06b6d4' }]}>
                  {currency.symbol}{balances.savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.balanceDivider, { backgroundColor: theme.textSecondary + '30' }]} />
              <View style={styles.balanceItem}>
                <Text style={[styles.balanceItemLabel, { color: theme.textSecondary }]}>
                  {userCards.filter(c => c.type === 'credit').length > 1 ? `Credit (${userCards.filter(c => c.type === 'credit').length})` : 'Credit'}
                </Text>
                <Text style={[styles.balanceItemValue, { color: '#ef4444' }]}>
                  {currency.symbol}{balances.creditOwed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Credit Utilization & Month Comparison Row */}
          <View style={styles.miniCardsRow}>
            {/* Credit Utilization - Shows per card if multiple */}
            <TouchableOpacity 
              style={[styles.miniCard, { backgroundColor: theme.cardBg }]}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={[styles.miniCardTitle, { color: theme.textSecondary }]}>
                {userCards.filter(c => c.type === 'credit').length > 1 
                  ? `Credit Usage (${userCards.filter(c => c.type === 'credit').length} cards)` 
                  : 'Credit Usage'}
              </Text>
              {userCards.filter(c => c.type === 'credit').length === 0 ? (
                <Text style={[styles.miniCardSubtext, { color: theme.textSecondary, marginTop: 8 }]}>No credit cards</Text>
              ) : userCards.filter(c => c.type === 'credit').length === 1 ? (
                <View>
                  <View style={styles.utilizationContainer}>
                    <View style={[styles.utilizationBar, { backgroundColor: theme.background[0] }]}>
                      <View 
                        style={[
                          styles.utilizationFill, 
                          { 
                            width: `${Math.min(creditUtil.percentage, 100)}%`,
                            backgroundColor: creditUtil.percentage > 70 ? '#ef4444' : creditUtil.percentage > 30 ? '#f59e0b' : '#10b981'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.utilizationText, { 
                      color: creditUtil.percentage > 70 ? '#ef4444' : creditUtil.percentage > 30 ? '#f59e0b' : '#10b981'
                    }]}>
                      {creditUtil.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <Text style={[styles.miniCardSubtext, { color: theme.textSecondary }]}>
                    {currency.symbol}{creditUtil.used.toFixed(0)} / {currency.symbol}{creditUtil.limit.toFixed(0)}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 60 }} showsVerticalScrollIndicator={false}>
                  {userCards.filter(c => c.type === 'credit').slice(0, 3).map((card, idx) => {
                    const cardUtil = card.limit > 0 ? (card.balance / card.limit) * 100 : 0;
                    return (
                      <View key={card.id || idx} style={styles.multiCardUtilRow}>
                        <Text style={[styles.multiCardName, { color: theme.text }]} numberOfLines={1}>
                          {card.name || card.bank}
                        </Text>
                        <Text style={[styles.multiCardPercent, { 
                          color: cardUtil > 70 ? '#ef4444' : cardUtil > 30 ? '#f59e0b' : '#10b981'
                        }]}>
                          {cardUtil.toFixed(0)}%
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </TouchableOpacity>
            
            {/* Month Comparison */}
            <View style={[styles.miniCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.miniCardTitle, { color: theme.textSecondary }]}>vs Last Month</Text>
              <View style={styles.comparisonContainer}>
                <Text style={[styles.comparisonArrow, { 
                  color: monthComparison.isFlat ? theme.textSecondary : 
                         monthComparison.isUp ? '#ef4444' : '#10b981' 
                }]}>
                  {monthComparison.isFlat ? '=' : monthComparison.isUp ? '↑' : '↓'}
                </Text>
                <Text style={[styles.comparisonPercent, { 
                  color: monthComparison.isFlat ? theme.textSecondary : 
                         monthComparison.isUp ? '#ef4444' : '#10b981' 
                }]}>
                  {monthComparison.isFlat ? '0' : Math.abs(monthComparison.percentChange).toFixed(0)}%
                </Text>
              </View>
              <Text style={[styles.miniCardSubtext, { color: theme.textSecondary }]}>
                {monthComparison.isFlat ? 'No change' : monthComparison.isUp ? 'More spending' : 'Less spending'}
              </Text>
            </View>
          </View>
          
          {/* Goals Progress */}
          {activeGoals.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Goals Progress</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
                  <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                </TouchableOpacity>
              </View>
              {activeGoals.map((goal, index) => (
                <View key={goal.id || index} style={styles.goalItem}>
                  <View style={styles.goalHeader}>
                    <Text style={[styles.goalName, { color: theme.text }]} numberOfLines={1}>{goal.name}</Text>
                    <Text style={[styles.goalPercent, { color: theme.primary }]}>{goal.progress.toFixed(0)}%</Text>
                  </View>
                  <View style={[styles.goalProgressBar, { backgroundColor: theme.background[0] }]}>
                    <View 
                      style={[
                        styles.goalProgressFill, 
                        { 
                          width: `${goal.progress}%`,
                          backgroundColor: goal.progress >= 100 ? '#10b981' : theme.primary
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.goalAmounts}>
                    <Text style={[styles.goalAmountText, { color: theme.textSecondary }]}>
                      {currency.symbol}{(goal.currentAmount || 0).toLocaleString()}
                    </Text>
                    <Text style={[styles.goalAmountText, { color: theme.textSecondary }]}>
                      {currency.symbol}{(goal.targetAmount || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Spending Insights */}
          {spendingInsights.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>💡 Spending Insights</Text>
              </View>
              {spendingInsights.map((insight) => (
                <View key={insight.id} style={styles.insightItem}>
                  <View style={styles.insightHeader}>
                    <Text style={styles.insightIcon}>{insight.icon}</Text>
                    <View style={styles.insightContent}>
                      <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
                      <Text style={[styles.insightMessage, { color: theme.textSecondary }]}>{insight.message}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Budget Alerts */}
          {budgetAlerts.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>⚠️ Budget Alerts</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>📊 Reports</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Budget')}>
                    <Text style={[styles.seeAllText, { color: theme.primary }]}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {budgetAlerts.map((alert) => (
                <View key={alert.id} style={[
                  styles.budgetAlert,
                  { backgroundColor: alert.severity === 'high' ? '#fef2f2' : '#fffbeb' }
                ]}>
                  <View style={styles.budgetAlertHeader}>
                    <Text style={styles.budgetAlertIcon}>
                      {alert.severity === 'high' ? '🚨' : '⚠️'}
                    </Text>
                    <View style={styles.budgetAlertContent}>
                      <Text style={[styles.budgetAlertTitle, { color: theme.text }]}>
                        {alert.category} Budget
                      </Text>
                      <Text style={[styles.budgetAlertMessage, { color: theme.textSecondary }]}>
                        £{alert.spent.toFixed(2)} of £{alert.budget} spent ({alert.percentage}%)
                      </Text>
                    </View>
                    <View style={[
                      styles.budgetAlertBadge,
                      { backgroundColor: alert.severity === 'high' ? '#ef4444' : '#f59e0b' }
                    ]}>
                      <Text style={styles.budgetAlertBadgeText}>{alert.percentage}%</Text>
                    </View>
                  </View>
                  <View style={[styles.budgetProgressBar, { backgroundColor: '#f3f4f6' }]}>
                    <View 
                      style={[
                        styles.budgetProgressFill,
                        { 
                          width: `${Math.min(alert.percentage, 100)}%`,
                          backgroundColor: alert.severity === 'high' ? '#ef4444' : '#f59e0b'
                        }
                      ]} 
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {/* Recent Transactions */}
          <View style={[styles.sectionCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Statements')}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {userTransactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No transactions yet</Text>
            ) : (
              userTransactions.slice(0, 5).map((transaction, index) => {
                const isPositive = transaction.type === 'income' || transaction.type === 'refund';
                const icon = transaction.type === 'income' ? '💵' : 
                             transaction.type === 'refund' ? '↩️' : 
                             transaction.type === 'transfer' ? '↔️' :
                             transaction.category?.split(' ')[0] || '💳';
                const linkedCard = userCards.find(c => c.id === transaction.cardId);
                return (
                  <View key={transaction.id || index} style={[styles.transactionItem, { borderBottomColor: theme.background[0] }]}>
                    <View style={styles.transactionLeft}>
                      <View style={[styles.transactionIconContainer, { backgroundColor: linkedCard?.color ? linkedCard.color + '20' : theme.primary + '15' }]}>
                        <Text style={styles.transactionIcon}>{icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.transactionTitle, { color: theme.text }]} numberOfLines={1}>
                          {transaction.description || transaction.category || transaction.source || 'Transaction'}
                        </Text>
                        <View style={styles.transactionMetaRow}>
                          <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
                            {transaction.createdAt?.toDate ? 
                              transaction.createdAt.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) :
                              new Date(transaction.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                            }
                          </Text>
                          {transaction.cardName && (
                            <Text style={[styles.transactionCardName, { color: theme.textSecondary }]} numberOfLines={1}>
                              • {transaction.cardName.length > 15 ? transaction.cardName.substring(0, 15) + '...' : transaction.cardName}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={[styles.transactionAmount, { color: isPositive ? '#10b981' : '#ef4444' }]}>
                      {isPositive ? '+' : '-'}{currency.symbol}
                      {Math.abs(parseFloat(String(transaction.amount).replace(/[^0-9.-]/g, '')) || 0).toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
          
        </ScrollView>

      {/* Quick Actions Menu */}
      {quickActionsVisible && (
        <View style={[styles.quickActionsMenu, { backgroundColor: theme.cardBg }]}>
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => {
              setQuickActionsVisible(false);
              setTransactionModalVisible(true);
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.background[0] }]}>
              <Text>💸</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => {
              setQuickActionsVisible(false);
              setIncomeModalVisible(true);
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.background[0] }]}>
              <Text>💰</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Income</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => {
              setQuickActionsVisible(false);
              setRefundModalVisible(true);
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.background[0] }]}>
              <Text>🔄</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Refund</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionItem}
            onPress={() => {
              setQuickActionsVisible(false);
              setTransferModalVisible(true);
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: theme.background[0] }]}>
              <Text>↔️</Text>
            </View>
            <Text style={[styles.quickActionText, { color: theme.text }]}>Transfer</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Floating + Button */}
        <TouchableOpacity 
          style={[styles.floatingButton, quickActionsVisible && styles.floatingButtonActive]}
          onPress={() => {
            setQuickActionsVisible(!quickActionsVisible);
            setShowTooltip(false);
          }}
        >
          <Text style={[styles.floatingButtonText, quickActionsVisible && styles.floatingButtonTextActive]}>
            {quickActionsVisible ? '✕' : '+'}
          </Text>
        </TouchableOpacity>

      {/* Tooltip for FAB */}
      {showTooltip && !quickActionsVisible && (
        <View style={[styles.fabTooltip, { backgroundColor: theme.cardBg, borderColor: theme.primary }]}>
          <Text style={[styles.fabTooltipText, { color: theme.text }]}>
            💸 Add Transaction
          </Text>
          <View style={[styles.fabTooltipArrow, { borderTopColor: theme.cardBg }]} />
        </View>
      )}
      </View>

      <AIAssistant 
        visible={aiAssistantVisible}
        onClose={() => setAiAssistantVisible(false)}
      />

      <GlobalSearch
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        navigation={navigation}
        transactions={userTransactions}
        cards={userCards}
      />

      {/* Transaction Modal (Expense) */}
      <Modal
        visible={transactionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTransactionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => { setTransactionModalVisible(false); setCategoryDropdownVisible(false); setShowDatePicker(false); }}>
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor={theme.textSecondary}
                  value={transactionForm.amount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    const parts = numericText.split('.');
                    const formattedText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
                    setTransactionForm({...transactionForm, amount: formattedText});
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                <TouchableOpacity 
                  style={[styles.dropdown, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]}
                  onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
                >
                  <Text style={[styles.dropdownText, { color: transactionForm.category ? theme.text : theme.textSecondary }]}>
                    {transactionForm.category || 'Select a category'}
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>
                    {categoryDropdownVisible ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {categoryDropdownVisible && (
                  <View style={[styles.dropdownList, { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' }]}>
                    {[
                      { emoji: '🛒', name: 'Groceries' },
                      { emoji: '☕', name: 'Food & Drink' },
                      { emoji: '🚇', name: 'Transport' },
                      { emoji: '🛍️', name: 'Shopping' },
                      { emoji: '🎬', name: 'Entertainment' },
                      { emoji: '📄', name: 'Bills' },
                      { emoji: '🏥', name: 'Health' },
                      { emoji: '🏠', name: 'Home' },
                      { emoji: '💳', name: 'Other' },
                    ].map((cat) => (
                      <TouchableOpacity 
                        key={cat.name}
                        style={[
                          styles.dropdownItem,
                          transactionForm.category === `${cat.emoji} ${cat.name}` && { backgroundColor: theme.primary + '20' }
                        ]}
                        onPress={() => {
                          setTransactionForm({...transactionForm, category: `${cat.emoji} ${cat.name}`});
                          setCategoryDropdownVisible(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, { color: theme.text }]}>
                          {cat.emoji} {cat.name}
                        </Text>
                        {transactionForm.category === `${cat.emoji} ${cat.name}` && (
                          <Text style={{ color: theme.primary }}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder="What was this expense for?"
                  placeholderTextColor={theme.textSecondary}
                  value={transactionForm.description}
                  onChangeText={(text) => setTransactionForm({...transactionForm, description: text})}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Select Card</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {userCards.filter(card => card.type === 'debit' || card.type === 'credit').map((card) => (
                    <TouchableOpacity 
                      key={card.id}
                      style={[
                        styles.categoryChip,
                        { 
                          backgroundColor: transactionForm.card === card.id ? theme.primary : theme.background[0],
                          minWidth: 120
                        }
                      ]}
                      onPress={() => setTransactionForm({...transactionForm, card: card.id})}
                    >
                      <Text style={[styles.categoryText, { color: transactionForm.card === card.id ? '#fff' : theme.text }]}>
                        {card.bank} ****{card.lastFour || card.lastFourDigits}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {userCards.length === 0 && (
                    <Text style={[styles.categoryText, { color: theme.textSecondary }]}>No cards available</Text>
                  )}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                <TouchableOpacity 
                  style={[styles.dropdown, { backgroundColor: theme.background[0], borderColor: theme.textSecondary + '30' }]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Text style={[styles.dropdownText, { color: theme.text }]}>
                    📅 {new Date(transactionForm.date).toLocaleDateString('en-GB', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </Text>
                  <Text style={[styles.dropdownArrow, { color: theme.textSecondary }]}>
                    {showDatePicker ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <View style={[styles.calendarContainer, { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' }]}>
                    {/* Month/Year Header */}
                    <View style={styles.calendarHeader}>
                      <TouchableOpacity onPress={() => {
                        const d = new Date(transactionForm.date);
                        d.setMonth(d.getMonth() - 1);
                        setTransactionForm({...transactionForm, date: d.toISOString()});
                      }}>
                        <Text style={[styles.calendarNav, { color: theme.primary }]}>◀</Text>
                      </TouchableOpacity>
                      <Text style={[styles.calendarTitle, { color: theme.text }]}>
                        {new Date(transactionForm.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </Text>
                      <TouchableOpacity onPress={() => {
                        const d = new Date(transactionForm.date);
                        const today = new Date();
                        d.setMonth(d.getMonth() + 1);
                        if (d <= today) setTransactionForm({...transactionForm, date: d.toISOString()});
                      }}>
                        <Text style={[styles.calendarNav, { color: theme.primary }]}>▶</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Day Names */}
                    <View style={styles.calendarWeekdays}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <Text key={day} style={[styles.calendarWeekday, { color: theme.textSecondary }]}>{day}</Text>
                      ))}
                    </View>
                    
                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                      {(() => {
                        const selectedDate = new Date(transactionForm.date);
                        const year = selectedDate.getFullYear();
                        const month = selectedDate.getMonth();
                        const firstDay = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const today = new Date();
                        const days = [];
                        
                        // Empty cells for days before first of month
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                        }
                        
                        // Days of the month
                        for (let day = 1; day <= daysInMonth; day++) {
                          const date = new Date(year, month, day);
                          const isSelected = selectedDate.getDate() === day;
                          const isFuture = date > today;
                          const isToday = date.toDateString() === today.toDateString();
                          
                          days.push(
                            <TouchableOpacity
                              key={day}
                              style={[
                                styles.calendarDay,
                                isSelected && { backgroundColor: theme.primary },
                                isToday && !isSelected && { borderWidth: 1, borderColor: theme.primary }
                              ]}
                              onPress={() => {
                                if (!isFuture) {
                                  const newDate = new Date(year, month, day);
                                  setTransactionForm({...transactionForm, date: newDate.toISOString()});
                                  setShowDatePicker(false);
                                }
                              }}
                              disabled={isFuture}
                            >
                              <Text style={[
                                styles.calendarDayText,
                                { color: isFuture ? theme.textSecondary + '50' : (isSelected ? '#fff' : theme.text) }
                              ]}>
                                {day}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                        return days;
                      })()}
                    </View>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={handleAddExpense}
              >
                <Text style={styles.submitButtonText}>Add Expense</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Income Modal */}
      <Modal
        visible={incomeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIncomeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Income</Text>
              <TouchableOpacity onPress={() => setIncomeModalVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor={theme.textSecondary}
                  value={incomeForm.amount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    const parts = numericText.split('.');
                    const formattedText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
                    setIncomeForm({...incomeForm, amount: formattedText});
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Source</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {['💼 Salary', '📈 Investment', '🎁 Gift', '💰 Bonus', '🏦 Interest', '💸 Refund', '🎯 Freelance', '🏢 Business'].map((source) => (
                    <TouchableOpacity 
                      key={source} 
                      style={[
                        styles.categoryChip, 
                        { backgroundColor: incomeForm.source === source ? '#10b981' : theme.background[0] }
                      ]}
                      onPress={() => setIncomeForm({...incomeForm, source: source})}
                    >
                      <Text style={[styles.categoryText, { color: incomeForm.source === source ? '#fff' : theme.text }]}>{source}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Description</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder="Income description"
                  placeholderTextColor={theme.textSecondary}
                  value={incomeForm.description}
                  onChangeText={(text) => setIncomeForm({...incomeForm, description: text})}
                  autoCapitalize="sentences"
                  autoCorrect={true}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Deposit To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {userCards.filter(card => card.type === 'debit').map((card) => (
                    <TouchableOpacity 
                      key={card.id}
                      style={[
                        styles.categoryChip,
                        { 
                          backgroundColor: incomeForm.account === card.id ? '#10b981' : theme.background[0],
                          minWidth: 120
                        }
                      ]}
                      onPress={() => setIncomeForm({...incomeForm, account: card.id})}
                    >
                      <Text style={[styles.categoryText, { color: incomeForm.account === card.id ? '#fff' : theme.text }]}>
                        {card.bank} ****{card.lastFour || card.lastFourDigits}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {userCards.filter(card => card.type === 'debit').length === 0 && (
                    <Text style={[styles.categoryText, { color: theme.textSecondary }]}>No debit cards available</Text>
                  )}
                </ScrollView>
              </View>
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: '#10b981' }]}
                onPress={handleAddIncome}
              >
                <Text style={styles.submitButtonText}>Add Income</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Refund Modal */}
      <Modal
        visible={refundModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRefundModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Refund</Text>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Refund Amount</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor={theme.textSecondary}
                  value={refundForm.amount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    const parts = numericText.split('.');
                    const formattedText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
                    setRefundForm({...refundForm, amount: formattedText});
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Original Transaction</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {userTransactions
                    .filter(t => {
                      // Only show expense transactions (negative amounts)
                      if (!t.amount || !t.amount.startsWith('-')) return false;
                      // Exclude fully refunded transactions
                      const originalAmount = Math.abs(parseFloat(t.amount.replace(/[^0-9.-]/g, '')));
                      const refundedAmount = t.refundedAmount || 0;
                      return refundedAmount < originalAmount;
                    })
                    .slice(0, 10)
                    .map((transaction) => {
                      const originalAmount = Math.abs(parseFloat(transaction.amount.replace(/[^0-9.-]/g, '')));
                      const refundedAmount = transaction.refundedAmount || 0;
                      const remainingRefundable = originalAmount - refundedAmount;
                      const isPartiallyRefunded = refundedAmount > 0;
                      
                      return (
                        <TouchableOpacity 
                          key={transaction.id}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: refundForm.originalTransaction === transaction.id ? theme.primary : theme.background[0],
                              minWidth: 150,
                              borderWidth: isPartiallyRefunded ? 1 : 0,
                              borderColor: isPartiallyRefunded ? '#f59e0b' : 'transparent'
                            }
                          ]}
                          onPress={() => setRefundForm({
                            ...refundForm, 
                            originalTransaction: transaction.id,
                            amount: remainingRefundable.toFixed(2),
                            card: transaction.cardId // Auto-select the original card
                          })}
                        >
                          <Text style={[styles.categoryText, { color: refundForm.originalTransaction === transaction.id ? '#fff' : theme.text }]}>
                            {transaction.description || transaction.category} {transaction.amount}
                            {isPartiallyRefunded ? ` (${currency.symbol}${remainingRefundable.toFixed(2)} left)` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  {userTransactions.filter(t => t.amount && t.amount.startsWith('-') && (t.refundStatus !== 'fully_refunded')).length === 0 && (
                    <Text style={[styles.categoryText, { color: theme.textSecondary }]}>No refundable transactions</Text>
                  )}
                </ScrollView>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Refund Reason</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder="Why was this refunded?"
                  placeholderTextColor={theme.textSecondary}
                  value={refundForm.reason}
                  onChangeText={(text) => setRefundForm({...refundForm, reason: text})}
                />
              </View>
              
              {/* Show which card will receive the refund (auto-selected from original transaction) */}
              {refundForm.card && (
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Refund To (same as original)</Text>
                  <View style={[styles.categoryChip, { backgroundColor: '#f59e0b', alignSelf: 'flex-start', minWidth: 150 }]}>
                    <Text style={[styles.categoryText, { color: '#fff' }]}>
                      {userCards.find(c => c.id === refundForm.card)?.bank || 'Card'} ****{userCards.find(c => c.id === refundForm.card)?.lastFour || '****'}
                    </Text>
                  </View>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: processingRefund ? '#9ca3af' : '#f59e0b' }]}
                onPress={handleAddRefund}
                disabled={processingRefund}
              >
                <Text style={styles.submitButtonText}>{processingRefund ? 'Processing...' : 'Process Refund'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        visible={transferModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTransferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Transfer Money</Text>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Transfer Type Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Transfer Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      { backgroundColor: transferForm.transferType === 'internal' ? theme.primary : theme.background[0] }
                    ]}
                    onPress={() => setTransferForm({...transferForm, transferType: 'internal'})}
                  >
                    <Text style={[styles.categoryText, { color: transferForm.transferType === 'internal' ? '#fff' : theme.text }]}>
                      ↔️ Between My Accounts
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      { backgroundColor: transferForm.transferType === 'incoming' ? theme.primary : theme.background[0] }
                    ]}
                    onPress={() => setTransferForm({...transferForm, transferType: 'incoming'})}
                  >
                    <Text style={[styles.categoryText, { color: transferForm.transferType === 'incoming' ? '#fff' : theme.text }]}>
                      ⬇️ Received Money
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      { backgroundColor: transferForm.transferType === 'outgoing' ? theme.primary : theme.background[0] }
                    ]}
                    onPress={() => setTransferForm({...transferForm, transferType: 'outgoing'})}
                  >
                    <Text style={[styles.categoryText, { color: transferForm.transferType === 'outgoing' ? '#fff' : theme.text }]}>
                      ⬆️ Sent Money
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor={theme.textSecondary}
                  value={transferForm.amount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    const parts = numericText.split('.');
                    const formattedText = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericText;
                    setTransferForm({...transferForm, amount: formattedText});
                  }}
                  keyboardType="decimal-pad"
                />
              </View>
              
              {/* Conditional rendering based on transfer type */}
              {transferForm.transferType === 'internal' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>From Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {userCards.filter(card => card.type === 'debit').map((card) => (
                        <TouchableOpacity 
                          key={card.id}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: transferForm.fromAccount === card.id ? theme.primary : theme.background[0],
                              minWidth: 120
                            }
                          ]}
                          onPress={() => setTransferForm({...transferForm, fromAccount: card.id})}
                        >
                          <Text style={[styles.categoryText, { color: transferForm.fromAccount === card.id ? '#fff' : theme.text }]}>
                            {card.bank} ****{card.lastFour || card.lastFourDigits}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.transferArrow}>
                    <Text style={[styles.transferArrowText, { color: theme.primary }]}>↓</Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>To Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {userCards.filter(card => card.type === 'debit' && card.id !== transferForm.fromAccount).map((card) => (
                        <TouchableOpacity 
                          key={card.id}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: transferForm.toAccount === card.id ? theme.primary : theme.background[0],
                              minWidth: 120
                            }
                          ]}
                          onPress={() => setTransferForm({...transferForm, toAccount: card.id})}
                        >
                          <Text style={[styles.categoryText, { color: transferForm.toAccount === card.id ? '#fff' : theme.text }]}>
                            {card.bank} ****{card.lastFour || card.lastFourDigits}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {transferForm.transferType === 'incoming' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>From (External Source)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                      placeholder="e.g., John Smith, PayPal, Bank Transfer"
                      placeholderTextColor={theme.textSecondary}
                      value={transferForm.externalSource}
                      onChangeText={(text) => setTransferForm({...transferForm, externalSource: text})}
                    />
                  </View>
                  
                  <View style={styles.transferArrow}>
                    <Text style={[styles.transferArrowText, { color: theme.primary }]}>↓</Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>To My Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {userCards.filter(card => card.type === 'debit').map((card) => (
                        <TouchableOpacity 
                          key={card.id}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: transferForm.toAccount === card.id ? theme.primary : theme.background[0],
                              minWidth: 120
                            }
                          ]}
                          onPress={() => setTransferForm({...transferForm, toAccount: card.id})}
                        >
                          <Text style={[styles.categoryText, { color: transferForm.toAccount === card.id ? '#fff' : theme.text }]}>
                            {card.bank} ****{card.lastFour || card.lastFourDigits}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {transferForm.transferType === 'outgoing' && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>From My Account</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {userCards.filter(card => card.type === 'debit').map((card) => (
                        <TouchableOpacity 
                          key={card.id}
                          style={[
                            styles.categoryChip,
                            { 
                              backgroundColor: transferForm.fromAccount === card.id ? theme.primary : theme.background[0],
                              minWidth: 120
                            }
                          ]}
                          onPress={() => setTransferForm({...transferForm, fromAccount: card.id})}
                        >
                          <Text style={[styles.categoryText, { color: transferForm.fromAccount === card.id ? '#fff' : theme.text }]}>
                            {card.bank} ****{card.lastFour || card.lastFourDigits}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.transferArrow}>
                    <Text style={[styles.transferArrowText, { color: theme.primary }]}>↓</Text>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: theme.text }]}>To (External Destination)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                      placeholder="e.g., Jane Doe, Venmo, External Bank"
                      placeholderTextColor={theme.textSecondary}
                      value={transferForm.externalDestination}
                      onChangeText={(text) => setTransferForm({...transferForm, externalDestination: text})}
                    />
                  </View>
                </>
              )}
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Note (Optional)</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder="Transfer note"
                  placeholderTextColor={theme.textSecondary}
                  value={transferForm.note}
                  onChangeText={(text) => setTransferForm({...transferForm, note: text})}
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: '#3b82f6' }]}
                onPress={handleAddTransfer}
              >
                <Text style={styles.submitButtonText}>Transfer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    flex: 0,
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 10 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 80,
  },
  menuButtonAbsolute: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 4,
    zIndex: 1,
  },
  headerCenterAbsolute: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconsAbsolute: {
    position: 'absolute',
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  rankBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 16,
  },
  userBadgeEmoji: {
    fontSize: 20,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  currencyIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  currencyText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  chartsSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chartsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartsButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  chartsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  chartsContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  chartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 100, // Space for floating button
  },
  fixedChartContainer: {
    paddingBottom: 100,
  },
  dashboardContent: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
    marginVertical: 20,
  },
  emptyBillsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  addBillButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addBillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionIcon: {
    fontSize: 20,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    maxWidth: 180,
  },
  transactionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionCardName: {
    fontSize: 11,
    marginLeft: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  billLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billName: {
    fontSize: 15,
    fontWeight: '600',
  },
  billDate: {
    fontSize: 12,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  floatingButtonText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
    lineHeight: 32,
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  cardsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  cardPreview: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 12,
  },
  cardType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  cardBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardBank: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  quickActions: {
    padding: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  aiButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.3)',
    borderColor: 'rgba(102, 126, 234, 0.5)',
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  // Quick Actions Menu Styles
  quickActionsMenu: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minWidth: 140,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3748',
  },
  floatingButtonActive: {
    backgroundColor: '#ef4444',
    transform: [{ rotate: '45deg' }],
  },
  floatingButtonTextActive: {
    transform: [{ rotate: '-45deg' }],
  },
  fabTooltip: {
    position: 'absolute',
    bottom: 25,
    right: 90,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 998,
  },
  fabTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  fabTooltipArrow: {
    position: 'absolute',
    right: -8,
    top: '50%',
    marginTop: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    maxHeight: Platform.OS === 'web' ? '80%' : '90%',
    width: Platform.OS === 'web' ? '100%' : 'auto',
    maxWidth: Platform.OS === 'web' ? 480 : 'none',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '600',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryScroll: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 12,
  },
  dropdownList: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  cardSelector: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardSelectorText: {
    fontSize: 16,
  },
  dateSelector: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateSelectorText: {
    fontSize: 16,
  },
  calendarContainer: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarNav: {
    fontSize: 18,
    padding: 8,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarWeekday: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
  },
  transferArrow: {
    alignItems: 'center',
    marginVertical: 10,
  },
  transferArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Total Balance Card Styles
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  balanceAccountCount: {
    fontSize: 11,
    marginTop: 4,
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceIcon: {
    fontSize: 24,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  balanceItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceDivider: {
    width: 1,
    height: 30,
  },
  
  // Mini Cards Row Styles
  miniCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  miniCardTitle: {
    fontSize: 12,
    marginBottom: 8,
  },
  miniCardSubtext: {
    fontSize: 11,
    marginTop: 4,
  },
  
  // Credit Utilization Styles
  utilizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilizationBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 4,
  },
  utilizationText: {
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  
  // Month Comparison Styles
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comparisonArrow: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  comparisonPercent: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Goals Progress Styles
  goalItem: {
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  goalPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalAmountText: {
    fontSize: 12,
  },
  
  // Multi-card credit utilization styles
  multiCardUtilRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  multiCardName: {
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  multiCardPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Bill meta row (shows card info)
  billMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  billCardName: {
    fontSize: 11,
    marginLeft: 4,
    maxWidth: 100,
  },
  // Insights styles
  insightItem: {
    marginBottom: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  // Budget alert styles
  budgetAlert: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  budgetAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetAlertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  budgetAlertContent: {
    flex: 1,
  },
  budgetAlertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  budgetAlertMessage: {
    fontSize: 13,
    color: '#718096',
  },
  budgetAlertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  budgetAlertBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  budgetProgressBar: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
