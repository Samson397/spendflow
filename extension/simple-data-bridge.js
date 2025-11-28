// Enhanced Data Bridge for SpendFlow Extension
// This script gets injected into SpendFlow pages to extract user data

function extractSpendFlowData() {
  try {
    const data = {
      cards: [],
      transactions: [],
      user: null,
      stats: { monthlySpent: 0, totalBalance: 0 }
    };

    console.log('Starting SpendFlow data extraction...');

    // Try to get user from Firebase auth
    if (window.firebase && window.firebase.auth) {
      const user = window.firebase.auth().currentUser;
      if (user) {
        data.user = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        };
        console.log('Firebase user found:', data.user.email);
      }
    }

    // Try multiple storage keys that SpendFlow might use
    const storageKeys = [
      'spendflow_cards', 'cards', 'userCards', 'wallet_cards',
      'spendflow_transactions', 'transactions', 'userTransactions',
      'spendflow_stats', 'stats', 'userStats'
    ];

    // Check localStorage with multiple possible keys
    storageKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log(`Found data in localStorage[${key}]:`, parsed);
          
          if (key.includes('card') && Array.isArray(parsed)) {
            data.cards = parsed;
          } else if (key.includes('transaction') && Array.isArray(parsed)) {
            data.transactions = parsed;
          } else if (key.includes('stat') && typeof parsed === 'object') {
            data.stats = { ...data.stats, ...parsed };
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Check sessionStorage
    storageKeys.forEach(key => {
      try {
        const stored = sessionStorage.getItem(key);
        if (stored && data.cards.length === 0) {
          const parsed = JSON.parse(stored);
          console.log(`Found data in sessionStorage[${key}]:`, parsed);
          
          if (key.includes('card') && Array.isArray(parsed)) {
            data.cards = parsed;
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    // Try to extract from React DevTools or component state
    try {
      // Look for React fiber root
      const reactRoot = document.querySelector('#root')?._reactInternalFiber ||
                       document.querySelector('#root')?._reactInternals ||
                       document.querySelector('[data-reactroot]')?._reactInternalFiber;

      if (reactRoot) {
        console.log('React root found, searching for component data...');
        
        // Recursively search React tree for card/transaction data
        const searchReactTree = (fiber, depth = 0) => {
          if (!fiber || depth > 10) return; // Limit search depth
          
          // Check component props and state
          if (fiber.memoizedProps) {
            const props = fiber.memoizedProps;
            if (props.cards && Array.isArray(props.cards)) {
              console.log('Found cards in React props:', props.cards);
              data.cards = props.cards;
            }
            if (props.transactions && Array.isArray(props.transactions)) {
              data.transactions = props.transactions;
            }
          }
          
          if (fiber.memoizedState) {
            const state = fiber.memoizedState;
            // State is often a linked list in React, so we need to traverse it
            let currentState = state;
            while (currentState) {
              if (currentState.memoizedState) {
                const stateValue = currentState.memoizedState;
                if (Array.isArray(stateValue)) {
                  // Could be cards or transactions
                  if (stateValue.length > 0 && stateValue[0].bank) {
                    console.log('Found cards in React state:', stateValue);
                    data.cards = stateValue;
                  } else if (stateValue.length > 0 && stateValue[0].amount) {
                    data.transactions = stateValue;
                  }
                }
              }
              currentState = currentState.next;
            }
          }
          
          // Search children
          if (fiber.child) searchReactTree(fiber.child, depth + 1);
          if (fiber.sibling) searchReactTree(fiber.sibling, depth + 1);
        };
        
        searchReactTree(reactRoot);
      }
    } catch (e) {
      console.log('React tree search failed:', e);
    }

    // Try to find data in global window variables
    const globalVars = ['spendFlowData', 'userData', 'appData', 'firebaseData'];
    globalVars.forEach(varName => {
      if (window[varName]) {
        console.log(`Found global variable ${varName}:`, window[varName]);
        const globalData = window[varName];
        if (globalData.cards) data.cards = globalData.cards;
        if (globalData.transactions) data.transactions = globalData.transactions;
        if (globalData.stats) data.stats = { ...data.stats, ...globalData.stats };
      }
    });

    // If still no cards, create some demo cards for testing
    if (data.cards.length === 0 && data.user) {
      console.log('No cards found, creating demo cards for testing...');
      data.cards = [
        {
          id: 'demo-1',
          bank: 'Demo Bank',
          lastFour: '1234',
          type: 'debit',
          balance: 1500.00,
          cardNumber: '****1234'
        },
        {
          id: 'demo-2', 
          bank: 'Demo Credit',
          lastFour: '5678',
          type: 'credit',
          balance: 250.00,
          limit: 2000.00,
          cardNumber: '****5678'
        }
      ];
    }

    // Calculate stats from transactions or use demo data
    if (data.transactions.length > 0) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const thisMonthExpenses = data.transactions.filter(t => {
        const transactionDate = new Date(t.createdAt || t.date);
        return transactionDate >= startOfMonth && t.type === 'expense';
      });
      
      data.stats.monthlySpent = thisMonthExpenses.reduce((sum, t) => 
        sum + Math.abs(parseFloat(t.amount) || 0), 0
      );
    } else if (data.cards.length > 0) {
      // Demo stats if no transactions
      data.stats.monthlySpent = 456.78;
    }

    // Calculate total balance from cards
    if (data.cards.length > 0) {
      data.stats.totalBalance = data.cards.reduce((sum, card) => {
        if (card.type === 'debit' || card.type === 'savings') {
          return sum + (parseFloat(card.balance) || 0);
        } else if (card.type === 'credit') {
          return sum - (parseFloat(card.balance) || 0);
        }
        return sum;
      }, 0);
    }

    console.log('Final SpendFlow data extracted:', {
      cardsFound: data.cards.length,
      transactionsFound: data.transactions.length,
      userFound: !!data.user,
      stats: data.stats,
      cards: data.cards
    });

    return data;
  } catch (error) {
    console.error('Error extracting SpendFlow data:', error);
    return {
      cards: [],
      transactions: [],
      user: null,
      stats: { monthlySpent: 0, totalBalance: 0 }
    };
  }
}

// Return the extracted data
return extractSpendFlowData();
