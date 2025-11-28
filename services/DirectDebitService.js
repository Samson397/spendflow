import FirebaseService from './FirebaseService';

class DirectDebitService {
  
  // Process all due direct debits for a user
  static async processDirectDebits(userId) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get all active direct debits for the user
      const directDebitsResult = await FirebaseService.getUserDirectDebits(userId);
      if (!directDebitsResult.success) {
        return { success: false, error: 'Failed to fetch direct debits' };
      }
      
      const activeDebits = directDebitsResult.data.filter(dd => dd.status === 'Active');
      const dueDebits = [];
      
      // Check which direct debits are due today
      activeDebits.forEach(debit => {
        if (this.isPaymentDue(debit, today)) {
          dueDebits.push(debit);
        }
      });
      
      if (dueDebits.length === 0) {
        return { success: true, message: 'No direct debits due today', processedPayments: [] };
      }
      
      // Get user's cards to check balances
      const cardsResult = await FirebaseService.getUserCards(userId);
      if (!cardsResult.success) {
        return { success: false, error: 'Failed to fetch user cards' };
      }
      
      const processedPayments = [];
      const failedPayments = [];
      
      // Process each due direct debit
      for (const debit of dueDebits) {
        const result = await this.processIndividualDebit(userId, debit, cardsResult.data);
        
        if (result.success) {
          processedPayments.push(result);
          // Update next payment date
          await this.updateNextPaymentDate(debit);
        } else {
          failedPayments.push(result);
        }
      }
      
      // Send notifications to user
      if (processedPayments.length > 0) {
        await this.sendSuccessNotifications(userId, processedPayments);
      }
      
      if (failedPayments.length > 0) {
        await this.sendFailureNotifications(userId, failedPayments);
      }
      
      return {
        success: true,
        processedPayments,
        failedPayments,
        totalProcessed: processedPayments.length,
        totalFailed: failedPayments.length
      };
      
    } catch (error) {
      console.error('Error processing direct debits:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Check if a direct debit payment is due today
  static isPaymentDue(debit, today) {
    if (!debit.nextDate) return false;
    
    const nextPaymentDate = new Date(debit.nextDate);
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const paymentDate = new Date(nextPaymentDate.getFullYear(), nextPaymentDate.getMonth(), nextPaymentDate.getDate());
    
    return paymentDate.getTime() === todayDate.getTime();
  }
  
  // Process an individual direct debit payment
  static async processIndividualDebit(userId, debit, userCards) {
    try {
      // Find the card to debit from
      const sourceCard = userCards.find(card => card.id === debit.cardId);
      if (!sourceCard) {
        return {
          success: false,
          debit,
          error: 'Source card not found',
          errorType: 'CARD_NOT_FOUND'
        };
      }
      
      // Parse the payment amount
      const amountStr = debit.amount.replace(/[£$€,]/g, '');
      const paymentAmount = parseFloat(amountStr);
      
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return {
          success: false,
          debit,
          error: 'Invalid payment amount',
          errorType: 'INVALID_AMOUNT'
        };
      }
      
      // Check available balance
      const balanceCheck = await this.checkAvailableBalance(userId, sourceCard, paymentAmount);
      
      if (!balanceCheck.sufficient) {
        return {
          success: false,
          debit,
          error: `Insufficient funds. Available: ${balanceCheck.availableBalance}, Required: £${paymentAmount.toFixed(2)}`,
          errorType: 'INSUFFICIENT_FUNDS',
          availableBalance: balanceCheck.availableBalance,
          requiredAmount: paymentAmount
        };
      }
      
      // Create the transaction
      const transaction = {
        cardId: sourceCard.id,
        amount: `-£${paymentAmount.toFixed(2)}`,
        description: `Direct Debit: ${debit.name}`,
        category: debit.category || 'Other',
        date: new Date().toISOString(),
        type: 'direct_debit',
        directDebitId: debit.id,
        frequency: debit.frequency,
        status: 'completed'
      };
      
      // Add transaction to Firebase
      const transactionResult = await FirebaseService.addTransaction(userId, transaction);
      
      if (transactionResult.success) {
        return {
          success: true,
          debit,
          transaction,
          amount: paymentAmount,
          sourceCard: sourceCard.name,
          transactionId: transactionResult.id
        };
      } else {
        return {
          success: false,
          debit,
          error: 'Failed to create transaction',
          errorType: 'TRANSACTION_FAILED'
        };
      }
      
    } catch (error) {
      console.error('Error processing individual debit:', error);
      return {
        success: false,
        debit,
        error: error.message,
        errorType: 'PROCESSING_ERROR'
      };
    }
  }
  
  // Check available balance for a card
  static async checkAvailableBalance(userId, card, requiredAmount) {
    try {
      // Get all transactions for this card
      const transactionsResult = await FirebaseService.getCardTransactions(userId, card.id);
      
      if (!transactionsResult.success) {
        return { sufficient: false, availableBalance: '£0.00', error: 'Failed to fetch transactions' };
      }
      
      // Calculate current balance
      let balance = 0;
      transactionsResult.data.forEach(transaction => {
        const amount = parseFloat(transaction.amount?.replace(/[^0-9.-]/g, '') || 0);
        if (transaction.amount?.startsWith('-')) {
          balance -= Math.abs(amount);
        } else if (transaction.amount?.startsWith('+')) {
          balance += Math.abs(amount);
        }
      });
      
      // For credit cards, check against credit limit
      if (card.type === 'credit') {
        const creditLimit = parseFloat(card.creditLimit?.replace(/[^0-9.-]/g, '') || 0);
        const availableCredit = creditLimit + balance; // balance is negative for credit cards
        
        return {
          sufficient: availableCredit >= requiredAmount,
          availableBalance: `£${availableCredit.toFixed(2)}`,
          currentBalance: balance,
          creditLimit
        };
      } else {
        // For debit cards, check actual balance
        return {
          sufficient: balance >= requiredAmount,
          availableBalance: `£${balance.toFixed(2)}`,
          currentBalance: balance
        };
      }
      
    } catch (error) {
      console.error('Error checking balance:', error);
      return { sufficient: false, availableBalance: '£0.00', error: error.message };
    }
  }
  
  // Update next payment date based on frequency
  static async updateNextPaymentDate(debit) {
    try {
      const currentDate = new Date(debit.nextDate);
      let nextDate;
      
      switch (debit.frequency.toLowerCase()) {
        case 'weekly':
          nextDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000));
          break;
        case 'monthly':
          nextDate = new Date(currentDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate = new Date(currentDate);
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate = new Date(currentDate);
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          // Default to monthly
          nextDate = new Date(currentDate);
          nextDate.setMonth(nextDate.getMonth() + 1);
      }
      
      // Update the direct debit with new next payment date
      const updateData = {
        ...debit,
        nextDate: nextDate.toISOString().split('T')[0], // YYYY-MM-DD format
        lastPaymentDate: new Date().toISOString().split('T')[0]
      };
      
      return await FirebaseService.updateDirectDebit(debit.id, updateData);
      
    } catch (error) {
      console.error('Error updating next payment date:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Send success notifications
  static async sendSuccessNotifications(userId, processedPayments) {
    try {
      const totalAmount = processedPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      const notification = {
        title: '✅ Direct Debits Processed',
        message: `${processedPayments.length} direct debit${processedPayments.length > 1 ? 's' : ''} processed successfully. Total: £${totalAmount.toFixed(2)}`,
        type: 'direct_debit_success',
        userId,
        timestamp: new Date().toISOString(),
        data: {
          processedPayments,
          totalAmount,
          count: processedPayments.length
        }
      };
      
      // You can integrate with your notification service here
      console.log('Success notification:', notification);
      
    } catch (error) {
      console.error('Error sending success notifications:', error);
    }
  }
  
  // Send failure notifications
  static async sendFailureNotifications(userId, failedPayments) {
    try {
      const insufficientFundsFailures = failedPayments.filter(p => p.errorType === 'INSUFFICIENT_FUNDS');
      
      if (insufficientFundsFailures.length > 0) {
        const notification = {
          title: '⚠️ Direct Debit Payment Failed',
          message: `${insufficientFundsFailures.length} direct debit${insufficientFundsFailures.length > 1 ? 's' : ''} failed due to insufficient funds. Please check your account balance.`,
          type: 'direct_debit_failed',
          priority: 'high',
          userId,
          timestamp: new Date().toISOString(),
          data: {
            failedPayments: insufficientFundsFailures,
            reason: 'insufficient_funds'
          }
        };
        
        console.log('Failure notification:', notification);
      }
      
      // Handle other types of failures
      const otherFailures = failedPayments.filter(p => p.errorType !== 'INSUFFICIENT_FUNDS');
      if (otherFailures.length > 0) {
        const notification = {
          title: '❌ Direct Debit Error',
          message: `${otherFailures.length} direct debit${otherFailures.length > 1 ? 's' : ''} failed to process. Please contact support.`,
          type: 'direct_debit_error',
          priority: 'medium',
          userId,
          timestamp: new Date().toISOString(),
          data: {
            failedPayments: otherFailures
          }
        };
        
        console.log('Error notification:', notification);
      }
      
    } catch (error) {
      console.error('Error sending failure notifications:', error);
    }
  }
  
  // Get upcoming direct debits for a user (next 30 days)
  static async getUpcomingDirectDebits(userId) {
    try {
      const directDebitsResult = await FirebaseService.getUserDirectDebits(userId);
      if (!directDebitsResult.success) {
        return { success: false, error: 'Failed to fetch direct debits' };
      }
      
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      const upcomingDebits = directDebitsResult.data
        .filter(debit => debit.status === 'Active' && debit.nextDate)
        .map(debit => {
          const nextPaymentDate = new Date(debit.nextDate);
          return {
            ...debit,
            nextPaymentDate,
            daysUntilPayment: Math.ceil((nextPaymentDate - today) / (24 * 60 * 60 * 1000))
          };
        })
        .filter(debit => debit.nextPaymentDate >= today && debit.nextPaymentDate <= thirtyDaysFromNow)
        .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate);
      
      return { success: true, data: upcomingDebits };
      
    } catch (error) {
      console.error('Error getting upcoming direct debits:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Simulate what would happen if direct debits were processed (dry run)
  static async simulateDirectDebitProcessing(userId) {
    try {
      const today = new Date();
      const directDebitsResult = await FirebaseService.getUserDirectDebits(userId);
      
      if (!directDebitsResult.success) {
        return { success: false, error: 'Failed to fetch direct debits' };
      }
      
      const activeDebits = directDebitsResult.data.filter(dd => dd.status === 'Active');
      const dueDebits = activeDebits.filter(debit => this.isPaymentDue(debit, today));
      
      if (dueDebits.length === 0) {
        return { success: true, message: 'No direct debits due today', simulation: [] };
      }
      
      const cardsResult = await FirebaseService.getUserCards(userId);
      if (!cardsResult.success) {
        return { success: false, error: 'Failed to fetch user cards' };
      }
      
      const simulation = [];
      
      for (const debit of dueDebits) {
        const sourceCard = cardsResult.data.find(card => card.id === debit.cardId);
        const amountStr = debit.amount.replace(/[£$€,]/g, '');
        const paymentAmount = parseFloat(amountStr);
        
        if (sourceCard && !isNaN(paymentAmount)) {
          const balanceCheck = await this.checkAvailableBalance(userId, sourceCard, paymentAmount);
          
          simulation.push({
            debit,
            sourceCard: sourceCard.name,
            amount: paymentAmount,
            willSucceed: balanceCheck.sufficient,
            availableBalance: balanceCheck.availableBalance,
            reason: balanceCheck.sufficient ? 'Sufficient funds' : 'Insufficient funds'
          });
        }
      }
      
      return { success: true, simulation };
      
    } catch (error) {
      console.error('Error simulating direct debit processing:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DirectDebitService;
