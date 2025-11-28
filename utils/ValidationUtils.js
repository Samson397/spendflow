// Custom alert will be injected via context

/**
 * Comprehensive validation utilities for financial transactions
 */

/**
 * Parse monetary amount from various formats
 * @param {string|number} amount - Amount to parse
 * @returns {number} Parsed numeric amount
 */
export const parseAmount = (amount) => {
  if (typeof amount === 'number') return amount;
  if (!amount) return 0;
  
  // Remove all non-numeric characters except decimal point and minus
  const cleaned = String(amount).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Validate sufficient funds for debit card transaction
 * @param {object} card - Debit card object
 * @param {number} amount - Transaction amount
 * @param {string} currency - Currency symbol
 * @returns {object} Validation result
 */
export const validateDebitFunds = (card, amount, currency = '£') => {
  const balance = parseAmount(card.balance);
  const overdraftLimit = card.overdraftEnabled ? parseAmount(card.overdraftLimit) : 0;
  const totalAvailable = balance + overdraftLimit;
  
  if (amount > totalAvailable) {
    const message = `Your available balance is ${currency}${totalAvailable.toLocaleString()}${overdraftLimit > 0 ? ` (including ${currency}${overdraftLimit.toLocaleString()} overdraft)` : ''}. Please enter a smaller amount.`;
    
    return {
      valid: false,
      error: 'INSUFFICIENT_FUNDS',
      title: 'Insufficient Funds',
      message: message,
      available: totalAvailable,
      requested: amount,
      shortfall: amount - totalAvailable
    };
  }
  
  return { valid: true };
};

/**
 * Validate credit limit for credit card transaction
 * @param {object} card - Credit card object
 * @param {number} amount - Transaction amount
 * @param {string} currency - Currency symbol
 * @returns {object} Validation result
 */
export const validateCreditLimit = (card, amount, currency = '£') => {
  const currentBalance = parseAmount(card.balance);
  const creditLimit = parseAmount(card.limit);
  const availableCredit = creditLimit - currentBalance;
  
  if (amount > availableCredit) {
    const message = `Your available credit is ${currency}${availableCredit.toLocaleString()} (${currency}${creditLimit.toLocaleString()} limit - ${currency}${currentBalance.toLocaleString()} balance). Please enter a smaller amount.`;
    
    return {
      valid: false,
      error: 'CREDIT_LIMIT_EXCEEDED',
      title: 'Credit Limit Exceeded',
      message: message,
      available: availableCredit,
      requested: amount,
      shortfall: amount - availableCredit,
      currentBalance: currentBalance,
      creditLimit: creditLimit
    };
  }
  
  return { valid: true };
};

/**
 * Validate transaction amount
 * @param {string|number} amount - Amount to validate
 * @returns {object} Validation result
 */
export const validateAmount = (amount) => {
  const parsed = parseAmount(amount);
  
  if (parsed <= 0) {
    return {
      valid: false,
      error: 'INVALID_AMOUNT',
      title: 'Invalid Amount',
      message: 'Please enter a valid amount greater than zero.',
      parsed: parsed
    };
  }
  
  if (parsed > 1000000) {
    return {
      valid: false,
      error: 'AMOUNT_TOO_LARGE',
      title: 'Amount Too Large',
      message: 'Maximum transaction amount is £1,000,000. Please enter a smaller amount.',
      parsed: parsed
    };
  }
  
  return { valid: true, parsed: parsed };
};

/**
 * Validate card selection
 * @param {string} cardId - Selected card ID
 * @param {array} userCards - Array of user's cards
 * @returns {object} Validation result
 */
export const validateCardSelection = (cardId, userCards) => {
  if (!cardId) {
    return {
      valid: false,
      error: 'NO_CARD_SELECTED',
      title: 'No Card Selected',
      message: 'Please select a card for this transaction.'
    };
  }
  
  const selectedCard = userCards.find(c => c.id === cardId);
  
  if (!selectedCard) {
    return {
      valid: false,
      error: 'CARD_NOT_FOUND',
      title: 'Card Not Found',
      message: 'Selected card not found. Please select a different card.'
    };
  }
  
  return { valid: true, card: selectedCard };
};

/**
 * Comprehensive transaction validation
 * @param {object} params - Validation parameters
 * @returns {object} Validation result
 */
export const validateTransaction = ({ 
  amount, 
  cardId, 
  userCards, 
  currency = '£',
  transactionType = 'expense'
}) => {
  // Validate amount
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }
  
  // Validate card selection
  const cardValidation = validateCardSelection(cardId, userCards);
  if (!cardValidation.valid) {
    return cardValidation;
  }
  
  const { card } = cardValidation;
  const { parsed: parsedAmount } = amountValidation;
  
  // Skip balance validation for income transactions
  if (transactionType === 'income' || transactionType === 'refund') {
    return { valid: true, card, amount: parsedAmount };
  }
  
  // Validate funds based on card type
  if (card.type === 'debit') {
    const fundsValidation = validateDebitFunds(card, parsedAmount, currency);
    if (!fundsValidation.valid) {
      return fundsValidation;
    }
  } else if (card.type === 'credit') {
    const creditValidation = validateCreditLimit(card, parsedAmount, currency);
    if (!creditValidation.valid) {
      return creditValidation;
    }
  }
  
  return { valid: true, card, amount: parsedAmount };
};

/**
 * Show validation error to user with custom alert
 * @param {object} validation - Validation result object
 * @param {function} customAlert - Custom alert function from context
 */
export const showValidationError = (validation, customAlert = null) => {
  if (validation.valid) return;
  
  const { title, message } = validation;
  
  // Use custom alert if available
  if (customAlert) {
    customAlert(title, message);
    return;
  }
  
  // Fallback to native alert
  const { Alert } = require('react-native');
  Alert.alert(title, message);
};

/**
 * Validate transfer between accounts
 * @param {object} params - Transfer validation parameters
 * @returns {object} Validation result
 */
export const validateTransfer = ({
  amount,
  fromCardId,
  toCardId,
  userCards,
  currency = '£'
}) => {
  // Validate amount
  const amountValidation = validateAmount(amount);
  if (!amountValidation.valid) {
    return amountValidation;
  }
  
  // Validate from card
  const fromCardValidation = validateCardSelection(fromCardId, userCards);
  if (!fromCardValidation.valid) {
    return { ...fromCardValidation, message: 'Please select a source account for the transfer.' };
  }
  
  // Validate to card
  const toCardValidation = validateCardSelection(toCardId, userCards);
  if (!toCardValidation.valid) {
    return { ...toCardValidation, message: 'Please select a destination account for the transfer.' };
  }
  
  // Check if same account
  if (fromCardId === toCardId) {
    return {
      valid: false,
      error: 'SAME_ACCOUNT_TRANSFER',
      title: 'Invalid Transfer',
      message: 'Cannot transfer to the same account. Please select different accounts.'
    };
  }
  
  const { card: fromCard } = fromCardValidation;
  const { parsed: parsedAmount } = amountValidation;
  
  // Validate sufficient funds in source account
  if (fromCard.type === 'debit') {
    const fundsValidation = validateDebitFunds(fromCard, parsedAmount, currency);
    if (!fundsValidation.valid) {
      return { ...fundsValidation, message: `Insufficient funds in source account. ${fundsValidation.message}` };
    }
  }
  
  return { 
    valid: true, 
    fromCard, 
    toCard: toCardValidation.card, 
    amount: parsedAmount 
  };
};
