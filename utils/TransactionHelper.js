import FirebaseService from '../services/FirebaseService';
import { getCurrentISODate, formatCurrentTime } from './DateUtils';

/**
 * Transaction helper utilities for consistent transaction creation and management
 */

/**
 * Create and save a transaction to Firebase
 * @param {string} userId - User ID
 * @param {string} type - Transaction type (expense, income, refund, transfer)
 * @param {number} amount - Transaction amount (positive number)
 * @param {string} cardId - Card ID
 * @param {object} card - Card object with bank and lastFour
 * @param {string} description - Transaction description
 * @param {string} category - Transaction category
 * @param {string} currencySymbol - Currency symbol (default: £)
 * @param {object} additionalData - Any additional transaction data
 * @returns {Promise<object>} Result object with success status
 */
export const createTransaction = async (
  userId,
  type,
  amount,
  cardId,
  card,
  description,
  category,
  currencySymbol = '£',
  additionalData = {}
) => {
  const absAmount = Math.abs(amount);
  const sign = type === 'expense' ? '-' : '+';
  
  const transactionData = {
    type,
    amount: `${sign}${currencySymbol}${absAmount.toFixed(2)}`,
    category,
    description,
    date: getCurrentISODate(),
    time: formatCurrentTime(),
    cardId,
    cardName: card ? `${card.bank} ****${card.lastFour}` : '',
    ...additionalData
  };

  return await FirebaseService.addTransaction(userId, transactionData);
};

/**
 * Update card balance after a transaction
 * @param {string} userId - User ID
 * @param {string} cardId - Card ID
 * @param {number} currentBalance - Current card balance
 * @param {number} amount - Transaction amount (positive for increase, negative for decrease)
 * @returns {Promise<object>} Result object with success status
 */
export const updateCardBalance = async (userId, cardId, currentBalance, amount) => {
  const newBalance = currentBalance + amount;
  return await FirebaseService.updateCard(userId, cardId, { balance: newBalance });
};

/**
 * Create a transaction and update card balance in one operation
 * @param {string} userId - User ID
 * @param {object} transactionParams - Transaction parameters
 * @param {object} balanceUpdate - Balance update parameters
 * @returns {Promise<object>} Result object with success status
 */
export const createTransactionWithBalanceUpdate = async (
  userId,
  transactionParams,
  balanceUpdate
) => {
  const { type, amount, cardId, card, description, category, currencySymbol, additionalData } = transactionParams;
  const { cardId: updateCardId, currentBalance, transactionAmount } = balanceUpdate;
  
  try {
    // Create transaction
    const transactionResult = await createTransaction(
      userId,
      type,
      amount,
      cardId,
      card,
      description,
      category,
      currencySymbol,
      additionalData
    );
    
    if (!transactionResult.success) {
      return { success: false, error: 'Failed to create transaction' };
    }
    
    // Update card balance
    const balanceResult = await updateCardBalance(
      userId,
      updateCardId || cardId,
      currentBalance,
      transactionAmount
    );
    
    if (!balanceResult.success) {
      console.warn('Transaction created but balance update failed:', balanceResult.error);
      // Still return success since transaction was created
    }
    
    return { success: true, transactionId: transactionResult.id };
  } catch (error) {
    console.error('Error in createTransactionWithBalanceUpdate:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Validate sufficient funds before transaction
 * @param {number} amount - Transaction amount
 * @param {number} availableBalance - Available balance
 * @param {number} overdraftLimit - Overdraft limit (optional)
 * @returns {object} Validation result with success status and message
 */
export const validateSufficientFunds = (amount, availableBalance, overdraftLimit = 0) => {
  const totalAvailable = availableBalance + overdraftLimit;
  
  if (amount > totalAvailable) {
    return {
      success: false,
      message: `Insufficient funds. Available: £${totalAvailable.toFixed(2)}${overdraftLimit > 0 ? ` (including £${overdraftLimit} overdraft)` : ''}`
    };
  }
  
  return { success: true };
};

/**
 * Validate credit limit before transaction
 * @param {number} amount - Transaction amount
 * @param {number} currentBalance - Current balance owed
 * @param {number} creditLimit - Credit limit
 * @returns {object} Validation result with success status and message
 */
export const validateCreditLimit = (amount, currentBalance, creditLimit) => {
  const availableCredit = creditLimit - currentBalance;
  
  if (amount > availableCredit) {
    return {
      success: false,
      message: `Credit limit exceeded. Available credit: £${availableCredit.toFixed(2)} (£${creditLimit.toFixed(2)} limit - £${currentBalance.toFixed(2)} balance)`
    };
  }
  
  return { success: true };
};
