// User Limits Configuration
export const USER_LIMITS = {
  CARDS: {
    DEBIT: 2,
    CREDIT: 2,
    TOTAL: 4
  },
  SAVINGS_ACCOUNTS: 1,
  GOALS: 2,
  BUDGETS: 2
};

// Custom error messages
export const LIMIT_MESSAGES = {
  CARDS: {
    DEBIT: {
      title: 'Debit Card Limit Reached',
      message: `You can only have ${USER_LIMITS.CARDS.DEBIT} debit cards. Focus on managing your existing cards effectively! 💳`
    },
    CREDIT: {
      title: 'Credit Card Limit Reached', 
      message: `You can only have ${USER_LIMITS.CARDS.CREDIT} credit cards. Keep your credit simple and manageable! 💳`
    },
    TOTAL: {
      title: 'Card Limit Reached',
      message: `You can only have ${USER_LIMITS.CARDS.TOTAL} cards total (${USER_LIMITS.CARDS.DEBIT} debit + ${USER_LIMITS.CARDS.CREDIT} credit). Quality over quantity! 💳`
    }
  },
  SAVINGS_ACCOUNTS: {
    title: 'Savings Account Limit Reached',
    message: `You can only have ${USER_LIMITS.SAVINGS_ACCOUNTS} savings account. Focus on building that one account! 💰`
  },
  GOALS: {
    title: 'Goals Limit Reached',
    message: `You can only have ${USER_LIMITS.GOALS} active goals. Focus on achieving your current goals first! 🎯`
  },
  BUDGETS: {
    title: 'Budget Limit Reached',
    message: `You can only have ${USER_LIMITS.BUDGETS} budgets. Keep your budgeting simple and effective! 📊`
  }
};

// Validation functions
export const validateCardLimit = (existingCards, newCardType) => {
  const debitCards = existingCards.filter(card => card.type === 'debit').length;
  const creditCards = existingCards.filter(card => card.type === 'credit').length;
  const totalCards = existingCards.length;

  // Check total limit first
  if (totalCards >= USER_LIMITS.CARDS.TOTAL) {
    return {
      valid: false,
      error: LIMIT_MESSAGES.CARDS.TOTAL
    };
  }

  // Check specific card type limits
  if (newCardType === 'debit' && debitCards >= USER_LIMITS.CARDS.DEBIT) {
    return {
      valid: false,
      error: LIMIT_MESSAGES.CARDS.DEBIT
    };
  }

  if (newCardType === 'credit' && creditCards >= USER_LIMITS.CARDS.CREDIT) {
    return {
      valid: false,
      error: LIMIT_MESSAGES.CARDS.CREDIT
    };
  }

  return { valid: true };
};

export const validateSavingsAccountLimit = (existingSavingsAccounts) => {
  if (existingSavingsAccounts.length >= USER_LIMITS.SAVINGS_ACCOUNTS) {
    return {
      valid: false,
      error: LIMIT_MESSAGES.SAVINGS_ACCOUNTS
    };
  }
  return { valid: true };
};

export const validateGoalsLimit = (existingGoals) => {
  // Only count active goals (not completed)
  const activeGoals = existingGoals.filter(goal => !goal.completed).length;
  
  if (activeGoals >= USER_LIMITS.GOALS) {
    return {
      valid: false,
      error: LIMIT_MESSAGES.GOALS
    };
  }
  return { valid: true };
};

export const validateBudgetLimit = (existingBudgets) => {
  if (existingBudgets.length >= USER_LIMITS.BUDGETS) {
    return {
      valid: false,
      error: LIMIT_MESSAGES.BUDGETS
    };
  }
  return { valid: true };
};

// Helper function to get current usage stats
export const getUserLimitStats = (userCards, userSavings, userGoals, userBudgets) => {
  const debitCards = userCards.filter(card => card.type === 'debit').length;
  const creditCards = userCards.filter(card => card.type === 'credit').length;
  const activeGoals = userGoals.filter(goal => !goal.completed).length;

  return {
    cards: {
      debit: `${debitCards}/${USER_LIMITS.CARDS.DEBIT}`,
      credit: `${creditCards}/${USER_LIMITS.CARDS.CREDIT}`,
      total: `${userCards.length}/${USER_LIMITS.CARDS.TOTAL}`
    },
    savingsAccounts: `${userSavings.length}/${USER_LIMITS.SAVINGS_ACCOUNTS}`,
    goals: `${activeGoals}/${USER_LIMITS.GOALS}`,
    budgets: `${userBudgets.length}/${USER_LIMITS.BUDGETS}`
  };
};
