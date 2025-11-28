// SpendFlow Browser Extension - Popup Script
class SpendFlowExtension {
  constructor() {
    this.apiUrl = 'https://spendflow.uk';
    this.user = null;
    this.userToken = null;
    this.cards = [];
    this.firebaseAPI = new FirebaseAPI();
    this.init();
  }

  async init() {
    console.log('SpendFlow Extension: Initializing...');
    
    // Check authentication status
    await this.checkAuth();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load user data if authenticated
    if (this.user) {
      await this.loadUserData();
      this.showMainInterface();
    } else {
      this.showAuthInterface();
    }
  }

  async checkAuth() {
    try {
      // Check if user is logged in to SpendFlow
      const result = await chrome.storage.sync.get(['spendflow_user', 'spendflow_token']);
      
      if (result.spendflow_user && result.spendflow_token) {
        this.user = result.spendflow_user;
        this.userToken = result.spendflow_token;
        console.log('User authenticated:', this.user.email);
        return true;
      }
      
      // Try to get auth from SpendFlow website if it's open
      const tabs = await chrome.tabs.query({url: ['https://spendflow.uk/*', 'https://spedflowapp.web.app/*']});
      
      if (tabs.length > 0) {
        console.log('SpendFlow tab found, trying to get data...');
        const spendFlowData = await this.getAuthFromTab(tabs[0].id);
        if (spendFlowData && spendFlowData.user) {
          await chrome.storage.sync.set({
            spendflow_user: spendFlowData.user,
            spendflow_token: 'extracted-from-site'
          });
          
          // Also cache the extracted data
          await chrome.storage.local.set({
            spendflow_cards: spendFlowData.cards || [],
            spendflow_stats: spendFlowData.stats || {},
            spendflow_transactions: spendFlowData.transactions || [],
            spendflow_last_sync: Date.now()
          });
          
          this.user = spendFlowData.user;
          this.userToken = 'extracted-from-site';
          this.cards = spendFlowData.cards || [];
          
          console.log('Data retrieved from SpendFlow tab:', {
            cards: this.cards.length,
            user: this.user.email
          });
          
          return true;
        }
      }
      
      console.log('No authentication found - user needs to sign in');
      return false;
      
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  async getAuthFromTab(tabId) {
    try {
      // Check if chrome.scripting is available
      if (!chrome.scripting) {
        console.log('Chrome scripting API not available');
        return null;
      }
      
      // Inject the data extraction script
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['simple-data-bridge.js']
      });
      
      return results[0]?.result || null;
    } catch (error) {
      console.error('Failed to get data from tab:', error);
      return null;
    }
  }

  async loadUserData() {
    try {
      // Load cards from storage or fetch from API
      const stored = await chrome.storage.local.get(['spendflow_cards', 'spendflow_stats']);
      
      if (stored.spendflow_cards) {
        this.cards = stored.spendflow_cards;
        this.updateStatsDisplay(stored.spendflow_stats || {});
      }
      
      // Refresh data in background
      this.refreshUserData();
      
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  }

  async refreshUserData() {
    try {
      // First try to use cached data from the website extraction
      const cached = await chrome.storage.local.get(['spendflow_cards', 'spendflow_stats', 'spendflow_transactions']);
      
      if (cached.spendflow_cards && cached.spendflow_cards.length > 0) {
        this.cards = cached.spendflow_cards;
        this.updateCardsDropdown();
        this.updateStatsDisplay(cached.spendflow_stats || {});
        console.log('Using cached data from website:', { cards: this.cards.length });
        return;
      }

      // If no cached data and we have auth, try to refresh from SpendFlow website
      if (this.user) {
        const tabs = await chrome.tabs.query({url: ['https://spendflow.uk/*', 'https://spedflowapp.web.app/*']});
        
        if (tabs.length > 0) {
          console.log('Refreshing data from SpendFlow website...');
          const spendFlowData = await this.getAuthFromTab(tabs[0].id);
          
          if (spendFlowData && spendFlowData.cards) {
            this.cards = spendFlowData.cards;
            
            // Cache the fresh data
            await chrome.storage.local.set({
              spendflow_cards: spendFlowData.cards,
              spendflow_stats: spendFlowData.stats || {},
              spendflow_transactions: spendFlowData.transactions || [],
              spendflow_last_sync: Date.now()
            });
            
            this.updateCardsDropdown();
            this.updateStatsDisplay(spendFlowData.stats || {});
            console.log('Fresh data loaded from website:', { cards: this.cards.length });
            return;
          }
        }
      }
      
      console.log('No data available - user needs to visit SpendFlow website');
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }

  calculateStatsFromTransactions(transactions) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Filter this month's transactions
    const thisMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.createdAt || t.date);
      return transactionDate >= startOfMonth;
    });
    
    // Calculate monthly spending (expenses only)
    const monthlySpent = thisMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);
    
    // Calculate total balance from cards
    const totalBalance = this.cards.reduce((sum, card) => {
      if (card.type === 'debit' || card.type === 'savings') {
        return sum + (parseFloat(card.balance) || 0);
      } else if (card.type === 'credit') {
        // For credit cards, subtract the balance (debt) from available credit
        return sum - (parseFloat(card.balance) || 0);
      }
      return sum;
    }, 0);
    
    return {
      monthlySpent,
      totalBalance,
      transactionCount: thisMonthTransactions.length
    };
  }

  updateCardsDropdown() {
    const cardSelect = document.getElementById('card');
    cardSelect.innerHTML = '<option value="">Select card...</option>';
    
    console.log('Updating cards dropdown with:', this.cards);
    
    if (!this.cards || this.cards.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No cards found - visit SpendFlow first';
      option.disabled = true;
      cardSelect.appendChild(option);
      return;
    }
    
    this.cards.forEach(card => {
      const option = document.createElement('option');
      option.value = card.id || card.cardId || `card-${Date.now()}`;
      
      // Handle different card data formats
      const bankName = card.bank || card.bankName || card.issuer || 'Unknown Bank';
      const lastFour = card.lastFour || card.last4 || card.cardNumber?.slice(-4) || '****';
      const balance = parseFloat(card.balance || card.currentBalance || 0);
      const cardType = card.type || card.cardType || 'card';
      
      // Format display text
      let displayText = `${bankName} ****${lastFour}`;
      
      if (cardType === 'credit') {
        const limit = parseFloat(card.limit || card.creditLimit || 0);
        displayText += ` (£${balance.toFixed(2)}/${limit.toFixed(2)})`;
      } else {
        displayText += ` (£${balance.toFixed(2)})`;
      }
      
      option.textContent = displayText;
      cardSelect.appendChild(option);
    });
  }

  updateStatsDisplay(stats) {
    document.getElementById('monthlySpent').textContent = `£${stats.monthlySpent?.toFixed(2) || '0.00'}`;
    document.getElementById('totalBalance').textContent = `£${stats.totalBalance?.toFixed(2) || '0.00'}`;
  }

  setupEventListeners() {
    // Sign in button
    document.getElementById('signInBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://spendflow.uk' });
      window.close();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      console.log('Manual refresh requested');
      
      // Clear cached data
      await chrome.storage.local.remove(['spendflow_cards', 'spendflow_stats', 'spendflow_transactions']);
      
      // Show loading
      document.getElementById('loadingSection').style.display = 'flex';
      document.getElementById('statsSection').style.display = 'none';
      document.getElementById('addSection').style.display = 'none';
      
      // Refresh data
      await this.refreshUserData();
      
      // Show interface again
      if (this.cards && this.cards.length > 0) {
        this.showMainInterface();
      } else {
        this.showAuthInterface();
      }
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://spendflow.uk/profile' });
      window.close();
    });

    // Form submission
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addExpense();
    });

    // Add another button
    document.getElementById('addAnotherBtn').addEventListener('click', () => {
      this.showMainInterface();
      this.clearForm();
    });

    // View app button
    document.getElementById('viewAppBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://spendflow.uk/dashboard' });
      window.close();
    });
  }

  async addExpense() {
    const form = document.getElementById('expenseForm');
    const formData = new FormData(form);
    
    const expense = {
      amount: parseFloat(document.getElementById('amount').value),
      category: document.getElementById('category').value,
      description: document.getElementById('description').value || '',
      cardId: document.getElementById('card').value,
      date: new Date().toISOString(),
      type: 'expense'
    };

    // Validate
    if (!expense.amount || !expense.category || !expense.cardId) {
      alert('Please fill in all required fields');
      return;
    }

    // Show loading
    const addBtn = document.getElementById('addBtn');
    addBtn.querySelector('.btn-text').style.display = 'none';
    addBtn.querySelector('.btn-loading').style.display = 'inline';
    addBtn.disabled = true;

    try {
      // In a real implementation, this would sync with Firebase
      await this.saveExpenseToStorage(expense);
      
      // Show success
      this.showSuccessMessage(expense);
      
      // Update stats
      await this.refreshUserData();
      
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Failed to add expense. Please try again.');
      
      // Reset button
      addBtn.querySelector('.btn-text').style.display = 'inline';
      addBtn.querySelector('.btn-loading').style.display = 'none';
      addBtn.disabled = false;
    }
  }

  async saveExpenseToStorage(expense) {
    try {
      if (!this.user || !this.userToken) {
        throw new Error('User not authenticated');
      }

      // Prepare transaction data for Firebase
      const transactionData = {
        type: 'expense',
        amount: expense.amount,
        category: expense.category,
        description: expense.description || '',
        cardId: expense.cardId,
        date: expense.date,
        createdAt: new Date(),
        userId: this.user.uid
      };

      console.log('Saving expense to Firebase...', transactionData);

      // Save directly to Firebase
      const result = await this.firebaseAPI.addTransaction(
        this.user.uid, 
        this.userToken, 
        transactionData
      );

      if (result.success) {
        console.log('Expense saved successfully:', result.id);
        
        // Update local cache
        const cached = await chrome.storage.local.get(['spendflow_transactions']);
        const transactions = cached.spendflow_transactions || [];
        transactions.unshift({ ...transactionData, id: result.id });
        
        await chrome.storage.local.set({ 
          spendflow_transactions: transactions.slice(0, 50) // Keep only recent 50
        });
        
        // Refresh stats
        await this.refreshUserData();
        
        return { success: true, id: result.id };
      } else {
        throw new Error(result.error || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Failed to save expense:', error);
      
      // Fallback: save to pending sync
      const stored = await chrome.storage.local.get(['spendflow_pending_expenses']);
      const pending = stored.spendflow_pending_expenses || [];
      
      pending.push({
        ...expense,
        id: Date.now().toString(),
        synced: false,
        error: error.message
      });
      
      await chrome.storage.local.set({ spendflow_pending_expenses: pending });
      
      throw error;
    }
  }

  async syncPendingExpenses() {
    // This would sync with Firebase in a real implementation
    console.log('Syncing pending expenses...');
  }

  showMainInterface() {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'flex';
    document.getElementById('addSection').style.display = 'block';
  }

  showAuthInterface() {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('addSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'none';
    document.getElementById('authSection').style.display = 'block';
  }

  showSuccessMessage(expense) {
    const card = this.cards.find(c => c.id === expense.cardId);
    document.getElementById('successDetails').textContent = 
      `£${expense.amount.toFixed(2)} added to ${expense.category}`;
    
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('addSection').style.display = 'none';
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('successSection').style.display = 'block';
  }

  clearForm() {
    document.getElementById('expenseForm').reset();
    const addBtn = document.getElementById('addBtn');
    addBtn.querySelector('.btn-text').style.display = 'inline';
    addBtn.querySelector('.btn-loading').style.display = 'none';
    addBtn.disabled = false;
  }
}

// Initialize extension when popup opens
document.addEventListener('DOMContentLoaded', () => {
  new SpendFlowExtension();
});
