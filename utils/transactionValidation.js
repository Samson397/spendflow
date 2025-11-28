/**
 * Transaction validation utilities for SpendFlow
 * Handles balance checking, overdraft validation, and credit limit validation
 */

/**
 * Validates if a transaction can be processed based on card type and available funds
 * @param {Object} card - Card object with balance, type, limit, overdraft info
 * @param {number} transactionAmount - Amount to be charged (positive number)
 * @returns {Object} - Validation result with success status and message
 */
export const validateTransaction = (card, transactionAmount) => {
  const amount = parseFloat(transactionAmount);
  
  if (isNaN(amount) || amount <= 0) {
    return {
      success: false,
      message: "Invalid transaction amount",
      errorType: "INVALID_AMOUNT"
    };
  }

  if (card.type === 'debit') {
    return validateDebitTransaction(card, amount);
  } else if (card.type === 'credit') {
    return validateCreditTransaction(card, amount);
  }

  return {
    success: false,
    message: "Unknown card type",
    errorType: "INVALID_CARD_TYPE"
  };
};

/**
 * Validates debit card transactions with balance and overdraft checking
 */
const validateDebitTransaction = (card, amount) => {
  const currentBalance = parseFloat(card.balance.replace(/[£,]/g, ''));
  const overdraftLimit = card.overdraftLimit ? parseFloat(card.overdraftLimit.replace(/[£,]/g, '')) : 0;
  const hasOverdraft = card.overdraftEnabled || overdraftLimit > 0;
  
  // Calculate available funds (balance + overdraft)
  const availableFunds = hasOverdraft ? currentBalance + overdraftLimit : currentBalance;
  
  if (amount <= currentBalance) {
    // Transaction can be completed with current balance
    return {
      success: true,
      message: "Transaction approved",
      newBalance: currentBalance - amount,
      usedOverdraft: false
    };
  } else if (hasOverdraft && amount <= availableFunds) {
    // Transaction requires overdraft
    const overdraftUsed = amount - currentBalance;
    return {
      success: true,
      message: `Transaction approved using £${overdraftUsed.toFixed(2)} overdraft`,
      newBalance: 0,
      overdraftUsed: overdraftUsed,
      usedOverdraft: true,
      warningMessage: `This transaction will use £${overdraftUsed.toFixed(2)} of your overdraft facility.`
    };
  } else {
    // Insufficient funds
    const shortfall = amount - availableFunds;
    return {
      success: false,
      message: hasOverdraft 
        ? `Insufficient funds. You need an additional £${shortfall.toFixed(2)} (including £${overdraftLimit.toFixed(2)} overdraft).`
        : `Insufficient funds. You need an additional £${shortfall.toFixed(2)}. Consider enabling overdraft protection.`,
      errorType: "INSUFFICIENT_FUNDS",
      shortfall: shortfall,
      availableFunds: availableFunds,
      hasOverdraft: hasOverdraft
    };
  }
};

/**
 * Validates credit card transactions with credit limit checking
 */
const validateCreditTransaction = (card, amount) => {
  const currentBalance = parseFloat(card.balance.replace(/[£,]/g, ''));
  const creditLimit = parseFloat(card.limit.replace(/[£,]/g, ''));
  
  // For credit cards, balance is what's owed, limit is what can be spent
  const availableCredit = creditLimit - currentBalance;
  
  if (amount <= availableCredit) {
    // Transaction can be completed
    return {
      success: true,
      message: "Transaction approved",
      newBalance: currentBalance + amount,
      remainingCredit: availableCredit - amount
    };
  } else {
    // Credit limit exceeded
    const excess = amount - availableCredit;
    return {
      success: false,
      message: `Credit limit exceeded. You need an additional £${excess.toFixed(2)} credit limit. Available credit: £${availableCredit.toFixed(2)}`,
      errorType: "CREDIT_LIMIT_EXCEEDED",
      excess: excess,
      availableCredit: availableCredit
    };
  }
};

/**
 * Formats currency amounts consistently
 */
export const formatCurrency = (amount) => {
  return `£${parseFloat(amount).toLocaleString('en-GB', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Gets user-friendly error messages for different validation failures
 */
export const getErrorMessage = (validationResult) => {
  switch (validationResult.errorType) {
    case "INSUFFICIENT_FUNDS":
      return {
        title: "Insufficient Funds",
        message: validationResult.message,
        suggestion: validationResult.hasOverdraft 
          ? "Consider increasing your overdraft limit or adding funds to your account."
          : "Consider enabling overdraft protection or adding funds to your account."
      };
    
    case "CREDIT_LIMIT_EXCEEDED":
      return {
        title: "Credit Limit Exceeded",
        message: validationResult.message,
        suggestion: "Consider requesting a credit limit increase or making a payment to reduce your balance."
      };
    
    case "INVALID_AMOUNT":
      return {
        title: "Invalid Amount",
        message: "Please enter a valid transaction amount greater than £0.00",
        suggestion: "Check the amount and try again."
      };
    
    default:
      return {
        title: "Transaction Error",
        message: validationResult.message || "Unable to process transaction",
        suggestion: "Please try again or contact support."
      };
  }
};

/**
 * Simulates processing a transaction (updates card balance)
 * In a real app, this would call a backend API
 */
export const processTransaction = (card, amount, validationResult) => {
  if (!validationResult.success) {
    throw new Error("Cannot process invalid transaction");
  }

  const updatedCard = { ...card };
  
  if (card.type === 'debit') {
    updatedCard.balance = formatCurrency(validationResult.newBalance);
    if (validationResult.usedOverdraft) {
      updatedCard.overdraftUsed = formatCurrency(validationResult.overdraftUsed);
    }
  } else if (card.type === 'credit') {
    updatedCard.balance = formatCurrency(validationResult.newBalance);
  }
  
  return {
    updatedCard,
    transactionDetails: {
      amount: formatCurrency(amount),
      timestamp: new Date().toISOString(),
      type: 'purchase',
      status: 'completed'
    }
  };
};
