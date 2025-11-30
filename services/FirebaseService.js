import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirebaseService {
  // User Profile Operations
  async createUserProfile(userId, userData) {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Recurring Savings Transfers Operations
  async addRecurringTransfer(userId, rule) {
    try {
      const refCol = collection(db, 'users', userId, 'recurringTransfers');
      const docRef = await addDoc(refCol, {
        ...rule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding recurring transfer:', error);
      return { success: false, error: error.message };
    }
  }

  async getRecurringTransferRules(userId) {
    try {
      const refCol = collection(db, 'users', userId, 'recurringTransfers');
      const querySnapshot = await getDocs(refCol);
      const rules = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: rules };
    } catch (error) {
      console.error('Error getting recurring transfer rules:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  async createRecurringTransferRule(userId, ruleData) {
    return this.addRecurringTransfer(userId, ruleData);
  }

  async updateRecurringTransferRule(userId, ruleId, ruleData) {
    return this.updateRecurringTransfer(userId, ruleId, ruleData);
  }

  async deleteRecurringTransferRule(userId, ruleId) {
    return this.deleteRecurringTransfer(userId, ruleId);
  }

  async createOneTimeTransfer(userId, transferData) {
    try {
      const refCol = collection(db, 'users', userId, 'transfers');
      const docRef = await addDoc(refCol, {
        ...transferData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating one-time transfer:', error);
      return { success: false, error: error.message };
    }
  }

  subscribeToRecurringTransfers(userId, callback) {
    const refCol = collection(db, 'users', userId, 'recurringTransfers');
    return onSnapshot(refCol, (snapshot) => {
      const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(rules);
    }, (error) => {
      console.error('Error subscribing to recurring transfers:', error);
      callback([]);
    });
  }

  async updateRecurringTransfer(userId, ruleId, updates) {
    try {
      const refDoc = doc(db, 'users', userId, 'recurringTransfers', ruleId);
      await updateDoc(refDoc, { ...updates, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('Error updating recurring transfer:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteRecurringTransfer(userId, ruleId) {
    try {
      const refDoc = doc(db, 'users', userId, 'recurringTransfers', ruleId);
      await deleteDoc(refDoc);
      return { success: true };
    } catch (error) {
      console.error('Error deleting recurring transfer:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { success: true, data: userSnap.data() };
      } else {
        return { success: false, error: 'User profile not found' };
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Cards Operations
  async addCard(userId, cardData) {
    try {
      const cardsRef = collection(db, 'users', userId, 'cards');
      const docRef = await addDoc(cardsRef, {
        ...cardData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding card:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserCards(userId) {
    try {
      const cardsRef = collection(db, 'users', userId, 'cards');
      const querySnapshot = await getDocs(cardsRef);
      const cards = [];
      querySnapshot.forEach((doc) => {
        cards.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: cards };
    } catch (error) {
      console.error('Error getting user cards:', error);
      return { success: false, data: [] };
    }
  }

  async getUserCard(userId, cardId) {
    try {
      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      const cardDoc = await getDoc(cardRef);
      if (cardDoc.exists()) {
        return { success: true, data: { id: cardDoc.id, ...cardDoc.data() } };
      }
      return { success: false, error: 'Card not found' };
    } catch (error) {
      console.error('Error getting user card:', error);
      return { success: false, error: error.message };
    }
  }

  async processCardTransfer(userId, cardId, amount, description, type = 'transfer') {
    try {
      // Get the card
      const cardResult = await this.getUserCard(userId, cardId);
      if (!cardResult.success) {
        return { success: false, error: 'Card not found' };
      }

      const card = cardResult.data;
      
      // Check balance
      if (card.balance < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Update card balance
      const newBalance = card.balance - amount;
      await this.updateUserCard(userId, cardId, { balance: newBalance });

      // Create transaction record
      const transactionData = {
        userId,
        amount: -amount, // Negative for outgoing
        type: type === 'payment_request' ? 'payment' : 'transfer',
        category: 'Transfers',
        description,
        cardId,
        date: new Date().toISOString(),
        balance: newBalance
      };

      const transactionResult = await this.createTransaction(transactionData);

      return { 
        success: true, 
        transactionId: transactionResult.id,
        newBalance 
      };
    } catch (error) {
      console.error('Process card transfer error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserCard(userId, cardId, updateData) {
    try {
      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      await updateDoc(cardRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user card:', error);
      return { success: false, error: error.message };
    }
  }

  async createTransaction(transactionData) {
    try {
      const transactionsRef = collection(db, 'users', transactionData.userId, 'transactions');
      const docRef = await addDoc(transactionsRef, {
        ...transactionData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCard(userId, cardId, updates) {
    try {
      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      await updateDoc(cardRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating card:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCard(userId, cardId) {
    try {
      // First, get all direct debits linked to this card
      const directDebitsRef = collection(db, 'users', userId, 'directDebits');
      const directDebitsQuery = query(directDebitsRef, where('cardId', '==', cardId));
      const directDebitsSnapshot = await getDocs(directDebitsQuery);
      
      // Delete all associated direct debits
      const deletePromises = directDebitsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Then delete the card
      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      await deleteDoc(cardRef);
      
      return { 
        success: true, 
        deletedDirectDebits: directDebitsSnapshot.docs.length 
      };
    } catch (error) {
      console.error('Error deleting card:', error);
      return { success: false, error: error.message };
    }
  }

  // Transactions Operations
  async addTransaction(userId, transactionData) {
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const docRef = await addDoc(transactionsRef, {
        ...transactionData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserTransactions(userId, limit = 50) {
    try {
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'));
      const transactionsSnap = await getDocs(q);
      const transactions = transactionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error getting transactions:', error);
      
      // If permission denied, return empty array for development
      if (error.code === 'permission-denied') {
        return { success: true, data: [] };
      }
      
      return { success: false, error: error.message };
    }
  }

  async updateTransaction(userId, transactionId, updates) {
    try {
      const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
      await updateDoc(transactionRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteTransaction(userId, transactionId) {
    try {
      const transactionRef = doc(db, 'users', userId, 'transactions', transactionId);
      await deleteDoc(transactionRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Direct Debits Operations
  async addDirectDebit(userId, debitData) {
    try {
      const debitsRef = collection(db, 'users', userId, 'directDebits');
      const docRef = await addDoc(debitsRef, {
        ...debitData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding direct debit:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserDirectDebits(userId) {
    try {
      const debitsRef = collection(db, 'users', userId, 'directDebits');
      const debitsSnap = await getDocs(debitsRef);
      const debits = debitsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: debits };
    } catch (error) {
      console.error('Error getting direct debits:', error);
      
      // If permission denied, return empty array for development
      if (error.code === 'permission-denied') {
        return { success: true, data: [] };
      }
      
      return { success: false, error: error.message };
    }
  }

  async updateDirectDebit(userId, debitId, updates) {
    try {
      const debitRef = doc(db, 'users', userId, 'directDebits', debitId);
      await updateDoc(debitRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating direct debit:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDirectDebit(userId, debitId) {
    try {
      const debitRef = doc(db, 'users', userId, 'directDebits', debitId);
      await deleteDoc(debitRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting direct debit:', error);
      return { success: false, error: error.message };
    }
  }

  // Get card transactions with enhanced error handling and logging
  async getCardTransactions(userId, cardId) {
    try {
      if (!userId || !cardId) {
        console.error('Missing required parameters:', { userId, cardId });
        return { success: false, error: 'Missing required parameters' };
      }

      // Ensure cardId is a string for consistent comparison
      const normalizedCardId = String(cardId);
      const numericCardId = isNaN(Number(normalizedCardId)) ? null : Number(normalizedCardId);
      
      console.log(`[FirebaseService] Fetching transactions for user: ${userId}, card: ${normalizedCardId}`);
      
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      
      // Create multiple queries like in subscribeToCardTransactions
      const queries = [
        query(
          transactionsRef,
          where('cardId', '==', normalizedCardId),
          orderBy('date', 'desc')
        )
      ];
      
      // Add query for fromCardId (transfers out)
      queries.push(
        query(
          transactionsRef,
          where('fromCardId', '==', normalizedCardId),
          orderBy('date', 'desc')
        )
      );
      
      // Add query for toCardId (transfers in)
      queries.push(
        query(
          transactionsRef,
          where('toCardId', '==', normalizedCardId),
          orderBy('date', 'desc')
        )
      );
      
      // Add numeric versions if different
      if (numericCardId !== null && String(numericCardId) !== normalizedCardId) {
        queries.push(
          query(
            transactionsRef,
            where('cardId', '==', numericCardId),
            orderBy('date', 'desc')
          )
        );
        queries.push(
          query(
            transactionsRef,
            where('fromCardId', '==', numericCardId),
            orderBy('date', 'desc')
          )
        );
        queries.push(
          query(
            transactionsRef,
            where('toCardId', '==', numericCardId),
            orderBy('date', 'desc')
          )
        );
      }
      
      console.log(`[FirebaseService] Executing ${queries.length} Firestore queries for card transactions`);
      
      // Execute all queries
      const allTransactions = new Map();
      let totalDocs = 0;
      
      for (let i = 0; i < queries.length; i++) {
        const querySnapshot = await getDocs(queries[i]);
        console.log(`[FirebaseService] Query ${i} returned ${querySnapshot.docs.length} documents`);
        
        querySnapshot.forEach((doc) => {
          try {
            const data = doc.data();
            
            // Normalize amount
            let amount = '£0.00';
            // Check for both "amount" and "amout" (typo in database)
            const amountValue = data.amount || data.amout;
            if (amountValue) {
              if (typeof amountValue === 'string') {
                // If it's already a string with a currency symbol, use it as is
                if (/^[£$€]/.test(amountValue)) {
                  amount = amountValue;
                } else {
                  // Otherwise, try to parse it as a number
                  const numAmount = parseFloat(amountValue);
                  amount = isNaN(numAmount) ? '£0.00' : 
                          (data.type === 'income' || (amountValue + '').startsWith('+') ? '+' : '-') + 
                          '£' + Math.abs(numAmount).toFixed(2);
                }
              } else if (typeof amountValue === 'number') {
                // Handle numeric amounts
                const isPositive = (data.type === 'income' || amountValue < 0);
                amount = (isPositive ? '+' : '-') + '£' + Math.abs(amountValue).toFixed(2);
              }
            }
            
            // Normalize the transaction data
            const transaction = {
              id: doc.id,
              ...data,
              // Ensure the amount field is set (handle typo in database)
              amount: amount,
              amout: amount, // Keep both for compatibility
              // Ensure cardId is always a string and matches our normalized ID
              cardId: data.cardId ? String(data.cardId) : 
                     (data.fromCardId === normalizedCardId ? normalizedCardId :
                      data.toCardId === normalizedCardId ? normalizedCardId :
                      normalizedCardId),
              // Ensure dates are properly formatted
              date: data.date ? new Date(data.date).toISOString() : 
                    (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
              type: data.type || (amount.startsWith('+') ? 'income' : 'expense'),
              createdAt: data.createdAt || new Date().toISOString()
            };
            
            allTransactions.set(doc.id, transaction);
            totalDocs++;
          } catch (error) {
            console.error(`[FirebaseService] Error processing document ${doc.id}:`, error);
          }
        });
      }
      
      console.log(`[FirebaseService] Processed ${totalDocs} total documents, found ${allTransactions.size} unique transactions`);
      
      // Convert to array and sort by date
      const transactions = Array.from(allTransactions.values()).sort((a, b) => {
        try {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA; // Newest first
        } catch (error) {
          return 0;
        }
      });
      
      return { success: true, data: transactions };
    } catch (error) {
      console.error('[FirebaseService] Error getting card transactions:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCard(userId, cardId, updateData) {
    try {
      if (!userId || !cardId) {
        console.error('Missing required parameters:', { userId, cardId });
        return { success: false, error: 'Missing required parameters' };
      }

      const cardRef = doc(db, 'users', userId, 'cards', cardId);
      await updateDoc(cardRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating card:', error);
      return { success: false, error: error.message };
    }
  }

  // Savings Accounts Operations
  async addSavingsAccount(userId, accountData) {
    try {
      const savingsRef = collection(db, 'users', userId, 'savingsAccounts');
      const docRef = await addDoc(savingsRef, {
        ...accountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding savings account:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSavingsAccounts(userId) {
    try {
      const savingsRef = collection(db, 'users', userId, 'savingsAccounts');
      const savingsSnap = await getDocs(savingsRef);
      const accounts = savingsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: accounts };
    } catch (error) {
      console.error('Error getting savings accounts:', error);
      
      // If permission denied, return empty array for development
      if (error.code === 'permission-denied') {
        return { success: true, data: [] };
      }
      
      return { success: false, error: error.message };
    }
  }

  async updateSavingsAccount(userId, accountId, updates) {
    try {
      const accountRef = doc(db, 'users', userId, 'savingsAccounts', accountId);
      await updateDoc(accountRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating savings account:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSavingsAccount(userId, accountId) {
    try {
      const accountRef = doc(db, 'users', userId, 'savingsAccounts', accountId);
      await deleteDoc(accountRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting savings account:', error);
      return { success: false, error: error.message };
    }
  }

  // Goals Operations
  async updateGoal(userId, goalId, updates) {
    try {
      const goalRef = doc(db, 'users', userId, 'goals', goalId);
      await updateDoc(goalRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating goal:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteGoal(userId, goalId) {
    try {
      const goalRef = doc(db, 'users', userId, 'goals', goalId);
      await deleteDoc(goalRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting goal:', error);
      return { success: false, error: error.message };
    }
  }

  // Budgets Operations
  async addBudget(userId, budgetData) {
    try {
      const budgetsRef = collection(db, 'users', userId, 'budgets');
      const docRef = await addDoc(budgetsRef, {
        ...budgetData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding budget:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserBudgets(userId) {
    try {
      const budgetsRef = collection(db, 'users', userId, 'budgets');
      const snap = await getDocs(budgetsRef);
      const budgets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: budgets };
    } catch (error) {
      console.error('Error getting budgets:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  async getUserGoals(userId) {
    try {
      const goalsRef = collection(db, 'users', userId, 'goals');
      const snap = await getDocs(goalsRef);
      const goals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: goals };
    } catch (error) {
      console.error('Error getting goals:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // AI Conversation Management
  async saveAIMessage(userId, message) {
    try {
      const messagesRef = collection(db, 'users', userId, 'aiMessages');
      await addDoc(messagesRef, {
        ...message,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error saving AI message:', error);
      return { success: false, error: error.message };
    }
  }

  async getAIConversationHistory(userId, maxMessages = 50) {
    try {
      const messagesRef = collection(db, 'users', userId, 'aiMessages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(maxMessages));
      const snap = await getDocs(q);
      const messages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      return { success: true, data: messages };
    } catch (error) {
      console.error('Error getting AI conversation:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  async saveUserPreference(userId, key, value) {
    try {
      const prefsRef = doc(db, 'users', userId, 'aiPreferences', 'userLearning');
      await setDoc(prefsRef, { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error saving user preference:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserPreferences(userId) {
    try {
      const prefsRef = doc(db, 'users', userId, 'aiPreferences', 'userLearning');
      const snap = await getDoc(prefsRef);
      return { success: true, data: snap.exists() ? snap.data() : {} };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return { success: false, error: error.message, data: {} };
    }
  }

  async clearAIConversation(userId) {
    try {
      const messagesRef = collection(db, 'users', userId, 'aiMessages');
      const snap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error clearing AI conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async updateBudget(userId, budgetId, updates) {
    try {
      const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
      await updateDoc(budgetRef, { ...updates, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      console.error('Error updating budget:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteBudget(userId, budgetId) {
    try {
      const budgetRef = doc(db, 'users', userId, 'budgets', budgetId);
      await deleteDoc(budgetRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting budget:', error);
      return { success: false, error: error.message };
    }
  }

  subscribeToUserBudgets(userId, callback) {
    const budgetsRef = collection(db, 'users', userId, 'budgets');
    return onSnapshot(budgetsRef, (snapshot) => {
      const budgets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(budgets);
    }, (error) => {
      console.error('Error subscribing to budgets:', error);
      callback([]);
    });
  }

  // Dashboard Charts Operations
  async addDashboardChart(userId, chartData) {
    try {
      const chartsRef = collection(db, 'users', userId, 'dashboardCharts');
      const docRef = await addDoc(chartsRef, {
        ...chartData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding dashboard chart:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserDashboardCharts(userId) {
    try {
      const chartsRef = collection(db, 'users', userId, 'dashboardCharts');
      const chartsSnap = await getDocs(chartsRef);
      const charts = chartsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: charts };
    } catch (error) {
      console.error('Error getting dashboard charts:', error);
      
      // If permission denied, return empty array for development
      if (error.code === 'permission-denied') {
        return { success: true, data: [] };
      }
      
      return { success: false, error: error.message };
    }
  }

  async deleteDashboardChart(userId, chartId) {
    try {
      const chartRef = doc(db, 'users', userId, 'dashboardCharts', chartId);
      await deleteDoc(chartRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting dashboard chart:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete all user data from Firestore
  async deleteUserData(userId) {
    try {
      const collectionsToDelete = [
        'cards',
        'transactions', 
        'directDebits',
        'savingsAccounts',
        'goals',
        'dashboardCharts'
      ];

      // Delete all subcollections
      for (const collectionName of collectionsToDelete) {
        const collectionRef = collection(db, 'users', userId, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const deletePromises = snapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      }

      // Delete user's community tips
      const tipsRef = collection(db, 'communityTips');
      const tipsQuery = query(tipsRef, where('authorId', '==', userId));
      const tipsSnapshot = await getDocs(tipsQuery);
      
      for (const tipDoc of tipsSnapshot.docs) {
        // Delete comments for this tip
        const commentsRef = collection(db, 'communityTips', tipDoc.id, 'comments');
        const commentsSnapshot = await getDocs(commentsRef);
        
        const commentDeletePromises = commentsSnapshot.docs.map(commentDoc =>
          deleteDoc(commentDoc.ref)
        );
        
        if (commentDeletePromises.length > 0) {
          await Promise.all(commentDeletePromises);
        }
        
        // Delete the tip itself
        await deleteDoc(tipDoc.ref);
      }

      // Delete user's main profile document
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting user data:', error);
      return { success: false, error: error.message };
    }
  }

  // Real-time listeners
  subscribeToUserCards(userId, callback) {
    const cardsRef = collection(db, 'users', userId, 'cards');
    return onSnapshot(cardsRef, (snapshot) => {
      const cards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(cards);
    }, (error) => {
      if (error.code === 'permission-denied') {
        callback([]);
      }
    });
  }

  subscribeToUserTransactions(userId, callback) {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const q = query(transactionsRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(transactions);
    });
  }

  subscribeToCardTransactions(userId, cardId, callback) {
    if (!userId || !cardId) {
      return () => {};
    }
    
    try {
      // Check if db is initialized
      if (!db) {
        return () => {};
      }
      
      // Normalize cardId to string and create a numeric version
      const normalizedCardId = String(cardId).trim();
      const numericCardId = isNaN(Number(normalizedCardId)) ? null : Number(normalizedCardId);
      
      const transactionsRef = collection(db, 'users', userId, 'transactions');
      
      // Create a query that checks for both string and numeric cardIds
      // Also check for transfers where this card is the source or destination
      const queries = [
        query(
          transactionsRef,
          where('cardId', '==', normalizedCardId),
          orderBy('date', 'desc')
        )
      ];
      
      // Add query for fromCardId (transfers out)
      queries.push(
        query(
          transactionsRef,
          where('fromCardId', '==', normalizedCardId),
          orderBy('date', 'desc')
        )
      );
      
      // Add query for toCardId (transfers in)
      queries.push(
        query(
          transactionsRef,
          where('toCardId', '==', normalizedCardId),
          orderBy('date', 'desc')
        )
      );
      
      // Add numeric versions if different
      if (numericCardId !== null && String(numericCardId) !== normalizedCardId) {
        queries.push(
          query(
            transactionsRef,
            where('cardId', '==', numericCardId),
            orderBy('date', 'desc')
          )
        );
        queries.push(
          query(
            transactionsRef,
            where('fromCardId', '==', numericCardId),
            orderBy('date', 'desc')
          )
        );
        queries.push(
          query(
            transactionsRef,
            where('toCardId', '==', numericCardId),
            orderBy('date', 'desc')
          )
        );
      }
      
      // Set up the snapshot listeners with enhanced error handling
      let isUnsubscribed = false;
      const allTransactions = new Map(); // Use a Map to deduplicate by transaction ID
      
      // Function to process snapshot and update transactions
      const processSnapshot = (snapshot, queryType) => {
        if (isUnsubscribed) {
          return;
        }
          
        try {
          if (!snapshot || !snapshot.docs) {
            return;
          }
          
          // Process each document in the snapshot
          snapshot.forEach((doc) => {
              try {
                if (!doc.exists()) {
                  return;
                }
                
                const data = doc.data();
                if (!data) {
                  return;
                }
                
                // Skip if we've already processed this document
                if (allTransactions.has(doc.id)) {
                  return;
                }
            
            // Parse the amount to ensure it's in the correct format
            let amount = '£0.00';
            // Check for both "amount" and "amout" (typo in database)
            const amountValue = data.amount || data.amout;
            if (amountValue) {
              if (typeof amountValue === 'string') {
                // If it's already a string with a currency symbol, use it as is
                if (/[-+]?[£$€]/.test(amountValue)) {
                  amount = amountValue;
                } else {
                  // Otherwise, try to parse it as a number
                  const numAmount = parseFloat(amountValue);
                  amount = isNaN(numAmount) ? '£0.00' : 
                          (data.type === 'income' || (amountValue + '').startsWith('+') ? '+' : '-') + 
                          '£' + Math.abs(numAmount).toFixed(2);
                }
              } else if (typeof amountValue === 'number') {
                // Handle numeric amounts
                const isPositive = (data.type === 'income' || amountValue < 0);
                amount = (isPositive ? '+' : '-') + '£' + Math.abs(amountValue).toFixed(2);
              }
            }
            
            // Normalize the transaction data
            const transaction = {
              id: doc.id,
              ...data,
              // Ensure the amount field is set (handle typo in database)
              amount: amount,
              amout: amount, // Keep both for compatibility
              // Ensure cardId is always a string and matches our normalized ID
              // For transfers, check if this card is involved
              cardId: data.cardId ? String(data.cardId) : 
                     (data.fromCardId === normalizedCardId ? normalizedCardId :
                      data.toCardId === normalizedCardId ? normalizedCardId :
                      normalizedCardId),
              // Ensure dates are properly formatted
              date: data.date ? new Date(data.date).toISOString() : 
                    (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
              // Ensure type is set
              type: data.type || (amount.startsWith('+') ? 'income' : 'expense'),
              // Add timestamp if missing
              createdAt: data.createdAt || new Date().toISOString(),
              // Ensure we have a description
              description: data.description || 'Transaction',
              // Ensure we have a category
              category: data.category || (data.type === 'income' ? 'Income' : 'Expense')
            };
                
            // Add to our transactions map (automatically deduplicates by ID)
            allTransactions.set(doc.id, transaction);
          } catch (docError) {
            // Error processing document, continue with others
          }
          });
          
          // Convert map values to array and sort by date (newest first)
          const sortedTransactions = Array.from(allTransactions.values()).sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
          });
          
          // Send updates to the callback if not unsubscribed
          if (!isUnsubscribed) {
            try {
              callback(sortedTransactions);
            } catch (callbackError) {
              // Error in callback execution
            }
          }
        } catch (error) {
          // Error in snapshot handler, send current transactions if available
          if (!isUnsubscribed) {
            try {
              const currentTransactions = Array.from(allTransactions.values());
              callback(currentTransactions);
            } catch (callbackError) {
              // Error in error callback
            }
          }
        }
      };
      
      // Create a function to handle errors for individual queries
      const handleError = (error, queryType) => {
        // Error in subscription, continue with other queries
      };
      
      // Set up listeners for all queries
      const unsubscribes = queries.map((q, index) => {
        const queryType = index === 0 ? 'primary' : `secondary-${index}`;
        return onSnapshot(
          q,
          (snapshot) => {
            processSnapshot(snapshot, queryType);
          },
          (error) => {
            handleError(error, queryType);
          }
        );
      });

      // Return a function to clean up all listeners
      return () => {
        if (!isUnsubscribed) {
          isUnsubscribed = true;
          
          // Call all unsubscribe functions
          unsubscribes.forEach((unsubscribe, index) => {
            try {
              unsubscribe();
            } catch (unsubError) {
              // Error unsubscribing, continue
            }
          });
          
          // Clear the transactions map
          allTransactions.clear();
        }
      };
      
    } catch (error) {
      // Error setting up subscription, return no-op function
      return () => {};
    }
  }

  subscribeToUserDashboardCharts(userId, callback) {
    const chartsRef = collection(db, 'users', userId, 'dashboardCharts');
    return onSnapshot(chartsRef, (snapshot) => {
      const charts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(charts);
    }, (error) => {
      if (error.code === 'permission-denied') {
        callback([]);
      }
    });
  }

  subscribeToUserDirectDebits(userId, callback) {
    const debitsRef = collection(db, 'users', userId, 'directDebits');
    // Remove the orderBy since nextPaymentDate doesn't exist - use nextDate or no ordering
    return onSnapshot(debitsRef, (snapshot) => {
      const debits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(debits);
    }, (error) => {
      console.error('Firebase subscription error:', error);
      if (error.code === 'permission-denied') {
        callback([]);
      } else {
        callback([]);
      }
    });
  }

  subscribeToUserGoals(userId, callback) {
    const goalsRef = collection(db, 'users', userId, 'goals');
    return onSnapshot(goalsRef, (snapshot) => {
      const goals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(goals);
    }, (error) => {
      if (error.code === 'permission-denied') {
        callback([]);
      }
      callback([]);
    });
  }

  subscribeToUserSavingsAccounts(userId, callback) {
    const savingsRef = collection(db, 'users', userId, 'savingsAccounts');
    return onSnapshot(savingsRef, (snapshot) => {
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(accounts);
    }, (error) => {
      if (error.code === 'permission-denied') {
        callback([]);
      }
      callback([]);
    });
  }

  // Community Tips Methods
  async getCommunityTips() {
    try {
      const tipsRef = collection(db, 'communityTips');
      const q = query(tipsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const tips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, data: tips };
    } catch (error) {
      console.error('Error getting community tips:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  async addCommunityTip(tipData) {
    try {
      const tipsRef = collection(db, 'communityTips');
      const docRef = await addDoc(tipsRef, {
        ...tipData,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding community tip:', error);
      return { success: false, error: error.message };
    }
  }

  async toggleTipLike(tipId, userId) {
    try {
      const tipRef = doc(db, 'communityTips', tipId);
      const tipDoc = await getDoc(tipRef);
      
      if (!tipDoc.exists()) {
        return { success: false, error: 'Tip not found' };
      }

      const tipData = tipDoc.data();
      const likes = tipData.likes || [];
      const hasLiked = likes.includes(userId);

      await updateDoc(tipRef, {
        likes: hasLiked 
          ? likes.filter(id => id !== userId)
          : [...likes, userId],
        likesCount: hasLiked ? (tipData.likesCount || 1) - 1 : (tipData.likesCount || 0) + 1,
      });

      return { success: true, liked: !hasLiked };
    } catch (error) {
      console.error('Error toggling tip like:', error);
      return { success: false, error: error.message };
    }
  }

  // Bookmarks
  async getUserBookmarks(userId) {
    try {
      const bookmarksRef = doc(db, 'users', userId, 'preferences', 'bookmarks');
      const bookmarksDoc = await getDoc(bookmarksRef);
      if (bookmarksDoc.exists()) {
        return { success: true, data: bookmarksDoc.data().tipIds || [] };
      }
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  async toggleBookmark(userId, tipId) {
    try {
      const bookmarksRef = doc(db, 'users', userId, 'preferences', 'bookmarks');
      const bookmarksDoc = await getDoc(bookmarksRef);
      const currentBookmarks = bookmarksDoc.exists() ? bookmarksDoc.data().tipIds || [] : [];
      const isBookmarked = currentBookmarks.includes(tipId);
      
      await setDoc(bookmarksRef, {
        tipIds: isBookmarked 
          ? currentBookmarks.filter(id => id !== tipId)
          : [...currentBookmarks, tipId],
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Comments
  async getTipComments(tipId) {
    try {
      const commentsRef = collection(db, 'communityTips', tipId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, data: comments };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  async addTipComment(tipId, commentData) {
    try {
      const commentsRef = collection(db, 'communityTips', tipId, 'comments');
      await addDoc(commentsRef, { ...commentData, createdAt: serverTimestamp() });
      // Update comment count
      const tipRef = doc(db, 'communityTips', tipId);
      const tipDoc = await getDoc(tipRef);
      if (tipDoc.exists()) {
        await updateDoc(tipRef, { commentsCount: (tipDoc.data().commentsCount || 0) + 1 });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Report
  async reportTip(tipId, userId, reason) {
    try {
      const reportsRef = collection(db, 'tipReports');
      await addDoc(reportsRef, {
        tipId,
        reportedBy: userId,
        reason,
        createdAt: serverTimestamp(),
        status: 'pending',
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Delete tip
  async deleteTip(tipId) {
    try {
      // Delete the tip document
      const tipRef = doc(db, 'communityTips', tipId);
      await deleteDoc(tipRef);
      
      // Note: Comments subcollection will need to be deleted separately
      // For now, we'll just delete the main tip document
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get leaderboard data
  async getLeaderboard(category, countryFilter = null) {
    try {
      const tipsRef = collection(db, 'communityTips');
      const tipsSnapshot = await getDocs(tipsRef);
      let tips = tipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If country filter is provided, filter tips by author's country
      if (countryFilter) {
        // Get user profiles to check countries
        const usersRef = collection(db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const userCountries = {};
        usersSnapshot.docs.forEach(doc => {
          const userData = doc.data();
          userCountries[doc.id] = userData.country || userData.profile?.country || 'United Kingdom';
        });
        
        // Filter tips by users in the specified country
        tips = tips.filter(tip => userCountries[tip.authorId] === countryFilter);
      }

      // Get user countries for display
      let userCountriesMap = {};
      if (!countryFilter) {
        try {
          const usersRef = collection(db, 'users');
          const usersSnapshot = await getDocs(usersRef);
          usersSnapshot.docs.forEach(doc => {
            const userData = doc.data();
            userCountriesMap[doc.id] = userData.country || userData.profile?.country || null;
          });
        } catch (e) {
          // Silently fail if we can't get countries
        }
      }

      // Aggregate user stats
      const userStats = {};
      
      for (const tip of tips) {
        const userId = tip.authorId;
        const username = tip.authorName;
        
        if (!userStats[userId]) {
          userStats[userId] = {
            userId,
            username,
            country: userCountriesMap[userId] || null,
            tipCount: 0,
            totalLikes: 0,
            commentCount: 0,
            totalSavings: 0,
            totalPoints: 0,
            streak: 0,
            badges: [],
            lastActivity: null,
          };
        }
        
        userStats[userId].tipCount += 1;
        userStats[userId].totalLikes += tip.likesCount || 0;
        userStats[userId].totalSavings += tip.savedAmount || 0;
        
        // Calculate points with anti-gaming measures
        let points = 0;
        
        // Tip points with diminishing returns (prevents spam)
        const tipPoints = userStats[userId].tipCount <= 5 ? userStats[userId].tipCount * 10 : 
                         userStats[userId].tipCount <= 20 ? 50 + (userStats[userId].tipCount - 5) * 5 :
                         125 + (userStats[userId].tipCount - 20) * 2; // Max realistic value
        
        // Like points (can't be gamed by user)
        const likePoints = userStats[userId].totalLikes * 2;
        
        // Comment points with daily limit simulation (max 50 comments worth points)
        const commentPoints = Math.min(userStats[userId].commentCount, 50) * 1;
        
        // Savings points with realistic cap (max £50,000 worth points)
        const cappedSavings = Math.min(userStats[userId].totalSavings, 50000);
        const savingsPoints = Math.floor(cappedSavings / 100) * 5;
        
        // Streak points (3 pts per day, max 365 days)
        const streakPoints = Math.min(userStats[userId].streak || 0, 365) * 3;
        
        // Badge points (15 pts per badge average)
        const badgePoints = (userStats[userId].badges || []).length * 15;
        
        // Goal completion points (25 pts per completed goal)
        const goalPoints = (userStats[userId].goalsCompleted || 0) * 25;
        
        // Transaction logging points (1 pt per transaction, max 500)
        const transactionPoints = Math.min(userStats[userId].transactionCount || 0, 500) * 1;
        
        points = tipPoints + likePoints + commentPoints + savingsPoints + streakPoints + badgePoints + goalPoints + transactionPoints;
        userStats[userId].totalPoints = points;
        
        // Count comments for this user across all tips
        try {
          const commentsRef = collection(db, 'communityTips', tip.id, 'comments');
          const commentsSnapshot = await getDocs(commentsRef);
          const userComments = commentsSnapshot.docs.filter(doc => doc.data().authorId === userId);
          userStats[userId].commentCount += userComments.length;
        } catch (error) {
          // Comments collection might not exist
        }
      }

      // Convert to array and sort based on category
      let leaderboardData = Object.values(userStats);
      
      switch (category) {
        case 'tips':
          leaderboardData.sort((a, b) => b.tipCount - a.tipCount);
          break;
        case 'likes':
          leaderboardData.sort((a, b) => b.totalLikes - a.totalLikes);
          break;
        case 'comments':
          leaderboardData.sort((a, b) => b.commentCount - a.commentCount);
          break;
        case 'savings':
          leaderboardData.sort((a, b) => b.totalSavings - a.totalSavings);
          break;
        case 'streaks':
          leaderboardData.sort((a, b) => (b.streak || 0) - (a.streak || 0));
          break;
        case 'badges':
          leaderboardData.sort((a, b) => (b.badges || []).length - (a.badges || []).length);
          break;
        case 'points':
          leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
          break;
        default:
          leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
      }

      // Take top 50 users
      leaderboardData = leaderboardData.slice(0, 50);

      return { success: true, data: leaderboardData };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Savings verification methods
  async getUserTransactionsByDays(userId, days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', userId),
        where('date', '>=', cutoffDate),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error getting user transactions by days:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  async storeSavingsVerification(userId, tipId, verification) {
    try {
      const verificationRef = doc(db, 'savingsVerifications', `${userId}_${tipId}`);
      await setDoc(verificationRef, {
        userId,
        tipId,
        ...verification,
        createdAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error storing verification:', error);
      return { success: false, error: error.message };
    }
  }

  async getSavingsVerification(userId, tipId) {
    try {
      const verificationRef = doc(db, 'savingsVerifications', `${userId}_${tipId}`);
      const verificationDoc = await getDoc(verificationRef);
      
      if (verificationDoc.exists()) {
        return { success: true, data: verificationDoc.data() };
      }
      
      return { success: false, data: null };
    } catch (error) {
      console.error('Error getting verification:', error);
      return { success: false, error: error.message };
    }
  }

  async createPeerVerificationRequest(request) {
    try {
      const requestRef = collection(db, 'peerVerifications');
      const docRef = await addDoc(requestRef, request);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating peer verification:', error);
      return { success: false, error: error.message };
    }
  }

  async getPeerVerificationStatus(tipId) {
    try {
      const verificationsRef = collection(db, 'peerVerifications');
      const q = query(verificationsRef, where('tipId', '==', tipId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const verification = snapshot.docs[0].data();
        return { success: true, data: verification };
      }
      
      return { success: false, data: null };
    } catch (error) {
      console.error('Error getting peer verification:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserTips(userId) {
    try {
      const tipsRef = collection(db, 'communityTips');
      const q = query(tipsRef, where('authorId', '==', userId));
      const snapshot = await getDocs(q);
      
      const tips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: tips };
    } catch (error) {
      console.error('Error getting user tips:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // Notification Operations
  async getUserNotifications(userId) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
      const notificationsSnap = await getDocs(q);
      const notifications = notificationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }));
      return { success: true, data: notifications };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { success: false, error: error.message };
    }
  }

  async addNotification(userId, notificationData) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const docRef = await addDoc(notificationsRef, {
        ...notificationData,
        read: false,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding notification:', error);
      return { success: false, error: error.message };
    }
  }

  async markNotificationAsRead(userId, notificationId) {
    try {
      // Use the global notifications collection to match where notifications are stored
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const q = query(notificationsRef, where('read', '==', false));
      const notificationsSnap = await getDocs(q);
      
      const updatePromises = notificationsSnap.docs.map(doc => 
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        })
      );
      
      await Promise.all(updatePromises);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteNotification(userId, notificationId) {
    try {
      const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  async clearAllNotifications(userId) {
    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const notificationsSnap = await getDocs(notificationsRef);
      
      const deletePromises = notificationsSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove duplicate function - keeping the one that subscribes to global notifications collection

  // Admin Methods
  static async getAdminUserStats() {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let total = 0;
      let active = 0;
      let newToday = 0;
      let premium = 0;
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        total++;
        
        if (userData.isActive !== false) active++;
        if (userData.isPremium) premium++;
        
        const createdAt = userData.createdAt?.toDate() || new Date(userData.createdAt);
        if (createdAt >= todayStart) newToday++;
      });
      
      return {
        total,
        active,
        inactive: total - active,
        premium,
        newToday
      };
    } catch (error) {
      console.error('Error getting admin user stats:', error);
      return { total: 0, active: 0, inactive: 0, premium: 0, newToday: 0 };
    }
  }

  static async getAdminTransactionStats() {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      let totalTransactions = 0;
      let totalRevenue = 0;
      let transactionsToday = 0;
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      for (const userDoc of usersSnapshot.docs) {
        const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        
        transactionsSnapshot.forEach(doc => {
          const transaction = doc.data();
          totalTransactions++;
          
          if (transaction.type === 'expense') {
            totalRevenue += Math.abs(transaction.amount || 0);
          }
          
          const createdAt = transaction.createdAt?.toDate() || new Date(transaction.createdAt);
          if (createdAt >= todayStart) transactionsToday++;
        });
      }
      
      return {
        total: totalTransactions,
        revenue: totalRevenue,
        today: transactionsToday
      };
    } catch (error) {
      console.error('Error getting admin transaction stats:', error);
      return { total: 0, revenue: 0, today: 0 };
    }
  }

  static async getAllUsers() {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const users = [];
      for (const doc of usersSnapshot.docs) {
        const userData = { id: doc.id, ...doc.data() };
        
        // Get user's transaction count and total spent
        const transactionsRef = collection(db, 'users', doc.id, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        
        let transactionCount = 0;
        let totalSpent = 0;
        
        transactionsSnapshot.forEach(transactionDoc => {
          const transaction = transactionDoc.data();
          transactionCount++;
          if (transaction.type === 'expense') {
            totalSpent += Math.abs(transaction.amount || 0);
          }
        });
        
        // Get user's card count
        const cardsRef = collection(db, 'users', doc.id, 'cards');
        const cardsSnapshot = await getDocs(cardsRef);
        
        userData.transactionCount = transactionCount;
        userData.totalSpent = totalSpent;
        userData.cardCount = cardsSnapshot.size;
        userData.isActive = userData.isActive !== false;
        
        // Ensure proper date handling
        if (userData.createdAt && userData.createdAt.toDate) {
          userData.createdAt = userData.createdAt.toDate();
        } else if (userData.createdAt && typeof userData.createdAt === 'string') {
          userData.createdAt = new Date(userData.createdAt);
        } else if (!userData.createdAt) {
          userData.createdAt = new Date(); // Fallback to current date
        }
        
        users.push(userData);
      }
      
      return users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  static async getRecentUsers(limit = 10) {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const users = [];
      usersSnapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      
      return users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent users:', error);
      return [];
    }
  }

  static async suspendUser(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: false,
        suspendedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  }

  static async activateUser(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isActive: true,
        suspendedAt: deleteField()
      });
      return { success: true };
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  }

  static async deleteUser(userId) {
    try {
      // Delete user's subcollections first
      const collections = ['transactions', 'cards', 'goals', 'directDebits'];
      
      for (const collectionName of collections) {
        const collectionRef = collection(db, 'users', userId, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      
      // Delete user document
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async getSupportTickets() {
    try {
      const ticketsRef = collection(db, 'supportTickets');
      const ticketsSnapshot = await getDocs(ticketsRef);
      
      const tickets = [];
      ticketsSnapshot.forEach(doc => {
        tickets.push({ id: doc.id, ...doc.data() });
      });
      
      return tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error getting support tickets:', error);
      return [];
    }
  }

  static async getSupportStats() {
    try {
      const ticketsRef = collection(db, 'supportTickets');
      const ticketsSnapshot = await getDocs(ticketsRef);
      
      let total = 0;
      let open = 0;
      let inProgress = 0;
      let resolved = 0;
      let urgent = 0;
      
      ticketsSnapshot.forEach(doc => {
        const ticket = doc.data();
        total++;
        
        switch (ticket.status) {
          case 'open': open++; break;
          case 'in_progress': inProgress++; break;
          case 'resolved': resolved++; break;
        }
        
        if (ticket.priority === 'high' || ticket.priority === 'urgent') {
          urgent++;
        }
      });
      
      return { total, open, inProgress, resolved, urgent };
    } catch (error) {
      console.error('Error getting support stats:', error);
      return { total: 0, open: 0, inProgress: 0, resolved: 0, urgent: 0 };
    }
  }

  static async updateTicketStatus(ticketId, status) {
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        status,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  static async addTicketReply(ticketId, reply) {
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      const ticketDoc = await getDoc(ticketRef);
      
      if (ticketDoc.exists()) {
        const currentReplies = ticketDoc.data().replies || [];
        await updateDoc(ticketRef, {
          replies: [...currentReplies, reply],
          updatedAt: new Date()
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding ticket reply:', error);
      throw error;
    }
  }

  // Advanced Analytics Methods
  static async getTopSpendingCategories(timeframe = '30d') {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const categoryTotals = {};
      let totalAmount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        
        transactionsSnapshot.forEach(doc => {
          const transaction = doc.data();
          if (transaction.type === 'expense') {
            const category = transaction.category || 'Other';
            const amount = Math.abs(parseFloat(transaction.amount) || 0);
            categoryTotals[category] = (categoryTotals[category] || 0) + amount;
            totalAmount += amount;
          }
        });
      }
      
      // Convert to array and calculate percentages
      const categories = Object.entries(categoryTotals)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: Math.round((amount / totalAmount) * 100)
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Top 10 categories
      
      return categories;
    } catch (error) {
      console.error('Error getting top spending categories:', error);
      return [];
    }
  }

  static async getUserEngagementMetrics(timeframe = '30d') {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      let dailyActive = 0;
      let weeklyActive = 0;
      let totalSessions = 0;
      let totalUsers = 0;
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const lastActive = userData.lastActiveAt?.toDate() || new Date(userData.createdAt);
        
        totalUsers++;
        
        if (lastActive >= dayAgo) {
          dailyActive++;
        }
        
        if (lastActive >= weekAgo) {
          weeklyActive++;
        }
        
        // Estimate sessions (simplified)
        totalSessions += userData.sessionCount || 1;
      });
      
      return {
        dailyActive,
        weeklyActive,
        avgSessionDuration: '8m 32s', // Would need session tracking
        sessionsPerUser: totalUsers > 0 ? parseFloat((totalSessions / totalUsers).toFixed(1)) : 0,
        retentionRate: totalUsers > 0 ? Math.round((weeklyActive / totalUsers) * 100) : 0
      };
    } catch (error) {
      console.error('Error getting user engagement metrics:', error);
      return {
        dailyActive: 0,
        weeklyActive: 0,
        avgSessionDuration: '0m',
        sessionsPerUser: 0,
        retentionRate: 0
      };
    }
  }

  static async getUserGrowthData(timeframe = '30d') {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const now = new Date();
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : 30;
      
      const growthData = [];
      const usersByDate = {};
      
      // Group users by creation date
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        const createdAt = userData.createdAt?.toDate() || new Date(userData.createdAt);
        const dateKey = createdAt.toISOString().split('T')[0];
        usersByDate[dateKey] = (usersByDate[dateKey] || 0) + 1;
      });
      
      // Generate data points for the timeframe
      let cumulativeUsers = 0;
      for (let i = days; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        cumulativeUsers += usersByDate[dateKey] || 0;
        
        if (i % Math.ceil(days / 10) === 0) { // Sample 10 points
          growthData.push({
            date: dateKey,
            users: cumulativeUsers
          });
        }
      }
      
      return growthData;
    } catch (error) {
      console.error('Error getting user growth data:', error);
      return [];
    }
  }

  static async getTransactionVolumeData(timeframe = '30d') {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const now = new Date();
      const days = timeframe === '7d' ? 7 : timeframe === '90d' ? 90 : timeframe === '1y' ? 365 : 30;
      
      const volumeData = [];
      const transactionsByDate = {};
      
      // Collect all transactions by date
      for (const userDoc of usersSnapshot.docs) {
        const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        
        transactionsSnapshot.forEach(doc => {
          const transaction = doc.data();
          const createdAt = transaction.createdAt?.toDate() || new Date(transaction.createdAt);
          const dateKey = createdAt.toISOString().split('T')[0];
          
          if (!transactionsByDate[dateKey]) {
            transactionsByDate[dateKey] = { count: 0, amount: 0 };
          }
          
          transactionsByDate[dateKey].count++;
          if (transaction.type === 'expense') {
            transactionsByDate[dateKey].amount += Math.abs(parseFloat(transaction.amount) || 0);
          }
        });
      }
      
      // Generate data points
      let cumulativeCount = 0;
      let cumulativeAmount = 0;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        const dayData = transactionsByDate[dateKey] || { count: 0, amount: 0 };
        
        cumulativeCount += dayData.count;
        cumulativeAmount += dayData.amount;
        
        if (i % Math.ceil(days / 10) === 0) { // Sample 10 points
          volumeData.push({
            date: dateKey,
            count: cumulativeCount,
            amount: cumulativeAmount
          });
        }
      }
      
      return volumeData;
    } catch (error) {
      console.error('Error getting transaction volume data:', error);
      return [];
    }
  }

  // Transaction Monitoring Methods
  static async getAllTransactions() {
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const allTransactions = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
        const transactionsSnapshot = await getDocs(transactionsRef);
        
        transactionsSnapshot.forEach(doc => {
          const transaction = doc.data();
          allTransactions.push({
            id: doc.id,
            userId: userDoc.id,
            userEmail: userData.email || 'Unknown',
            userName: userData.name || userData.displayName || 'Unknown User',
            ...transaction,
            createdAt: transaction.createdAt?.toDate?.()?.toISOString() || transaction.createdAt
          });
        });
      }
      
      // Sort by date (newest first)
      allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return allTransactions;
    } catch (error) {
      console.error('Error getting all transactions:', error);
      return [];
    }
  }

  static async getTransactionStats() {
    try {
      const transactions = await this.getAllTransactions();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      let total = transactions.length;
      let flagged = 0;
      let highValue = 0;
      let today = 0;
      let totalValue = 0;
      
      transactions.forEach(transaction => {
        const amount = Math.abs(parseFloat(transaction.amount) || 0);
        const createdAt = new Date(transaction.createdAt);
        
        if (transaction.flagged) flagged++;
        if (amount >= 1000) highValue++;
        if (createdAt >= todayStart) today++;
        if (transaction.type === 'expense') totalValue += amount;
      });
      
      return {
        total: today, // Show today's count in main stat
        flagged,
        highValue,
        today,
        totalValue
      };
    } catch (error) {
      console.error('Error getting transaction stats:', error);
      return {
        total: 0,
        flagged: 0,
        highValue: 0,
        today: 0,
        totalValue: 0
      };
    }
  }

  static async flagTransaction(transactionId, reason) {
    try {
      // Find the transaction across all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const transactionRef = doc(db, 'users', userDoc.id, 'transactions', transactionId);
        const transactionDoc = await getDoc(transactionRef);
        
        if (transactionDoc.exists()) {
          await updateDoc(transactionRef, {
            flagged: true,
            flagReason: reason,
            flaggedAt: new Date(),
            flaggedBy: 'admin'
          });
          
          // Log the admin action
          await this.logAdminAction('flag_transaction', {
            transactionId,
            userId: userDoc.id,
            reason
          });
          
          return { success: true };
        }
      }
      
      throw new Error('Transaction not found');
    } catch (error) {
      console.error('Error flagging transaction:', error);
      throw error;
    }
  }

  static async reverseTransaction(transactionId) {
    try {
      // Find the transaction across all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const transactionRef = doc(db, 'users', userDoc.id, 'transactions', transactionId);
        const transactionDoc = await getDoc(transactionRef);
        
        if (transactionDoc.exists()) {
          const transactionData = transactionDoc.data();
          
          // Create a reversal transaction
          const reversalTransaction = {
            ...transactionData,
            amount: -transactionData.amount,
            description: `REVERSAL: ${transactionData.description || 'Transaction'}`,
            type: transactionData.type === 'expense' ? 'income' : 'expense',
            reversed: true,
            originalTransactionId: transactionId,
            createdAt: new Date(),
            reversedBy: 'admin'
          };
          
          // Add the reversal transaction
          const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
          await addDoc(transactionsRef, reversalTransaction);
          
          // Mark original as reversed
          await updateDoc(transactionRef, {
            reversed: true,
            reversedAt: new Date(),
            reversedBy: 'admin'
          });
          
          // Log the admin action
          await this.logAdminAction('reverse_transaction', {
            transactionId,
            userId: userDoc.id,
            amount: transactionData.amount
          });
          
          return { success: true };
        }
      }
      
      throw new Error('Transaction not found');
    } catch (error) {
      console.error('Error reversing transaction:', error);
      throw error;
    }
  }

  // Audit Logging Methods
  static async logAdminAction(action, details) {
    try {
      const auditLogsRef = collection(db, 'auditLogs');
      await addDoc(auditLogsRef, {
        action,
        details,
        timestamp: new Date(),
        adminEmail: 'spendflowapp@gmail.com', // Would get from auth context
        ip: 'localhost', // Would get from request
        userAgent: navigator.userAgent || 'Unknown'
      });
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  static async getAuditLogs(limit = 100) {
    try {
      const auditLogsRef = collection(db, 'auditLogs');
      const q = query(auditLogsRef, orderBy('timestamp', 'desc'), limit(limit));
      const snapshot = await getDocs(q);
      
      const logs = [];
      snapshot.forEach(doc => {
        logs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
        });
      });
      
      return logs;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  // Badge System Methods
  async getUserBadges(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        return {
          success: true,
          data: {
            earned: userData.badges?.earned || [],
            totalPoints: userData.badges?.totalPoints || 0,
            monthlyBadges: userData.badges?.monthlyBadges || {},
            lastUpdated: userData.badges?.lastUpdated
          }
        };
      }
      
      // Initialize badges for new user
      await this.initializeUserBadges(userId);
      return {
        success: true,
        data: {
          earned: ['first_steps'], // Everyone starts with first steps
          totalPoints: 150,
          monthlyBadges: {},
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error getting user badges:', error);
      return { success: false, error: error.message };
    }
  }

  async initializeUserBadges(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'badges.earned': ['first_steps'],
        'badges.totalPoints': 150,
        'badges.monthlyBadges': {},
        'badges.lastUpdated': serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error initializing user badges:', error);
      return { success: false, error: error.message };
    }
  }

  async awardBadge(userId, badgeId, badgePoints) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentBadges = userData.badges?.earned || [];
        
        // Check if user already has this badge
        if (currentBadges.includes(badgeId)) {
          return { success: false, error: 'Badge already earned' };
        }
        
        // Add badge and update points
        const newBadges = [...currentBadges, badgeId];
        const newTotalPoints = (userData.badges?.totalPoints || 0) + badgePoints;
        
        await updateDoc(userRef, {
          'badges.earned': newBadges,
          'badges.totalPoints': newTotalPoints,
          'badges.lastUpdated': serverTimestamp()
        });
        
        // Add notification for badge earned
        await this.addNotification(userId, {
          type: 'badge_earned',
          title: 'Badge Earned! 🎖️',
          message: `You earned a new badge and ${badgePoints} points!`,
          badgeId: badgeId,
          points: badgePoints
        });
        
        return { success: true, newTotalPoints };
      }
      
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Error awarding badge:', error);
      return { success: false, error: error.message };
    }
  }

  async checkAndAwardBadges(userId) {
    try {
      // Get user's current activities and badges
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return { success: false, error: 'User not found' };
      
      const userData = userSnap.data();
      const currentBadges = userData.badges?.earned || [];
      const activities = userData.activities || {};
      
      // Badge definitions with earning criteria
      const badgeChecks = [
        {
          id: 'money_tracker',
          points: 300,
          check: () => (activities.transactionCount || 0) >= 100
        },
        {
          id: 'savings_milestone_1k',
          points: 500,
          check: () => (activities.totalSavings || 0) >= 1000
        },
        {
          id: 'savings_milestone_5k',
          points: 1200,
          check: () => (activities.totalSavings || 0) >= 5000
        },
        {
          id: 'helpful_hero',
          points: 500,
          check: () => (activities.tipCount || 0) >= 20 && (activities.totalLikes || 0) >= 50
        },
        {
          id: 'week_warrior',
          points: 400,
          check: () => (activities.currentStreak || 0) >= 30
        }
      ];
      
      const newlyEarned = [];
      
      // Check each badge
      for (const badge of badgeChecks) {
        if (!currentBadges.includes(badge.id) && badge.check()) {
          const result = await this.awardBadge(userId, badge.id, badge.points);
          if (result.success) {
            newlyEarned.push(badge.id);
          }
        }
      }
      
      return { success: true, newlyEarned };
    } catch (error) {
      console.error('Error checking badges:', error);
      return { success: false, error: error.message };
    }
  }

  async updateUserActivity(userId, activityType, value) {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = {
        [`activities.${activityType}`]: value,
        'activities.lastActivity': serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);
      
      // Check for new badges after activity update
      await this.checkAndAwardBadges(userId);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user activity:', error);
      return { success: false, error: error.message };
    }
  }

  // Add more admin methods as needed

  // ========== SOCIAL FINANCE METHODS ==========
  
  // User Search Operations
  async searchUsersByEmail(email) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error('Error searching users by email:', error);
      return [];
    }
  }

  async searchUsers(query) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, 
        where('email', '>=', query.toLowerCase()),
        where('email', '<=', query.toLowerCase() + '\uf8ff')
      );
      const querySnapshot = await getDocs(q);
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  async getUserDetails(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user details:', error);
      return null;
    }
  }

  // Connection Operations
  async createConnectionRequest(requestData) {
    try {
      const requestsRef = collection(db, 'connectionRequests');
      const docRef = await addDoc(requestsRef, {
        ...requestData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating connection request:', error);
      return { success: false, error: error.message };
    }
  }

  async updateConnectionRequest(requestId, updateData) {
    try {
      const requestRef = doc(db, 'connectionRequests', requestId);
      await updateDoc(requestRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating connection request:', error);
      return { success: false, error: error.message };
    }
  }

  async getPendingConnectionRequests(userId) {
    try {
      const requestsRef = collection(db, 'connectionRequests');
      const q = query(requestsRef, 
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      return requests;
    } catch (error) {
      console.error('Error getting pending connection requests:', error);
      return [];
    }
  }

  async checkExistingConnection(userId1, userId2) {
    try {
      const connectionsRef = collection(db, 'connections');
      const q = query(connectionsRef, 
        where('userId1', 'in', [userId1, userId2]),
        where('userId2', 'in', [userId1, userId2])
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error checking existing connection:', error);
      return null;
    }
  }

  async createConnection(connectionData) {
    try {
      const connectionsRef = collection(db, 'connections');
      const docRef = await addDoc(connectionsRef, {
        ...connectionData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating connection:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserConnections(userId) {
    try {
      const connectionsRef = collection(db, 'connections');
      const q = query(connectionsRef, 
        where('userId1', '==', userId),
        where('status', '==', 'active')
      );
      const querySnapshot = await getDocs(q);
      const connections = [];
      querySnapshot.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data() });
      });

      // Also check where user is userId2
      const q2 = query(connectionsRef, 
        where('userId2', '==', userId),
        where('status', '==', 'active')
      );
      const querySnapshot2 = await getDocs(q2);
      querySnapshot2.forEach((doc) => {
        connections.push({ id: doc.id, ...doc.data() });
      });

      return connections;
    } catch (error) {
      console.error('Error getting user connections:', error);
      return [];
    }
  }

  async removeConnection(userId1, userId2) {
    try {
      const connectionsRef = collection(db, 'connections');
      const q = query(connectionsRef, 
        where('userId1', 'in', [userId1, userId2]),
        where('userId2', 'in', [userId1, userId2])
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error removing connection:', error);
      return { success: false, error: error.message };
    }
  }

  async blockUser(userId, blockedUserId) {
    try {
      const blocksRef = collection(db, 'userBlocks');
      await addDoc(blocksRef, {
        userId,
        blockedUserId,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }
  }

  // Payment Request Operations
  async createPaymentRequest(requestData) {
    try {
      const requestsRef = collection(db, 'paymentRequests');
      const docRef = await addDoc(requestsRef, {
        ...requestData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating payment request:', error);
      return { success: false, error: error.message };
    }
  }

  async getPaymentRequest(requestId) {
    try {
      const requestRef = doc(db, 'paymentRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      if (requestDoc.exists()) {
        return { id: requestDoc.id, ...requestDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting payment request:', error);
      return null;
    }
  }

  async updatePaymentRequest(requestId, updateData) {
    try {
      const requestRef = doc(db, 'paymentRequests', requestId);
      await updateDoc(requestRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating payment request:', error);
      return { success: false, error: error.message };
    }
  }

  async getSentPaymentRequests(userId) {
    try {
      const requestsRef = collection(db, 'paymentRequests');
      const q = query(requestsRef, 
        where('fromUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      return requests;
    } catch (error) {
      console.error('Error getting sent payment requests:', error);
      return [];
    }
  }

  async getReceivedPaymentRequests(userId) {
    try {
      const requestsRef = collection(db, 'paymentRequests');
      const q = query(requestsRef, 
        where('toUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const requests = [];
      querySnapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });
      return requests;
    } catch (error) {
      console.error('Error getting received payment requests:', error);
      return [];
    }
  }

  // Split Bill Operations
  async createSplitBillRequest(splitData) {
    try {
      const splitBillsRef = collection(db, 'splitBills');
      const docRef = await addDoc(splitBillsRef, {
        ...splitData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating split bill request:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserSplitBills(userId) {
    try {
      const splitBillsRef = collection(db, 'splitBills');
      
      // Get split bills where user is organizer
      const organizerQuery = query(splitBillsRef, 
        where('organizerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      // Get split bills where user is a participant
      const participantQuery = query(splitBillsRef, 
        where('participants', 'array-contains', { userId }),
        orderBy('createdAt', 'desc')
      );
      
      const [organizerSnapshot, participantSnapshot] = await Promise.all([
        getDocs(organizerQuery),
        getDocs(participantQuery)
      ]);
      
      const splitBills = [];
      const seenIds = new Set();
      
      // Add organizer split bills
      organizerSnapshot.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          splitBills.push({ id: doc.id, ...doc.data() });
          seenIds.add(doc.id);
        }
      });
      
      // Add participant split bills
      participantSnapshot.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          splitBills.push({ id: doc.id, ...doc.data() });
          seenIds.add(doc.id);
        }
      });
      
      return { success: true, data: splitBills };
    } catch (error) {
      console.error('Error getting user split bills:', error);
      return { success: false, data: [] };
    }
  }

  async updateSplitBill(splitBillId, updateData) {
    try {
      const splitBillRef = doc(db, 'splitBills', splitBillId);
      await updateDoc(splitBillRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating split bill:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSplitBillParticipant(splitBillId, userId, updateData) {
    try {
      const splitBillRef = doc(db, 'splitBills', splitBillId);
      const splitBillDoc = await getDoc(splitBillRef);
      if (splitBillDoc.exists()) {
        const splitBill = splitBillDoc.data();
        const updatedParticipants = splitBill.participants.map(p => 
          p.userId === userId ? { ...p, ...updateData } : p
        );
        await updateDoc(splitBillRef, {
          participants: updatedParticipants,
          updatedAt: serverTimestamp()
        });
        return { success: true };
      }
      return { success: false, error: 'Split bill not found' };
    } catch (error) {
      console.error('Error updating split bill participant:', error);
      return { success: false, error: error.message };
    }
  }

  // Smart Transfer Operations
  async createSmartTransferMatch(matchData) {
    try {
      const matchesRef = collection(db, 'smartTransferMatches');
      const docRef = await addDoc(matchesRef, {
        ...matchData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating smart transfer match:', error);
      return { success: false, error: error.message };
    }
  }

  async getSmartTransferMatch(matchId) {
    try {
      const matchRef = doc(db, 'smartTransferMatches', matchId);
      const matchDoc = await getDoc(matchRef);
      if (matchDoc.exists()) {
        return { id: matchDoc.id, ...matchDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting smart transfer match:', error);
      return null;
    }
  }

  async updateSmartTransferMatch(matchId, updateData) {
    try {
      const matchRef = doc(db, 'smartTransferMatches', matchId);
      await updateDoc(matchRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating smart transfer match:', error);
      return { success: false, error: error.message };
    }
  }

  async checkExistingSmartTransferMatch(transferId, depositId) {
    try {
      const matchesRef = collection(db, 'smartTransferMatches');
      const q = query(matchesRef, 
        where('transferTransactionId', '==', transferId),
        where('depositTransactionId', '==', depositId)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error checking existing smart transfer match:', error);
      return null;
    }
  }

  async getUserSmartTransferMatches(userId) {
    try {
      const matchesRef = collection(db, 'smartTransferMatches');
      const q = query(matchesRef, 
        where('transferUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const matches = [];
      querySnapshot.forEach((doc) => {
        matches.push({ id: doc.id, ...doc.data() });
      });

      // Also check where user is depositUserId
      const q2 = query(matchesRef, 
        where('depositUserId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot2 = await getDocs(q2);
      querySnapshot2.forEach((doc) => {
        matches.push({ id: doc.id, ...doc.data() });
      });

      return matches;
    } catch (error) {
      console.error('Error getting user smart transfer matches:', error);
      return [];
    }
  }

  // Notification Operations
  async createNotification(notificationData) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const docRef = await addDoc(notificationsRef, {
        ...notificationData,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserNotifications(userId, limitCount = 50, unreadOnly = false) {
    try {
      const notificationsRef = collection(db, 'notifications');
      let q = query(notificationsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      if (unreadOnly) {
        q = query(notificationsRef, 
          where('userId', '==', userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  async updateNotification(notificationId, updateData) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      
      // Check if document exists before updating
      const notificationDoc = await getDoc(notificationRef);
      if (!notificationDoc.exists()) {
        console.warn('Notification document does not exist:', notificationId);
        return { success: false, error: 'Notification not found' };
      }
      
      await updateDoc(notificationRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating notification:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await deleteDoc(notificationRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }
  }

  async markAllNotificationsAsRead(userId) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, 
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { 
          read: true, 
          readAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  async getUnreadNotificationCount(userId) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, 
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  // Notification Preferences
  async createNotificationPreferences(userId, preferences) {
    try {
      const prefsRef = doc(db, 'notificationPreferences', userId);
      await setDoc(prefsRef, {
        ...preferences,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error creating notification preferences:', error);
      return { success: false, error: error.message };
    }
  }

  async getNotificationPreferences(userId) {
    try {
      const prefsRef = doc(db, 'notificationPreferences', userId);
      const prefsDoc = await getDoc(prefsRef);
      if (prefsDoc.exists()) {
        return prefsDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(userId, preferences) {
    try {
      const prefsRef = doc(db, 'notificationPreferences', userId);
      await updateDoc(prefsRef, {
        ...preferences,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { success: false, error: error.message };
    }
  }

  // Connection Settings
  async updateConnectionSettings(userId, connectionUserId, settings) {
    try {
      const settingsRef = doc(db, 'connectionSettings', `${userId}_${connectionUserId}`);
      await setDoc(settingsRef, {
        ...settings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating connection settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Transaction Operations for Smart Transfers
  async getTransaction(transactionId) {
    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      const transactionDoc = await getDoc(transactionRef);
      if (transactionDoc.exists()) {
        return { id: transactionDoc.id, ...transactionDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting transaction:', error);
      return null;
    }
  }

  async updateTransaction(transactionId, updateData) {
    try {
      const transactionRef = doc(db, 'transactions', transactionId);
      await updateDoc(transactionRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { success: false, error: error.message };
    }
  }

  async getRecentTransactions(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const transactionsRef = collection(db, 'transactions');
      const q = query(transactionsRef, 
        where('date', '>=', cutoffTime.toISOString()),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const transactions = [];
      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      return transactions;
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      return [];
    }
  }

  // ========== MISSING METHODS FOR EXISTING FEATURES ==========
  
  // Chart subscription methods
  subscribeToUserDashboardCharts(userId, callback) {
    try {
      const chartsRef = collection(db, 'users', userId, 'dashboardCharts');
      const q = query(chartsRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (querySnapshot) => {
        const charts = [];
        querySnapshot.forEach((doc) => {
          charts.push({ id: doc.id, ...doc.data() });
        });
        callback(charts);
      }, (error) => {
        console.error('Error subscribing to dashboard charts:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up dashboard charts subscription:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Notification subscription methods
  subscribeToNotifications(userId, callback) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach((doc) => {
          notifications.push({ id: doc.id, ...doc.data() });
        });
        callback(notifications);
      }, (error) => {
        console.error('Error subscribing to notifications:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up notifications subscription:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // User dashboard charts methods
  async addDashboardChart(userId, chartData) {
    try {
      const chartsRef = collection(db, 'users', userId, 'dashboardCharts');
      const docRef = await addDoc(chartsRef, {
        ...chartData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding dashboard chart:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDashboardChart(userId, chartId, updateData) {
    try {
      const chartRef = doc(db, 'users', userId, 'dashboardCharts', chartId);
      await updateDoc(chartRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating dashboard chart:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteDashboardChart(userId, chartId) {
    try {
      const chartRef = doc(db, 'users', userId, 'dashboardCharts', chartId);
      await deleteDoc(chartRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting dashboard chart:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserDashboardCharts(userId) {
    try {
      const chartsRef = collection(db, 'users', userId, 'dashboardCharts');
      const q = query(chartsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const charts = [];
      querySnapshot.forEach((doc) => {
        charts.push({ id: doc.id, ...doc.data() });
      });
      return charts;
    } catch (error) {
      console.error('Error getting user dashboard charts:', error);
      return [];
    }
  }
}

export default new FirebaseService();
export { FirebaseService };
