/**
 * Currency utility functions for parsing and formatting amounts
 */

/**
 * Parse amount string to float, removing currency symbols and formatting
 * @param {string|number} value - The value to parse
 * @returns {number} Parsed float value or 0 if invalid
 */
export const parseAmount = (value) => {
  if (typeof value === 'number') return value;
  return parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
};

/**
 * Format amount with currency symbol
 * @param {number} amount - The amount to format
 * @param {string} symbol - Currency symbol (default: £)
 * @param {boolean} showSign - Whether to show +/- sign for positive/negative
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount, symbol = '£', showSign = false) => {
  const absAmount = Math.abs(amount);
  const formattedAmount = `${symbol}${absAmount.toFixed(2)}`;
  
  if (!showSign) return formattedAmount;
  
  if (amount > 0) return `+${formattedAmount}`;
  if (amount < 0) return `-${formattedAmount}`;
  return formattedAmount;
};

/**
 * Clean amount string for display (remove extra symbols)
 * @param {string} amount - Amount string to clean
 * @returns {string} Cleaned amount string
 */
export const cleanAmountString = (amount) => {
  return String(amount).replace(/[£,]/g, '');
};
