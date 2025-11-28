import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import FirebaseService from '../services/FirebaseService';
import { useAuth } from './AuthContext';

const ChartContext = createContext({});

export const useCharts = () => useContext(ChartContext);

export function ChartProvider({ children }) {
  const [dashboardCharts, setDashboardCharts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Set up real-time listener for user's charts
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserDashboardCharts(
        user.uid, 
        (charts) => {
          setDashboardCharts(charts);
        }
      );

      return unsubscribe;
    } else {
      setDashboardCharts([]);
    }
  }, [user]);

  // Add a new chart to dashboard
  const addChartToDashboard = async (chartConfig) => {
    if (!user?.uid) {
      throw new Error('User must be logged in to add charts');
    }

    try {
      setLoading(true);
      
      const chartData = {
        chartType: chartConfig.chartType,
        chartTitle: chartConfig.chartTitle,
        dataType: chartConfig.dataType,
        dataTitle: chartConfig.dataTitle,
        description: chartConfig.description,
        emoji: chartConfig.emoji
      };

      const result = await FirebaseService.addDashboardChart(user.uid, chartData);
      
      if (result.success) {
        return { id: result.id, ...chartData };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to add chart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Remove chart from dashboard
  const removeChartFromDashboard = async (chartId) => {
    if (!user?.uid) {
      throw new Error('User must be logged in to remove charts');
    }

    try {
      setLoading(true);
      
      const result = await FirebaseService.deleteDashboardChart(user.uid, chartId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to remove chart:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Load charts from Firebase (called automatically by listener)
  const loadChartsFromStorage = async () => {
    if (!user?.uid) {
      return [];
    }

    try {
      const result = await FirebaseService.getUserDashboardCharts(user.uid);
      
      if (result.success) {
        setDashboardCharts(result.data);
        return result.data;
      } else {
        console.error('Failed to load charts:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Failed to load charts:', error);
      return [];
    }
  };

  // State for user's transactions
  const [userTransactions, setUserTransactions] = useState([]);
  // State for user's cards
  const [userCards, setUserCards] = useState([]);
  // State for user's savings accounts
  const [userSavingsAccounts, setUserSavingsAccounts] = useState([]);
  
  // Subscribe to user's transactions
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserTransactions(
        user.uid,
        (transactions) => {
          setUserTransactions(transactions);
        }
      );
      
      return unsubscribe;
    }
  }, [user]);

  // Subscribe to user's cards
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserCards(
        user.uid,
        (cards) => {
          setUserCards(cards);
        }
      );
      
      return unsubscribe;
    }
  }, [user]);

  // Load user's savings accounts
  useEffect(() => {
    const loadSavings = async () => {
      if (user?.uid) {
        const result = await FirebaseService.getUserSavingsAccounts(user.uid);
        if (result.success) {
          setUserSavingsAccounts(result.data);
        }
      }
    };
    loadSavings();
  }, [user]);
  
  // Helper to parse balance from card
  const parseBalance = (card) => {
    return typeof card.balance === 'number' 
      ? card.balance 
      : parseFloat(String(card.balance).replace(/[^0-9.-]/g, '')) || 0;
  };

  // Get chart data - SIMPLIFIED with real data only
  const getChartData = (dataType) => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
    
    switch (dataType) {
      // ========== MONEY CHARTS ==========
      case 'total_balance': {
        if (!userCards || userCards.length === 0) return [];
        
        const debitTotal = userCards
          .filter(c => c && c.type === 'debit')
          .reduce((sum, c) => sum + parseBalance(c), 0);
        
        const savingsTotal = (userSavingsAccounts || [])
          .filter(a => a && a.balance)
          .reduce((sum, a) => sum + (parseFloat(String(a.balance).replace(/[^0-9.-]/g, '')) || 0), 0);
        
        const result = [];
        if (debitTotal > 0) {
          result.push({ label: 'Debit Cards', value: debitTotal, color: '#10b981' });
        }
        if (savingsTotal > 0) {
          result.push({ label: 'Savings', value: savingsTotal, color: '#3b82f6' });
        }
        
        return result;
      }
      
      case 'account_breakdown': {
        if (!userCards || userCards.length === 0) return [];
        
        return userCards
          .filter(c => c && c.type === 'debit' && c.bank)
          .map((card, index) => {
            const balance = parseBalance(card);
            return {
              label: card.bank,
              value: balance,
              color: colors[index % colors.length]
            };
          })
          .filter(item => item.value > 0);
      }
      
      case 'money_available': {
        if (!userCards || userCards.length === 0) return [];
        
        const cash = userCards
          .filter(c => c.type === 'debit')
          .reduce((sum, c) => sum + parseBalance(c), 0);
        
        const creditAvailable = userCards
          .filter(c => c.type === 'credit')
          .reduce((sum, c) => sum + ((c.limit || 0) - parseBalance(c)), 0);
        
        return [
          { label: 'Cash', value: cash, color: '#10b981' },
          { label: 'Credit Available', value: creditAvailable, color: '#3b82f6' },
        ];
      }
      
      // ========== SPENDING CHARTS ==========
      case 'spending_by_category': {
        if (!userTransactions || userTransactions.length === 0) return [];
        
        const categoryTotals = {};
        userTransactions.forEach(t => {
          // Check for expense transactions using both amount format and type
          const isExpense = (t.amount && t.amount.startsWith('-')) || t.type === 'expense';
          if (isExpense && t.amount) {
            const cat = t.category || 'Other';
            const amt = Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0);
            if (amt > 0) {
              categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
            }
          }
        });
        
        const categoryColors = {
          'Credit Card': '#6366f1',
          'Entertainment': '#ec4899', 
          'Utilities': '#f59e0b',
          'Health & Fitness': '#14b8a6',
          'Transport': '#3b82f6',
          'Insurance': '#8b5cf6',
          'Subscriptions': '#a855f7',
          'Education': '#06b6d4',
          'Charity': '#10b981',
          'Mortgage/Rent': '#ef4444',
          'Loans': '#f97316',
          'Childcare': '#22c55e',
          'Professional Services': '#84cc16',
          'Government/Tax': '#f43f5e',
          'Other': '#6b7280',
          // Legacy categories for backward compatibility
          'Groceries': '#10b981', 
          'Food & Drink': '#f59e0b', 
          'Shopping': '#8b5cf6', 
          'Bills': '#ef4444',
          'Health': '#14b8a6'
        };
        
        return Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([cat, total]) => ({
            label: cat,
            value: total,
            color: categoryColors[cat] || '#6b7280'
          }));
      }
      
      case 'recent_spending': {
        if (!userTransactions || userTransactions.length === 0) return [];
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let totalSpent = 0;
        let transactionCount = 0;
        
        userTransactions.forEach(t => {
          // Check for expense transactions using both amount format and type
          const isExpense = (t.amount && t.amount.startsWith('-')) || t.type === 'expense';
          if (isExpense && t.amount) {
            // Use consistent date field - try both t.date and t.createdAt
            let txDate;
            if (t.date) {
              txDate = new Date(t.date);
            } else if (t.createdAt) {
              txDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
            } else {
              return; // Skip if no date available
            }
            
            if (!isNaN(txDate.getTime()) && txDate >= thirtyDaysAgo) {
              const amt = Math.abs(parseFloat(String(t.amount).replace(/[^0-9.-]/g, '')) || 0);
              if (amt > 0) {
                totalSpent += amt;
                transactionCount++;
              }
            }
          }
        });
        
        return [
          { label: 'Spent (30 days)', value: totalSpent, color: '#ef4444' },
          { label: 'Transactions', value: transactionCount, color: '#3b82f6' },
        ];
      }
      
      // ========== SAVINGS CHARTS ==========
      case 'savings_progress': {
        if (!userSavingsAccounts || userSavingsAccounts.length === 0) return [];
        
        return userSavingsAccounts.map((account, index) => {
          const balance = parseFloat(String(account.balance).replace(/[^0-9.-]/g, '')) || 0;
          const goal = parseFloat(String(account.goal).replace(/[^0-9.-]/g, '')) || 1000;
          return {
            label: account.name,
            value: balance,
            goal: goal,
            color: colors[index % colors.length]
          };
        });
      }
      
      // ========== CREDIT CHARTS ==========
      case 'credit_usage': {
        const creditCards = (userCards || []).filter(c => c && c.type === 'credit');
        if (creditCards.length === 0) return [];
        
        const totalUsed = creditCards.reduce((sum, c) => sum + parseBalance(c), 0);
        const totalLimit = creditCards.reduce((sum, c) => sum + (c.limit || 0), 0);
        const totalAvailable = Math.max(0, totalLimit - totalUsed);
        
        const result = [];
        if (totalUsed > 0) {
          result.push({ label: 'Used', value: totalUsed, color: '#ef4444' });
        }
        if (totalAvailable > 0) {
          result.push({ label: 'Available', value: totalAvailable, color: '#10b981' });
        }
        
        return result;
      }
      
      default:
        return [];
    }
  };

  // Reorder charts (move chart to new position)
  const reorderCharts = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const newCharts = [...dashboardCharts];
    const [movedChart] = newCharts.splice(fromIndex, 1);
    newCharts.splice(toIndex, 0, movedChart);
    setDashboardCharts(newCharts);
    
    // Note: This only updates local state. 
    // To persist order to Firebase, we'd need to add an 'order' field to each chart
  };

  // Move chart left/right
  const moveChart = (chartId, direction) => {
    const currentIndex = dashboardCharts.findIndex(c => c.id === chartId);
    if (currentIndex === -1) return;
    
    let newIndex;
    if (direction === 'left' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'right' && currentIndex < dashboardCharts.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return; // Can't move
    }
    
    reorderCharts(currentIndex, newIndex);
  };

  const value = {
    dashboardCharts,
    loading,
    addChartToDashboard,
    removeChartFromDashboard,
    loadChartsFromStorage,
    getChartData,
    reorderCharts,
    moveChart
  };

  return (
    <ChartContext.Provider value={value}>
      {children}
    </ChartContext.Provider>
  );
}
