/**
 * Date utility functions for consistent date/time formatting
 */

/**
 * Get current date as ISO string
 * @returns {string} ISO formatted date string
 */
export const getCurrentISODate = () => {
  return new Date().toISOString();
};

/**
 * Format current time in HH:MM format (24-hour)
 * @returns {string} Formatted time string
 */
export const formatCurrentTime = () => {
  return new Date().toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Format a date object to locale time string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date = new Date()) => {
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Format date to DD/MM/YYYY
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-GB');
};

/**
 * Parse direct debit date from DD/MM/YYYY to YYYY-MM-DD with error handling
 * @param {string} dateString - Date string in DD/MM/YYYY format
 * @param {string} itemName - Name of the item (for error messages)
 * @returns {string} Formatted date string in YYYY-MM-DD format
 */
export const parseDirectDebitDate = (dateString, itemName) => {
  try {
    if (!dateString) {
      throw new Error('No date provided');
    }
    
    const dateParts = dateString.split('/');
    if (dateParts.length === 3) {
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const day = dateParts[0].padStart(2, '0');
      const month = dateParts[1].padStart(2, '0');
      const year = dateParts[2];
      
      // Validate the date parts
      if (isNaN(parseInt(day)) || isNaN(parseInt(month)) || isNaN(parseInt(year))) {
        throw new Error('Invalid date components');
      }
      
      return `${year}-${month}-${day}`;
    } else {
      // Try to parse as-is
      const testDate = new Date(dateString);
      if (isNaN(testDate.getTime())) {
        throw new Error('Invalid date format');
      }
      return dateString;
    }
  } catch (error) {
    console.error('Error parsing direct debit date:', dateString, error);
    if (itemName) {
      // Only show alert if we have context (itemName)
      const { Alert } = require('react-native');
      Alert.alert(
        'Date Error',
        `Invalid date format for ${itemName}. Using today's date instead.`
      );
    }
    return new Date().toISOString().split('T')[0]; // Fallback to today
  }
};
