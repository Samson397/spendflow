import { Alert } from 'react-native';

/**
 * Centralized error handling utilities
 */

/**
 * Handle general errors with user-friendly messages
 * @param {Error} error - The error object
 * @param {string} context - Context where error occurred
 * @param {string} userMessage - User-friendly message to display
 * @param {function} customAlert - Custom alert function (optional)
 */
export const handleError = (error, context, userMessage = 'An error occurred. Please try again.', customAlert = null) => {
  console.error(`Error in ${context}:`, error);
  
  // Show user-friendly message
  if (customAlert) {
    customAlert('Error', userMessage);
  } else {
    Alert.alert('Error', userMessage);
  }
};

/**
 * Handle loading errors specifically
 * @param {Error} error - The error object
 * @param {string} context - What was being loaded
 * @param {function} customAlert - Custom alert function (optional)
 */
export const handleLoadingError = (error, context, customAlert = null) => {
  console.error(`Loading error in ${context}:`, error);
  const message = `Unable to load ${context}. Please check your connection and try again.`;
  
  if (customAlert) {
    customAlert('Loading Error', message);
  } else {
    Alert.alert('Loading Error', message);
  }
};

/**
 * Handle processing errors with actionable guidance
 * @param {Error} error - The error object
 * @param {string} operation - What operation failed
 * @param {string} suggestion - What user should do next
 */
export const handleProcessingError = (error, operation, suggestion = 'Please try again.') => {
  console.error(`Processing error in ${operation}:`, error);
  Alert.alert(
    'Processing Error',
    `Failed to ${operation}. ${suggestion}`
  );
};

/**
 * Handle file processing errors with specific guidance
 * @param {Error} error - The error object
 * @param {string} fileName - Name of file being processed
 * @param {string} fileType - Type of file (CSV, Numbers, etc.)
 */
export const handleFileError = (error, fileName, fileType = 'file') => {
  console.error(`File processing error for ${fileName}:`, error);
  
  let message = `Unable to process ${fileName}.`;
  
  if (fileType === 'Numbers') {
    message += '\n\nTo fix this:\n1. Open your Numbers file\n2. Select all data (Cmd+A)\n3. Copy and paste into a new spreadsheet\n4. Save as CSV\n5. Upload the CSV file instead';
  } else if (fileType === 'CSV') {
    message += '\n\nPlease check:\n• File is a valid CSV\n• Contains required headers\n• Data rows are properly formatted';
  }
  
  Alert.alert('File Error', message);
};

/**
 * Handle date parsing errors with fallback explanation
 * @param {Error} error - The error object
 * @param {string} dateString - The invalid date string
 * @param {string} itemName - Name of item with invalid date
 */
export const handleDateError = (error, dateString, itemName) => {
  console.error(`Date parsing error for ${itemName}:`, error, 'Date:', dateString);
  Alert.alert(
    'Date Error',
    `Invalid date format for ${itemName}. Using today's date instead.`
  );
};

/**
 * Show success message to user
 * @param {string} message - Success message to display
 * @param {string} title - Optional title (defaults to 'Success')
 * @param {function} customAlert - Custom alert function (optional)
 */
export const showSuccess = (message, title = 'Success', customAlert = null) => {
  if (customAlert) {
    customAlert(title, message);
  } else {
    Alert.alert(title, message);
  }
};

/**
 * Show warning message to user
 * @param {string} message - Warning message
 * @param {string} title - Optional title (defaults to 'Warning')
 */
export const showWarning = (message, title = 'Warning') => {
  Alert.alert(title, message);
};
