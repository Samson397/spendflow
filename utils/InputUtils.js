/**
 * Input validation utilities for form fields
 */

/**
 * Format numeric input to only allow numbers and decimal points
 * @param {string} text - Input text
 * @returns {string} Formatted numeric text
 */
export const formatNumericInput = (text) => {
  // Remove all non-numeric characters except decimal point
  const numericText = text.replace(/[^0-9.]/g, '');
  
  // Prevent multiple decimal points
  const parts = numericText.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  
  return numericText;
};

/**
 * Format text input for proper capitalization
 * @param {string} text - Input text
 * @returns {string} Formatted text
 */
export const formatTextInput = (text) => {
  // Allow letters, numbers, spaces, and common punctuation
  return text.replace(/[^\w\s.,!?-]/g, '');
};

/**
 * Common props for amount input fields
 */
export const amountInputProps = {
  keyboardType: 'decimal-pad',
  autoCorrect: false,
  autoCapitalize: 'none',
};

/**
 * Common props for text input fields
 */
export const textInputProps = {
  autoCapitalize: 'sentences',
  autoCorrect: true,
};

/**
 * Common props for name/title input fields
 */
export const nameInputProps = {
  autoCapitalize: 'words',
  autoCorrect: true,
};
