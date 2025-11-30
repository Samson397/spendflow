import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Modal, TextInput, FlatList, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../contexts/AlertContext';
import FirebaseService from '../services/FirebaseService';
import { safeGoBack } from '../utils/NavigationHelper';

export default function DirectDebitsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { showAlert } = useCustomAlert();

  // Get card data from route params
  const card = route?.params?.card || {
    name: 'Primary Account',
    bank: 'Chase',
    lastFour: '4567'
  };

  // Direct debits state
  const [directDebits, setDirectDebits] = useState([]);
  const [userCards, setUserCards] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

  // Modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [importHelpModalVisible, setImportHelpModalVisible] = useState(false);
  const [selectedTemplateCategories, setSelectedTemplateCategories] = useState([]);
  const [numbersFileModalVisible, setNumbersFileModalVisible] = useState(false);
  const [selectedNumbersFile, setSelectedNumbersFile] = useState(null);
  const [importConfirmModalVisible, setImportConfirmModalVisible] = useState(false);
  const [parsedDebits, setParsedDebits] = useState([]);
  
  // Load direct debits from Firebase
  useEffect(() => {
    const loadDirectDebits = async () => {
      if (user?.uid) {
        const result = await FirebaseService.getUserDirectDebits(user.uid);
        if (result.success) {
          if (card.type === 'debit') {
            // For debit cards: show direct debits paid FROM this card (including credit card payments)
            const cardDirectDebits = result.data.filter(dd => dd.cardId === card.id);
            setDirectDebits(cardDirectDebits);
          } else {
            // For credit cards: show the payment schedule TO this credit card (from linked debit cards)
            // This would show when and how the credit card bill is paid
            const creditCardPayments = result.data.filter(dd => dd.creditCardId === card.id);
            setDirectDebits(creditCardPayments);
          }
        }
      }
    };
    
    loadDirectDebits();
    loadUserCards();
    loadPaymentHistory();
  }, [user, card.id]);
  
  // Load payment history from transactions
  const loadPaymentHistory = async () => {
    if (user?.uid) {
      const result = await FirebaseService.getUserTransactions(user.uid);
      if (result.success) {
        // Filter for direct debit payments
        const ddPayments = result.data.filter(t => 
          t.type === 'direct_debit' || 
          t.category === 'Direct Debit' ||
          t.description?.toLowerCase().includes('direct debit')
        ).map(payment => ({
          ...payment,
          status: 'completed', // All historical payments are completed
          paymentDate: payment.date,
          directDebitName: payment.description?.replace('Direct Debit: ', '') || 'Direct Debit Payment'
        })).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        
        setPaymentHistory(ddPayments);
      }
    }
  };

  const loadUserCards = async () => {
    if (user?.uid) {
      const result = await FirebaseService.getUserCards(user.uid);
      if (result.success) {
        setUserCards(result.data);
      }
    }
  };

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDebit, setSelectedDebit] = useState(null);

  // Form state
  const [debitName, setDebitName] = useState('');
  const [debitDescription, setDebitDescription] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [debitFrequency, setDebitFrequency] = useState('Monthly');
  const [debitCategory, setDebitCategory] = useState('Entertainment');
  const [debitDate, setDebitDate] = useState('');
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);
  
  // Validation state
  const [errors, setErrors] = useState({});

  // Validation functions
  const validateDate = (dateStr) => {
    if (!dateStr) return false;
    const day = parseInt(dateStr);
    return day >= 1 && day <= 31;
  };

  const validateAmount = (amount) => {
    if (!amount) return false;
    
    // Remove £ symbol and spaces
    const cleanAmount = amount.replace(/[£\s]/g, '');
    
    // Check if it's a valid number
    const numAmount = parseFloat(cleanAmount);
    return !isNaN(numAmount) && numAmount > 0;
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!debitName.trim()) {
      newErrors.name = 'Company name is required';
    }
    
    if (!validateAmount(debitAmount)) {
      newErrors.amount = 'Please enter a valid amount (e.g., £12.99)';
    }
    
    if (!validateDate(debitDate)) {
      newErrors.date = 'Please enter a valid day (1-31)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Expanded category options
  const categoryOptions = [
    { id: 'creditcard', name: 'Credit Card', emoji: '💳' },
    { id: 'entertainment', name: 'Entertainment', emoji: '🎬' },
    { id: 'utilities', name: 'Utilities', emoji: '⚡' },
    { id: 'health', name: 'Health & Fitness', emoji: '🏥' },
    { id: 'transport', name: 'Transport', emoji: '🚗' },
    { id: 'insurance', name: 'Insurance', emoji: '🛡️' },
    { id: 'subscriptions', name: 'Subscriptions', emoji: '📱' },
    { id: 'education', name: 'Education', emoji: '📚' },
    { id: 'charity', name: 'Charity', emoji: '❤️' },
    { id: 'mortgage', name: 'Mortgage/Rent', emoji: '🏠' },
    { id: 'loans', name: 'Loans', emoji: '💰' },
    { id: 'childcare', name: 'Childcare', emoji: '👶' },
    { id: 'professional', name: 'Professional Services', emoji: '💼' },
    { id: 'government', name: 'Government/Tax', emoji: '🏛️' },
    { id: 'other', name: 'Other', emoji: '📄' }
  ];
  
  // State for credit card selection (when category is Credit Card)
  const [selectedCreditCard, setSelectedCreditCard] = useState(null);
  const [userCreditCards, setUserCreditCards] = useState([]);
  
  // Load user's credit cards for linking
  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = FirebaseService.subscribeToUserCards(user.uid, (cards) => {
        const creditCards = cards.filter(c => c.type === 'credit');
        setUserCreditCards(creditCards);
      });
      return unsubscribe;
    }
  }, [user]);

  const handleAddDebit = () => {
    setAddModalVisible(true);
  };

  // Universal CSV parser - handles all spreadsheet app formats
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        // Handle escaped quotes (Excel: "", Google Sheets: "")
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2; // Skip both quotes
          continue;
        }
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        // Handle both comma and semicolon separators (European Excel uses ;)
        result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    // Add the last field
    result.push(current.trim().replace(/^"|"$/g, ''));
    
    // Filter out empty fields at the end (some apps add trailing commas)
    while (result.length > 0 && result[result.length - 1] === '') {
      result.pop();
    }
    
    return result;
  };

  // Process Numbers file
  const processNumbersFile = async (file) => {
    try {
      // Try different approaches to read the Numbers file
      if (file.base64) {
        
        // Try to extract CSV-like data from the Numbers file
        const base64Data = file.base64.includes(',') ? file.base64.split(',')[1] : file.base64;
        
        try {
          // Decode base64 and look for text content
          const binaryString = atob(base64Data);
          
          // Look for any readable text in the binary data
          const readableText = extractReadableText(binaryString);
          
          if (readableText.length > 0) {
            // Try to find our template data
            const extractedData = findTemplateData(readableText);
            
            if (extractedData.length > 0) {
              await processExtractedText(extractedData);
            } else {
              throw new Error('No recognizable direct debit data found in Numbers file');
            }
          } else {
            throw new Error('No readable text found in Numbers file');
          }
        } catch (parseError) {
          console.error('Error parsing Numbers file:', parseError);
          throw parseError;
        }
      } else if (file.uri) {
        // Try to read via fetch if no base64
        const response = await fetch(file.uri);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to string and look for text
        let textContent = '';
        for (let i = 0; i < uint8Array.length; i++) {
          if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
            textContent += String.fromCharCode(uint8Array[i]);
          }
        }
        
        const extractedData = findTemplateData(textContent);
        
        if (extractedData.length > 0) {
          await processExtractedText(extractedData);
        } else {
          throw new Error('No recognizable data found in Numbers file');
        }
      } else {
        throw new Error('Numbers file does not contain accessible data');
      }
    } catch (error) {
      console.error('Error processing Numbers file:', error);
      Alert.alert(
        'Numbers File Not Supported',
        `Direct Numbers file processing failed: ${error.message}\n\nTo import your data:\n\n1. Open your Numbers file\n2. Select all data (Cmd+A)\n3. Copy (Cmd+C)\n4. Open a new spreadsheet\n5. Paste and save as CSV\n6. Upload the CSV file\n\nOr use the "Download Sample" button to get a fresh template.`,
        [{ text: 'OK' }]
      );
    }
  };

  // Extract readable text from binary data
  const extractReadableText = (binaryString) => {
    let readableText = '';
    for (let i = 0; i < binaryString.length; i++) {
      const char = binaryString[i];
      const charCode = char.charCodeAt(0);
      // Include printable ASCII characters
      if (charCode >= 32 && charCode <= 126) {
        readableText += char;
      } else if (charCode === 10 || charCode === 13) {
        readableText += ' '; // Replace newlines with spaces
      }
    }
    return readableText;
  };

  // Find template data in text
  const findTemplateData = (text) => {
    // Look for our known template companies
    const knownCompanies = ['Netflix', 'British Gas', 'Spotify', 'PureGym', 'Aviva Insurance', 'Vodafone'];
    const foundData = [];
    
    knownCompanies.forEach(company => {
      if (text.includes(company)) {
        // Try to extract associated data
        const companyIndex = text.indexOf(company);
        const surroundingText = text.substring(Math.max(0, companyIndex - 50), companyIndex + 100);
        
        // Look for amount pattern near the company
        const amountMatch = surroundingText.match(/£\d+\.\d+/);
        const frequencyMatch = surroundingText.match(/Monthly|Weekly|Quarterly|Yearly/i);
        const categoryMatch = surroundingText.match(/Entertainment|Utilities|Insurance|Health|Transport|Subscriptions/i);
        
        if (amountMatch) {
          foundData.push({
            company: company,
            amount: amountMatch[0],
            frequency: frequencyMatch ? frequencyMatch[0] : 'Monthly',
            category: categoryMatch ? categoryMatch[0] : 'Other',
            date: '01/01/2024'
          });
        }
      }
    });
    
    return foundData;
  };

  // Extract text content from Numbers binary data
  const extractTextFromNumbers = (binaryString) => {
    try {
      // Look for readable text patterns in the binary data
      // Numbers files contain XML and other structured data
      const textMatches = [];
      
      // Simple regex to find text that looks like our CSV data
      const patterns = [
        /Netflix/gi,
        /British Gas/gi,
        /Spotify/gi,
        /£\d+\.\d+/g,
        /Monthly|Weekly|Quarterly|Yearly/gi,
        /Entertainment|Utilities|Insurance/gi
      ];
      
      patterns.forEach(pattern => {
        const matches = binaryString.match(pattern);
        if (matches) {
          textMatches.push(...matches);
        }
      });
      
      // Try to reconstruct CSV-like data from found patterns
      if (textMatches.length > 0) {
        // This is a simplified extraction - in reality, Numbers files are complex
        // For a production app, you'd want to use a proper Numbers parser library
        const reconstructedCSV = reconstructCSVFromPatterns(textMatches);
        return reconstructedCSV;
      }
      
      return null;
    } catch (error) {
      handleFileError(error, 'Numbers file', 'Numbers');
      return null;
    }
  };

  // Reconstruct CSV from extracted patterns
  const reconstructCSVFromPatterns = (patterns) => {
    // This is a heuristic approach to reconstruct CSV data
    // In a real implementation, you'd parse the Numbers XML structure
    
    const companies = patterns.filter(p => /^[A-Za-z\s]+$/.test(p) && p.length > 2);
    const amounts = patterns.filter(p => /£\d+\.\d+/.test(p));
    const frequencies = patterns.filter(p => /Monthly|Weekly|Quarterly|Yearly/i.test(p));
    const categories = patterns.filter(p => /Entertainment|Utilities|Insurance|Health|Transport/i.test(p));
    
    // Try to match them up (this is very basic)
    const rows = [];
    const maxRows = Math.min(companies.length, amounts.length);
    
    for (let i = 0; i < maxRows; i++) {
      const row = {
        company: companies[i] || 'Unknown',
        amount: amounts[i] || '£0.00',
        frequency: frequencies[i] || 'Monthly',
        category: categories[i] || 'Other',
        date: '01/01/2024' // Default date
      };
      rows.push(row);
    }
    
    return rows;
  };

  // Process extracted text data
  const processExtractedText = async (extractedData) => {
    try {
      if (extractedData && extractedData.length > 0) {
        const importedDebits = extractedData.map(row => {
          // Convert day number (1-31) to next occurrence of that day
          let nextDate;
          const dayOfMonth = parseInt(row.date);
          
          if (dayOfMonth >= 1 && dayOfMonth <= 31) {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            
            // Try current month first
            nextDate = new Date(currentYear, currentMonth, dayOfMonth);
            
            // If the date has already passed this month, use next month
            if (nextDate <= today) {
              nextDate = new Date(currentYear, currentMonth + 1, dayOfMonth);
            }
          } else {
            // Fallback to today if invalid day
            nextDate = new Date();
          }
          
          // Smart category matching - find closest valid category
          const csvCategory = row.category;
          let matchedCategory = csvCategory;
          
          // Try exact match first (case insensitive)
          const exactMatch = categoryOptions.find(cat => 
            cat.name.toLowerCase() === csvCategory.toLowerCase()
          );
          
          if (exactMatch) {
            matchedCategory = exactMatch.name;
          } else {
            // Try partial matching for common variations
            const partialMatch = categoryOptions.find(cat => 
              cat.name.toLowerCase().includes(csvCategory.toLowerCase()) ||
              csvCategory.toLowerCase().includes(cat.name.toLowerCase())
            );
            
            if (partialMatch) {
              matchedCategory = partialMatch.name;
            } else {
              // Default to 'Other' if no match found
              matchedCategory = 'Other';
            }
          }

          return {
            name: row.company,
            amount: row.amount,
            frequency: row.frequency,
            category: matchedCategory,
            nextDate: nextDate.toISOString().split('T')[0], // YYYY-MM-DD format
            status: 'Active',
            cardId: card.id
          };
        });
        
        if (importedDebits.length > 0) {
          Alert.alert(
            'Numbers File Processed',
            `Extracted ${importedDebits.length} direct debits from Numbers file. Import them now?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Import All", onPress: () => saveImportedDebits(importedDebits) }
            ]
          );
        } else {
          Alert.alert('No Data Found', 'Could not extract valid direct debit data from the Numbers file.');
        }
      }
    } catch (error) {
      console.error('Error processing extracted text:', error);
      Alert.alert('Processing Error', 'Failed to process the extracted data from Numbers file.');
    }
  };

  // Show format requirements
  const showFormatHelp = () => {
    setImportHelpModalVisible(true);
  };

  // Download sample CSV template
  const downloadSampleCSV = async () => {
    // All available sample data
    const allSampleData = [
      { company: 'Netflix', amount: '£12.99', frequency: 'Monthly', category: 'Entertainment', date: '15' },
      { company: 'British Gas', amount: '£85.50', frequency: 'Monthly', category: 'Utilities', date: '1' },
      { company: 'Spotify', amount: '£9.99', frequency: 'Monthly', category: 'Entertainment', date: '20' },
      { company: 'PureGym', amount: '£29.99', frequency: 'Monthly', category: 'Health & Fitness', date: '5' },
      { company: 'Aviva Insurance', amount: '£45.00', frequency: 'Monthly', category: 'Insurance', date: '10' },
      { company: 'Vodafone', amount: '£35.00', frequency: 'Monthly', category: 'Subscriptions', date: '25' },
      { company: 'Nationwide Mortgage', amount: '£850.00', frequency: 'Monthly', category: 'Mortgage/Rent', date: '1' },
      { company: 'Council Tax', amount: '£120.00', frequency: 'Monthly', category: 'Government/Tax', date: '1' },
      { company: 'Uber', amount: '£25.00', frequency: 'Weekly', category: 'Transport', date: '1' },
      { company: 'BUPA', amount: '£65.00', frequency: 'Monthly', category: 'Health & Fitness', date: '15' },
      { company: 'Amazon Prime', amount: '£8.99', frequency: 'Monthly', category: 'Subscriptions', date: '12' },
      { company: 'Barclays Credit Card', amount: '£150.00', frequency: 'Monthly', category: 'Credit Card', date: '20' },
      { company: 'Nursery Fees', amount: '£400.00', frequency: 'Monthly', category: 'Childcare', date: '1' },
      { company: 'Oxfam', amount: '£15.00', frequency: 'Monthly', category: 'Charity', date: '5' },
      { company: 'University Fees', amount: '£200.00', frequency: 'Monthly', category: 'Education', date: '1' }
    ];

    // Filter sample data by selected categories (if any selected)
    const filteredData = selectedTemplateCategories.length > 0 
      ? allSampleData.filter(row => selectedTemplateCategories.includes(row.category))
      : allSampleData;

    // Create universal CSV format (works with Excel, Numbers, Google Sheets, LibreOffice, etc.)
    let csvContent = 'Company,Amount,Frequency,Category,Date\n';
    
    // Add filtered sample data rows (clean format for all apps)
    filteredData.forEach(row => {
      csvContent += `${row.company},${row.amount},${row.frequency},${row.category},${row.date}\n`;
    });

    // Add universal instructions (compatible with all spreadsheet apps)
    csvContent += '\n';
    csvContent += 'DELETE ALL ROWS BELOW BEFORE IMPORTING\n';
    csvContent += '\n';
    csvContent += 'Available Categories:\n';
    categoryOptions.forEach(cat => {
      csvContent += `${cat.name}\n`;
    });
    csvContent += '\n';
    csvContent += 'Available Frequencies:\n';
    csvContent += 'Weekly\n';
    csvContent += 'Monthly\n';
    csvContent += 'Quarterly\n';
    csvContent += 'Yearly\n';
    csvContent += '\n';
    csvContent += 'Format Requirements:\n';
    csvContent += 'Amount must include £ symbol (e.g. £12.99)\n';
    csvContent += 'Date should be DAY OF MONTH only (1-31, e.g. 15 for 15th of every month)\n';
    csvContent += 'Frequency must be: Weekly, Monthly, Quarterly, or Yearly\n';
    csvContent += 'Works with Excel, Numbers, Google Sheets, LibreOffice\n';

    if (Platform.OS === 'web') {
      try {
        // Try to use the File System Access API if available (modern browsers)
        if ('showSaveFilePicker' in window) {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'SpendFlow_DirectDebits_Template.csv',
            types: [{
              description: 'CSV files',
              accept: { 'text/csv': ['.csv'] }
            }]
          });
          const writable = await fileHandle.createWritable();
          await writable.write(csvContent);
          await writable.close();
          Alert.alert('✅ Template Saved', 'Sample CSV template has been saved. Fill in your data and import it back!');
        } else {
          // Fallback to blob download for older browsers
          if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'SpendFlow_DirectDebits_Template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
          Alert.alert('✅ Template Downloaded', 'Sample CSV template has been downloaded. Fill in your data and import it back!');
        }
      } catch (error) {
        console.error('Download error:', error);
        // Final fallback - show content in alert
        Alert.alert(
          'Template Content',
          'Copy this content to a CSV file:\n\n' + csvContent.substring(0, 300) + '...\n\nSave as SpendFlow_DirectDebits_Template.csv'
        );
      }
    } else {
      // For mobile, show the content in an alert for now
      Alert.alert(
        'CSV Template',
        'Sample template content:\n\n' + csvContent.substring(0, 200) + '...\n\nUse web version to download the full template file.'
      );
    }
  };

  // File upload function
  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',                                    // CSV files
          'application/csv',                             // CSV files (alternative)
          'text/comma-separated-values',                 // CSV files (alternative)
          'application/x-iwork-numbers-sffnumbers',      // Numbers files
          'application/vnd.apple.numbers',               // Numbers files (alternative)
        ],
        copyToCacheDirectory: true,
        multiple: false, // Only allow single file selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        // Handle Numbers files directly
        if (file.mimeType === 'application/x-iwork-numbers-sffnumbers' || file.name.endsWith('.numbers')) {
          setSelectedNumbersFile(file);
          setNumbersFileModalVisible(true);
          return;
        }
        
        // Check if it's a supported CSV format
        const supportedTypes = ['text/csv', 'application/csv', 'text/plain'];
        const isSupportedType = supportedTypes.includes(file.mimeType) || file.name.toLowerCase().endsWith('.csv');
        
        if (!isSupportedType) {
          // Use custom modal instead of Alert.alert for consistency
          setSelectedNumbersFile({
            ...file,
            errorType: 'unsupported',
            errorMessage: `Please upload a CSV file (.csv format).\n\nSelected: ${file.name}\nType: ${file.mimeType || 'Unknown'}\n\nSupported formats: CSV files exported from Excel, Numbers, Google Sheets, etc.`
          });
          setNumbersFileModalVisible(true);
          return;
        }
        
        // Use custom modal for CSV files too - universal experience
        setSelectedNumbersFile({
          ...file,
          fileType: 'csv',
          message: `Selected: ${file.name}\nSize: ${file.size ? Math.round(file.size/1024) + 'KB' : 'Unknown'}\nType: CSV File\n\nWould you like to process this file to import direct debits?`
        });
        setNumbersFileModalVisible(true);
      } else {
        Alert.alert('No File Selected', 'Please select a CSV file to import.');
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  // Process uploaded file
  const processUploadedFile = async (file) => {
    try {
      // Check if it's a Numbers file
      if (file.mimeType === 'application/x-iwork-numbers-sffnumbers' || file.name.endsWith('.numbers')) {
        await processNumbersFile(file);
        return;
      }
      
      // For web, we can read the file content
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        
        if (!response.ok) {
          throw new Error(`Failed to read file: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        
        // Parse CSV content - Universal compatibility (Excel, Numbers, Google Sheets, LibreOffice, etc.)
        
        // Handle different line endings and encoding issues from all spreadsheet apps
        let normalizedText = text
          .replace(/\r\n/g, '\n')    // Windows (Excel)
          .replace(/\r/g, '\n')      // Mac (Numbers, older Excel)
          .replace(/^\uFEFF/, '')    // Remove BOM (Excel, Numbers)
          .replace(/^\uEFBBBF/, ''); // Remove UTF-8 BOM (some apps)
        
        const allLines = normalizedText.split('\n');
        
        // Universal filtering - handles instruction formats from all spreadsheet apps
        const dataLines = allLines.filter(line => {
          const trimmed = line.trim()
            .replace(/^\uFEFF/, '')     // Remove BOM
            .replace(/^[,;]+/, '')      // Remove leading separators
            .replace(/[,;]+$/, '');     // Remove trailing separators
          
          // Skip empty lines
          if (!trimmed) return false;
          
          // Skip various instruction formats
          const instructionPatterns = [
            '#', '//', 'INSTRUCTIONS', 'REFERENCE', 'DELETE',
            'Available Categories', 'Available Frequencies', 'Format Notes',
            'Weekly', 'Monthly', 'Quarterly', 'Yearly',
            'Amount must', 'Date must', 'Categories must',
            'Company:', 'Amount:', 'Frequency:', 'Category:', 'Date:',
            'e.g.', 'Example', 'Sample', 'Template'
          ];
          
          // Check if line starts with any instruction pattern
          if (instructionPatterns.some(pattern => 
            trimmed.toLowerCase().startsWith(pattern.toLowerCase())
          )) {
            return false;
          }
          
          // Skip lines that are just category names
          if (categoryOptions.some(cat => trimmed === cat.name)) {
            return false;
          }
          
          return true;
        });
        
        if (dataLines.length < 2) {
          Alert.alert(
            'Empty CSV File',
            `The CSV file appears to be empty or contains only instructions.\n\nFound ${allLines.length} total lines, ${dataLines.length} data lines.\n\nPlease make sure you have:\n1. Header row: Company,Amount,Frequency,Category,Date\n2. At least one data row\n3. Remove all instruction/reference rows\n4. Save as CSV from your spreadsheet app (Excel, Numbers, Google Sheets, etc.)`
          );
          return;
        }
        
        // Parse headers with better CSV handling (handles quoted fields)
        const headerLine = dataLines[0].trim();
        const headers = parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
        
        // Expected headers: company, amount, frequency, category, date
        const requiredHeaders = ['company', 'amount', 'frequency', 'category', 'date'];
        const hasRequiredHeaders = requiredHeaders.every(header => 
          headers.some(h => h.includes(header))
        );
        
        if (!hasRequiredHeaders) {
          Alert.alert(
            'Invalid CSV Format', 
            `Required columns: Company, Amount, Frequency, Category, Date

Current headers found: ${headers.join(', ')}

Format Requirements:
• Company: Name of the company (e.g., "Netflix")
• Amount: Price with £ symbol (e.g., "£12.99")
• Frequency: Weekly, Monthly, Quarterly, or Yearly
• Category: ${categoryOptions.map(c => c.name).slice(0, 5).join(', ')}, etc.
• Date: Day of month only (1-31, e.g., "15" for 15th of every month)

Example header row:
Company,Amount,Frequency,Category,Date`
          );
          return;
        }
        
        // Parse data rows (skip header row) using proper CSV parsing
        const importedDebits = [];
        for (let i = 1; i < dataLines.length; i++) {
          const line = dataLines[i].trim();
          if (line && !line.startsWith('#')) {
            const values = parseCSVLine(line);
            
            if (values.length >= 5 && values[0] && values[1] && values[2] && values[3] && values[4]) {
              // Clean up values (remove quotes, trim whitespace)
              const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
              
              // Convert day number (1-31) to next occurrence of that day
              let nextDate;
              const dayOfMonth = parseInt(cleanValues[4]);
              
              if (dayOfMonth >= 1 && dayOfMonth <= 31) {
                const today = new Date();
                const currentMonth = today.getMonth();
                const currentYear = today.getFullYear();
                
                // Try current month first
                nextDate = new Date(currentYear, currentMonth, dayOfMonth);
                
                // If the date has already passed this month, use next month
                if (nextDate <= today) {
                  nextDate = new Date(currentYear, currentMonth + 1, dayOfMonth);
                }
              } else {
                // Fallback to today if invalid day
                nextDate = new Date();
              }

              // Smart category matching - find closest valid category
              const csvCategory = cleanValues[3];
              let matchedCategory = csvCategory;
              
              // Try exact match first (case insensitive)
              const exactMatch = categoryOptions.find(cat => 
                cat.name.toLowerCase() === csvCategory.toLowerCase()
              );
              
              if (exactMatch) {
                matchedCategory = exactMatch.name;
              } else {
                // Try partial matching for common variations
                const partialMatch = categoryOptions.find(cat => 
                  cat.name.toLowerCase().includes(csvCategory.toLowerCase()) ||
                  csvCategory.toLowerCase().includes(cat.name.toLowerCase())
                );
                
                if (partialMatch) {
                  matchedCategory = partialMatch.name;
                } else {
                  // Default to 'Other' if no match found
                  matchedCategory = 'Other';
                }
              }

              const debit = {
                name: cleanValues[0],
                amount: cleanValues[1].startsWith('£') ? cleanValues[1] : `£${cleanValues[1]}`,
                frequency: cleanValues[2],
                category: matchedCategory,
                nextDate: nextDate.toISOString().split('T')[0], // YYYY-MM-DD format
                status: 'Active',
                cardId: card.id
              };
              
              importedDebits.push(debit);
            }
          }
        }
        
        if (importedDebits.length > 0) {
          // Show import confirmation modal instead of Alert.alert
          setParsedDebits(importedDebits);
          setImportConfirmModalVisible(true);
        } else {
          Alert.alert('No Data', 'No valid direct debits found in the file. Please check the file format and try again.');
        }
      } else {
        // For mobile, show instructions for now
        Alert.alert(
          'File Upload',
          'File upload on mobile is coming soon! For now, please use the web version to import CSV files.'
        );
      }
    } catch (error) {
      console.error('Error processing file:', error);
      Alert.alert(
        'File Processing Error', 
        `Failed to process the file: ${error.message}\n\nPlease check:\n• File is a valid CSV\n• Contains required headers\n• Data rows are properly formatted\n\nTry downloading a new template and filling it with your data.`
      );
    }
  };

  // Save imported debits to Firebase
  const saveImportedDebits = async (importedDebits) => {
    if (!user?.uid) {
      console.error('No user ID available');
      showAlert('Error', 'User not authenticated. Please sign in again.');
      return;
    }
    
    try {
      // Get all user direct debits to check for cross-card duplicates
      const allUserDirectDebits = await FirebaseService.getUserDirectDebits(user.uid);
      const allDebits = allUserDirectDebits.success ? allUserDirectDebits.data : [];

      // Check for duplicates first
      const duplicates = [];
      const nonDuplicates = [];
      
      for (const debit of importedDebits) {
        const isDuplicate = allDebits.some(dd => 
          dd.name?.toLowerCase() === debit.name.toLowerCase() && 
          dd.amount === debit.amount
        );
        
        if (isDuplicate) {
          duplicates.push(debit);
        } else {
          nonDuplicates.push(debit);
        }
      }
      
      // If there are duplicates, ask user what to do
      if (duplicates.length > 0) {
        const duplicateNames = duplicates.map(d => d.name).slice(0, 5);
        const moreText = duplicates.length > 5 ? ` and ${duplicates.length - 5} more` : '';
        
        showAlert(
          'Duplicates Found',
          `Found ${duplicates.length} duplicate direct debits:\n\n• ${duplicateNames.join(', ')}${moreText}\n\nThese already exist in your account. Do you want to import them anyway?`,
          [
            { 
              text: 'Skip Duplicates', 
              style: 'cancel',
              onPress: () => processBatch(nonDuplicates, allDebits)
            },
            { 
              text: 'Import All', 
              onPress: () => processBatch([...nonDuplicates, ...duplicates], allDebits)
            }
          ]
        );
        return;
      }
      
      // No duplicates, process normally
      processBatch(nonDuplicates, allDebits);
    } catch (error) {
      console.error('Error saving imported debits:', error);
      showAlert('Error', `Failed to save direct debits: ${error.message}`);
    }
  };

  // Process a batch of direct debits (separated from duplicate detection)
  const processBatch = async (debitsToImport, existingDebits) => {
    let successCount = 0;
    let errorCount = 0;

    for (const debit of debitsToImport) {
      const result = await FirebaseService.addDirectDebit(user.uid, debit);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error('Failed to add debit:', debit.name, result.error);
      }
    }

    // Show import results
    let message = '';
    if (successCount > 0) {
      message += `✅ Successfully imported: ${successCount}\n`;
    }
    if (errorCount > 0) {
      message += `❌ Failed to import: ${errorCount}\n`;
    }
    
    if (successCount > 0) {
      showAlert('Import Complete', message.trim());
    } else if (errorCount > 0) {
      showAlert('Import Failed', 'All direct debits failed to import. Please check your data and try again.');
    }

    // Reload direct debits
    try {
      const updatedResult = await FirebaseService.getUserDirectDebits(user.uid);
      if (updatedResult.success) {
        if (card.type === 'debit') {
          const cardDirectDebits = updatedResult.data.filter(dd => dd.cardId === card.id);
          setDirectDebits(cardDirectDebits);
        } else {
          setDirectDebits(updatedResult.data);
        }
      }
    } catch (error) {
      console.error('Error reloading direct debits:', error);
    }
  };

  const handleEditDebit = async (debit) => {
    // If this is a credit card payment, redirect to the credit card's settings
    if (debit.category === 'Credit Card') {
      // If we have the creditCardId, offer to navigate to the credit card
      if (debit.creditCardId) {
        Alert.alert(
          'Credit Card Payment',
          'This direct debit is linked to a credit card. Would you like to edit it from the credit card settings?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Credit Card', 
              onPress: async () => {
                // Fetch the full credit card data
                if (user?.uid) {
                  const cardsResult = await FirebaseService.getUserCards(user.uid);
                  if (cardsResult.success) {
                    const creditCard = cardsResult.data.find(c => c.id === debit.creditCardId);
                    if (creditCard) {
                      navigation.navigate('ViewCard', { card: creditCard });
                    } else {
                      Alert.alert('Error', 'Credit card not found');
                    }
                  }
                }
              }
            }
          ]
        );
      } else {
        // Old credit card direct debit without creditCardId - just show info
        Alert.alert(
          'Credit Card Payment',
          'This is a credit card payment. To edit it, please go to the credit card and use Payment Settings.\n\nNote: This direct debit was created before the linking feature. You may want to delete it and set up a new one from the credit card.',
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    setSelectedDebit(debit);
    setDebitName(debit.name);
    setDebitDescription(debit.description || '');
    setDebitAmount(debit.amount);
    setDebitFrequency(debit.frequency);
    setDebitCategory(debit.category);
    
    // Extract day from nextDate if it's a full date, otherwise use as-is
    let dayValue = '';
    if (debit.nextDate) {
      const date = new Date(debit.nextDate);
      dayValue = date.getDate().toString();
    }
    setDebitDate(dayValue);
    setEditModalVisible(true);
  };

  const handleSaveDebit = async () => {
    // Validate form before saving
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    // Check for duplicate direct debit across ALL cards
    const allUserDirectDebits = await FirebaseService.getUserDirectDebits(user.uid);
    if (allUserDirectDebits.success) {
      const formattedAmount = debitAmount.startsWith('£') ? debitAmount : `£${debitAmount}`;
      const duplicate = allUserDirectDebits.data.find(dd => 
        dd.name?.toLowerCase() === debitName.toLowerCase() && 
        dd.amount === formattedAmount &&
        dd.cardId !== card.id // Different card
      );
      
      if (duplicate) {
        const duplicateCard = userCards.find(c => c.id === duplicate.cardId);
        const cardName = duplicateCard ? `${duplicateCard.bank} ****${duplicateCard.lastFour}` : 'another card';
        
        showAlert(
          'Duplicate Direct Debit Found', 
          `A direct debit for "${debitName}" with amount ${formattedAmount} already exists on ${cardName}.\n\nDo you want to create it on this card too?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Anyway', onPress: () => proceedWithSave() }
          ]
        );
        return;
      }
    }
    
    proceedWithSave();
  };

  const proceedWithSave = async () => {
    
    // Validate credit card selection if category is Credit Card
    if (debitCategory === 'Credit Card' && !selectedCreditCard) {
      Alert.alert('Error', 'Please select which credit card this payment is for');
      return;
    }

    const newDebit = {
      name: debitName,
      description: debitDescription.trim(),
      amount: debitAmount.startsWith('£') ? debitAmount : `£${debitAmount}`,
      frequency: debitFrequency,
      category: debitCategory,
      nextDate: debitDate,
      status: 'Active',
      cardId: card.id,
      // Link to credit card if this is a credit card payment
      ...(debitCategory === 'Credit Card' && selectedCreditCard && {
        creditCardId: selectedCreditCard.id,
        creditCardName: `${selectedCreditCard.bank} ****${selectedCreditCard.lastFour}`
      })
    };

    // Save to Firebase
    if (user?.uid) {
      const result = await FirebaseService.addDirectDebit(user.uid, newDebit);
      if (result.success) {
        // Reload direct debits to get the new one with ID
        const updatedResult = await FirebaseService.getUserDirectDebits(user.uid);
        if (updatedResult.success) {
          if (card.type === 'debit') {
            const cardDirectDebits = updatedResult.data.filter(dd => dd.cardId === card.id);
            setDirectDebits(cardDirectDebits);
          } else {
            const creditCardPayments = updatedResult.data.filter(dd => dd.creditCardId === card.id);
            setDirectDebits(creditCardPayments);
          }
        }
      }
    }
    
    // Reset form and clear errors
    setDebitName('');
    setDebitDescription('');
    setDebitAmount('');
    setDebitFrequency('Monthly');
    setDebitCategory('Entertainment');
    setDebitDate('');
    setSelectedCreditCard(null);
    setErrors({});
    setCategoryDropdownVisible(false);
    // Blur any focused input to prevent accessibility warnings
    if (typeof document !== 'undefined') {
      document.activeElement?.blur();
    }
    setAddModalVisible(false);
  };

  const handleUpdateDebit = async () => {
    // Validate form before updating
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    // Check for duplicate direct debit across ALL cards (excluding current one)
    const allUserDirectDebits = await FirebaseService.getUserDirectDebits(user.uid);
    if (allUserDirectDebits.success) {
      const formattedAmount = debitAmount.startsWith('£') ? debitAmount : `£${debitAmount}`;
      const duplicate = allUserDirectDebits.data.find(dd => 
        dd.name?.toLowerCase() === debitName.toLowerCase() && 
        dd.amount === formattedAmount &&
        dd.cardId !== card.id && // Different card
        dd.id !== selectedDebit.id // Not the current debit being edited
      );
      
      if (duplicate) {
        const duplicateCard = userCards.find(c => c.id === duplicate.cardId);
        const cardName = duplicateCard ? `${duplicateCard.bank} ****${duplicateCard.lastFour}` : 'another card';
        
        showAlert(
          'Duplicate Direct Debit Found', 
          `A direct debit for "${debitName}" with amount ${formattedAmount} already exists on ${cardName}.\n\nDo you want to update this one anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Update Anyway', onPress: () => proceedWithUpdate() }
          ]
        );
        return;
      }
    }
    
    proceedWithUpdate();
  };

  const proceedWithUpdate = async () => {

    // Convert day number to proper next occurrence date
    let nextDate;
    const dayOfMonth = parseInt(debitDate);
    
    if (dayOfMonth >= 1 && dayOfMonth <= 31) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Try current month first
      nextDate = new Date(currentYear, currentMonth, dayOfMonth);
      
      // If the date has already passed this month, use next month
      if (nextDate <= today) {
        nextDate = new Date(currentYear, currentMonth + 1, dayOfMonth);
      }
    } else {
      // Fallback to today if invalid day
      nextDate = new Date();
    }

    const updatedDebit = {
      name: debitName,
      description: debitDescription.trim(),
      amount: debitAmount.startsWith('£') ? debitAmount : `£${debitAmount}`,
      frequency: debitFrequency,
      category: debitCategory,
      nextDate: nextDate.toISOString().split('T')[0], // YYYY-MM-DD format
    };

    // Update in Firebase
    if (user?.uid && selectedDebit?.id) {
      const result = await FirebaseService.updateDirectDebit(user.uid, selectedDebit.id, updatedDebit);
      if (result.success) {
        // Update local state
        setDirectDebits(prev => prev.map(debit => 
          debit.id === selectedDebit.id ? { ...debit, ...updatedDebit } : debit
        ));
        Alert.alert('Success', 'Direct debit updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update direct debit');
        return;
      }
    }

    // Reset form and clear errors
    setDebitName('');
    setDebitDescription('');
    setDebitAmount('');
    setDebitFrequency('Monthly');
    setDebitCategory('Entertainment');
    setDebitDate('');
    setSelectedCreditCard(null);
    setErrors({});
    setCategoryDropdownVisible(false);
    // Blur any focused input to prevent accessibility warnings
    if (typeof document !== 'undefined') {
      document.activeElement?.blur();
    }
    setEditModalVisible(false);
    setSelectedDebit(null);
  };

  const handleDeleteDebit = async (debitId) => {
    // Delete from Firebase
    if (user?.uid) {
      const result = await FirebaseService.deleteDirectDebit(user.uid, debitId);
      if (result.success) {
        // Update local state
        setDirectDebits(prev => prev.filter(debit => debit.id !== debitId));
        Alert.alert('Success', 'Direct debit deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete direct debit');
      }
    }
  };

  const handleTogglePause = async (debit) => {
    if (!user?.uid) return;
    const newStatus = debit.status === 'Paused' ? 'Active' : 'Paused';
    const result = await FirebaseService.updateDirectDebit(user.uid, debit.id, { status: newStatus });
    if (result.success) {
      setDirectDebits(prev => prev.map(d => d.id === debit.id ? { ...d, status: newStatus } : d));
      Alert.alert('Success', `Direct debit ${newStatus === 'Paused' ? 'paused' : 'resumed'}`);
    } else {
      Alert.alert('Error', 'Failed to update direct debit');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10b981';
      case 'Paused': return '#f59e0b';
      case 'Cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCategoryEmoji = (category) => {
    const categoryMatch = categoryOptions.find(cat => 
      cat.name.toLowerCase() === category?.toLowerCase()
    );
    return categoryMatch?.emoji || '💳';
  };

  const totalMonthly = directDebits
    .filter(debit => debit.status === 'Active')
    .reduce((sum, debit) => {
      // Handle "Variable" or non-numeric amounts
      const amountStr = debit.amount?.replace(/[£$€,]/g, '') || '0';
      const amount = parseFloat(amountStr);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => safeGoBack(navigation, 'Dashboard')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Direct Debits</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.uploadButton} onPress={showFormatHelp}>
              <Text style={styles.uploadButtonText}>📁 Import</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddDebit}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardText}>{card.bank} {card.type === 'credit' ? 'Credit' : 'Debit'} • • • • {card.lastFour}</Text>
          <Text style={styles.totalText}>Monthly Total: £{totalMonthly.toFixed(2)}</Text>
        </View>
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'active' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }
          ]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[
            styles.tabText,
            { color: theme.textSecondary },
            activeTab === 'active' && { color: theme.primary, fontWeight: 'bold' }
          ]}>
            🔄 Active ({directDebits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'history' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.tabText,
            { color: theme.textSecondary },
            activeTab === 'history' && { color: theme.primary, fontWeight: 'bold' }
          ]}>
            📜 History ({paymentHistory.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'active' ? (
        <FlatList
        style={styles.content}
        data={directDebits}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        renderItem={({ item: debit }) => {
          const isCreditCardPayment = debit.category === 'Credit Card';
          return (
            <TouchableOpacity 
              style={[
                styles.debitItem, 
                { backgroundColor: theme.cardBg },
                isCreditCardPayment && { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }
              ]}
              onPress={() => handleEditDebit(debit)}
            >
              <View style={styles.debitHeader}>
                <View style={styles.debitInfo}>
                  <Text style={styles.debitEmoji}>{getCategoryEmoji(debit.category)}</Text>
                  <View>
                    <Text style={[styles.debitName, { color: theme.text }]}>{debit.name}</Text>
                    <Text style={[styles.debitCategory, { color: theme.textSecondary }]}>
                      {debit.category || 'Other'}
                    </Text>
                    {debit.description && (
                      <Text style={[styles.debitDescription, { color: theme.textSecondary }]}>
                        {debit.description}
                      </Text>
                    )}
                    <Text style={[styles.debitDetails, { color: theme.textSecondary }]}>
                      {debit.frequency} • Next: {debit.nextDate}
                    </Text>
                    {isCreditCardPayment && (
                      <Text style={[styles.linkedCardText, { color: '#f59e0b' }]}>
                        ↗ Managed from credit card
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.debitRight}>
                  <Text style={[styles.debitAmount, { color: theme.text }]}>{debit.amount}</Text>
                  <TouchableOpacity 
                    style={[styles.statusBadge, { backgroundColor: getStatusColor(debit.status) }]}
                    onPress={(e) => { e.stopPropagation(); handleTogglePause(debit); }}
                  >
                    <Text style={styles.statusText}>{debit.status === 'Paused' ? '▶ Resume' : debit.status}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {debit.status !== 'Paused' && (
                <TouchableOpacity 
                  style={[styles.pauseBtn, { borderColor: theme.textSecondary + '30' }]}
                  onPress={(e) => { e.stopPropagation(); handleTogglePause(debit); }}
                >
                  <Text style={{ color: '#f59e0b', fontSize: 12 }}>⏸ Pause</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
            <Text style={styles.emptyStateEmoji}>💰</Text>
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Direct Debits</Text>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              You don't have any direct debits set up yet. Add one to get started!
            </Text>
          </View>
        )}
      />
      ) : (
        // Payment History Tab
        <FlatList
          style={styles.content}
          data={paymentHistory}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
          renderItem={({ item: payment }) => (
            <View style={[styles.paymentHistoryItem, { backgroundColor: theme.cardBg }]}>
              <View style={styles.paymentHeader}>
                <View style={styles.paymentInfo}>
                  <Text style={[styles.paymentName, { color: theme.text }]}>
                    {payment.directDebitName}
                  </Text>
                  <Text style={[styles.paymentDate, { color: theme.textSecondary }]}>
                    {new Date(payment.paymentDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.paymentAmountContainer}>
                  <Text style={[styles.paymentAmount, { color: '#ef4444' }]}>
                    {payment.amount}
                  </Text>
                  <View style={[styles.paymentStatusBadge, { backgroundColor: '#10b981' + '20' }]}>
                    <Text style={[styles.paymentStatusText, { color: '#10b981' }]}>
                      ✓ Completed
                    </Text>
                  </View>
                </View>
              </View>
              
              {payment.category && (
                <View style={styles.paymentDetails}>
                  <Text style={[styles.paymentCategory, { color: theme.textSecondary }]}>
                    {getCategoryEmoji(payment.category)} {payment.category}
                  </Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBg }]}>
              <Text style={styles.emptyStateEmoji}>📜</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Payment History</Text>
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                Your direct debit payment history will appear here once payments are processed.
              </Text>
            </View>
          )}
        />
      )}

      {/* Add Direct Debit Modal */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Add Direct Debit</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Company Name</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g. Netflix, Spotify"
                  placeholderTextColor="#a0aec0"
                  value={debitName}
                  onChangeText={(text) => {
                    setDebitName(text);
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: null }));
                    }
                  }}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, errors.description && styles.inputError]}
                  placeholder="e.g. Premium subscription, Monthly streaming service"
                  placeholderTextColor="#a0aec0"
                  value={debitDescription}
                  onChangeText={(text) => {
                    setDebitDescription(text);
                    if (errors.description) {
                      setErrors(prev => ({ ...prev, description: null }));
                    }
                  }}
                  multiline
                  numberOfLines={2}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              </View>

              {/* Amount and Date side by side */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={[styles.input, errors.amount && styles.inputError]}
                    placeholder="£0.00"
                    placeholderTextColor="#a0aec0"
                    value={debitAmount}
                    onChangeText={(text) => {
                      // Only allow numbers and decimal point
                      const numericText = text.replace(/[^0-9.]/g, '');
                      const parts = numericText.split('.');
                      let formattedText = parts[0];
                      if (parts.length > 1) {
                        formattedText += '.' + parts[1].substring(0, 2);
                      }
                      setDebitAmount(formattedText);
                      if (errors.amount) {
                        setErrors(prev => ({ ...prev, amount: null }));
                      }
                    }}
                    keyboardType="decimal-pad"
                  />
                  {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Next Payment Date</Text>
                  <TextInput
                    style={[styles.input, errors.date && styles.inputError]}
                    placeholder="Day of month (1-31)"
                    placeholderTextColor="#a0aec0"
                    value={debitDate}
                    onChangeText={(text) => {
                      // Only allow numbers 1-31
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 31)) {
                        setDebitDate(numericText);
                      }
                      if (errors.date) {
                        setErrors(prev => ({ ...prev, date: null }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencyButtons}>
                  {['Weekly', 'Monthly', 'Quarterly', 'Yearly'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        debitFrequency === freq && styles.frequencyButtonActive
                      ]}
                      onPress={() => setDebitFrequency(freq)}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        debitFrequency === freq && styles.frequencyButtonTextActive
                      ]}>
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
                >
                  <View style={styles.dropdownContent}>
                    <Text style={styles.dropdownEmoji}>
                      {categoryOptions.find(cat => cat.name === debitCategory)?.emoji || '📄'}
                    </Text>
                    <Text style={styles.dropdownText}>{debitCategory}</Text>
                  </View>
                  <Text style={styles.dropdownArrow}>
                    {categoryDropdownVisible ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {categoryDropdownVisible && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                      {categoryOptions.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.dropdownItem,
                            debitCategory === category.name && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setDebitCategory(category.name);
                            setCategoryDropdownVisible(false);
                          }}
                        >
                          <Text style={styles.dropdownItemEmoji}>{category.emoji}</Text>
                          <Text style={[
                            styles.dropdownItemText,
                            debitCategory === category.name && styles.dropdownItemTextSelected
                          ]}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Credit Card Selector - only show when category is Credit Card and on debit card */}
              {debitCategory === 'Credit Card' && card.type === 'debit' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Select Credit Card to Pay</Text>
                  {userCreditCards.length > 0 ? (
                    <View style={styles.creditCardOptions}>
                      {userCreditCards.map((creditCard) => (
                        <TouchableOpacity
                          key={creditCard.id}
                          style={[
                            styles.creditCardOption,
                            selectedCreditCard?.id === creditCard.id && styles.creditCardOptionSelected
                          ]}
                          onPress={() => {
                            setSelectedCreditCard(creditCard);
                            // Auto-fill name with credit card info
                            setDebitName(`${creditCard.bank} Credit Card`);
                          }}
                        >
                          <Text style={styles.creditCardEmoji}>💳</Text>
                          <View style={styles.creditCardInfo}>
                            <Text style={[
                              styles.creditCardName,
                              selectedCreditCard?.id === creditCard.id && styles.creditCardNameSelected
                            ]}>
                              {creditCard.bank} ****{creditCard.lastFour}
                            </Text>
                            <Text style={styles.creditCardDue}>
                              Due: Day {creditCard.dueDay || 'N/A'}
                            </Text>
                          </View>
                          {selectedCreditCard?.id === creditCard.id && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noCreditCards}>No credit cards found. Add a credit card first.</Text>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSaveDebit}>
                <Text style={styles.submitButtonText}>Add Direct Debit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Direct Debit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>✏️ Edit Direct Debit</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={[styles.closeIcon, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Company Name</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="e.g., Netflix"
                  placeholderTextColor="#a0aec0"
                  value={debitName}
                  onChangeText={(text) => {
                    setDebitName(text);
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: null }));
                    }
                  }}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, errors.description && styles.inputError]}
                  placeholder="e.g. Premium subscription, Monthly streaming service"
                  placeholderTextColor="#a0aec0"
                  value={debitDescription}
                  onChangeText={(text) => {
                    setDebitDescription(text);
                    if (errors.description) {
                      setErrors(prev => ({ ...prev, description: null }));
                    }
                  }}
                  multiline
                  numberOfLines={2}
                />
                {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput
                    style={[styles.input, errors.amount && styles.inputError]}
                    placeholder="£0.00"
                    placeholderTextColor="#a0aec0"
                    value={debitAmount}
                    onChangeText={(text) => {
                      // Only allow numbers and decimal point
                      const numericText = text.replace(/[^0-9.]/g, '');
                      const parts = numericText.split('.');
                      let formattedText = parts[0];
                      if (parts.length > 1) {
                        formattedText += '.' + parts[1].substring(0, 2);
                      }
                      setDebitAmount(formattedText);
                      if (errors.amount) {
                        setErrors(prev => ({ ...prev, amount: null }));
                      }
                    }}
                    keyboardType="decimal-pad"
                  />
                  {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Next Payment Date</Text>
                  <TextInput
                    style={[styles.input, errors.date && styles.inputError]}
                    placeholder="Day of month (1-31)"
                    placeholderTextColor="#a0aec0"
                    value={debitDate}
                    onChangeText={(text) => {
                      // Only allow numbers 1-31
                      const numericText = text.replace(/[^0-9]/g, '');
                      if (numericText === '' || (parseInt(numericText) >= 1 && parseInt(numericText) <= 31)) {
                        setDebitDate(numericText);
                      }
                      if (errors.date) {
                        setErrors(prev => ({ ...prev, date: null }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
                </View>
              </View>

              {/* Frequency Selector */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencySelector}>
                  {['Weekly', 'Monthly', 'Quarterly', 'Annually'].map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        debitFrequency === freq && styles.frequencyButtonActive
                      ]}
                      onPress={() => setDebitFrequency(freq)}
                    >
                      <Text style={[
                        styles.frequencyButtonText,
                        debitFrequency === freq && styles.frequencyButtonTextActive
                      ]}>
                        {freq}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setCategoryDropdownVisible(!categoryDropdownVisible)}
                >
                  <View style={styles.categoryContent}>
                    <Text style={styles.categoryEmoji}>
                      {categoryOptions.find(cat => cat.name === debitCategory)?.emoji || '📄'}
                    </Text>
                    <Text style={styles.categoryText}>{debitCategory}</Text>
                  </View>
                  <Text style={styles.categoryArrow}>
                    {categoryDropdownVisible ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {categoryDropdownVisible && (
                  <View style={styles.categoryDropdown}>
                    <ScrollView style={styles.categoryScroll} nestedScrollEnabled={true}>
                      {categoryOptions.map((category) => (
                        <TouchableOpacity
                          key={category.id}
                          style={[
                            styles.categoryOption,
                            debitCategory === category.name && styles.categoryOptionSelected
                          ]}
                          onPress={() => {
                            setDebitCategory(category.name);
                            setCategoryDropdownVisible(false);
                          }}
                        >
                          <Text style={styles.categoryOptionEmoji}>{category.emoji}</Text>
                          <Text style={[
                            styles.categoryOptionText,
                            debitCategory === category.name && styles.categoryOptionTextSelected
                          ]}>
                            {category.name}
                          </Text>
                          {debitCategory === category.name && (
                            <Text style={styles.categoryCheckmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => {
                  handleDeleteDebit(selectedDebit.id);
                  setEditModalVisible(false);
                }}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateDebit}>
                <Text style={styles.submitButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Help Modal */}
      <Modal
        visible={importHelpModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImportHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 CSV Import Format</Text>
              <TouchableOpacity onPress={() => setImportHelpModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>Required Columns:</Text>
                <Text style={[styles.helpText, { fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: 10, borderRadius: 6 }]}>
                  Company, Amount, Frequency, Category, Date
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>Format Requirements:</Text>
                
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementLabel}>• Company:</Text>
                  <Text style={styles.requirementText}>Name of the company (e.g., "Netflix")</Text>
                </View>
                
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementLabel}>• Amount:</Text>
                  <Text style={styles.requirementText}>Price with £ symbol (e.g., "£12.99")</Text>
                </View>
                
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementLabel}>• Frequency:</Text>
                  <Text style={styles.requirementText}>Weekly, Monthly, Quarterly, or Yearly</Text>
                </View>
                
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementLabel}>• Category:</Text>
                  <Text style={styles.requirementText}>Credit Card, Entertainment, Utilities, Health & Fitness, etc.</Text>
                </View>
                
                <View style={styles.requirementItem}>
                  <Text style={styles.requirementLabel}>• Date:</Text>
                  <Text style={styles.requirementText}>DD/MM/YYYY format (e.g., "15/01/2024")</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>Supported File Types:</Text>
                <View style={[styles.helpText, { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 6, marginBottom: 16 }]}>
                  <Text style={[styles.requirementText, { marginBottom: 4 }]}>✅ CSV files (.csv) - from any spreadsheet app</Text>
                  <Text style={[styles.requirementText, { marginBottom: 4 }]}>✅ Numbers files (.numbers) - direct processing</Text>
                  <Text style={[styles.requirementText, { fontSize: 12, color: '#6b7280' }]}>
                    The file picker will only show these supported formats
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>Template Categories (Optional):</Text>
                <Text style={[styles.helpText, { marginBottom: 10, fontSize: 12, color: '#718096' }]}>
                  Select categories to include in the template, or leave blank for all categories
                </Text>
                <View style={styles.categoryGrid}>
                  {categoryOptions.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryChip,
                        selectedTemplateCategories.includes(category.name) && styles.categoryChipSelected
                      ]}
                      onPress={() => {
                        if (selectedTemplateCategories.includes(category.name)) {
                          setSelectedTemplateCategories(prev => prev.filter(cat => cat !== category.name));
                        } else {
                          setSelectedTemplateCategories(prev => [...prev, category.name]);
                        }
                      }}
                    >
                      <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                      <Text style={[
                        styles.categoryChipText,
                        selectedTemplateCategories.includes(category.name) && styles.categoryChipTextSelected
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>Export Instructions:</Text>
                <View style={[styles.helpText, { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 6, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}>
                  <Text style={[styles.requirementLabel, { color: '#1e40af', marginBottom: 8 }]}>📱 From Numbers (iOS/Mac):</Text>
                  <Text style={[styles.requirementText, { marginBottom: 4 }]}>1. Open your file in Numbers</Text>
                  <Text style={[styles.requirementText, { marginBottom: 4 }]}>2. Tap Share → Export → CSV</Text>
                  <Text style={[styles.requirementText, { marginBottom: 8 }]}>3. Save and upload the .csv file</Text>
                  
                  <Text style={[styles.requirementLabel, { color: '#1e40af', marginBottom: 8 }]}>💻 From Excel:</Text>
                  <Text style={[styles.requirementText, { marginBottom: 4 }]}>1. File → Save As → CSV format</Text>
                  
                  <Text style={[styles.requirementLabel, { color: '#1e40af', marginBottom: 8 }]}>🌐 From Google Sheets:</Text>
                  <Text style={[styles.requirementText, { marginBottom: 4 }]}>1. File → Download → CSV</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { fontSize: 16, marginBottom: 10 }]}>Example CSV Content:</Text>
                <Text style={[styles.helpText, { fontFamily: 'monospace', backgroundColor: '#f5f5f5', padding: 10, borderRadius: 6, fontSize: 12 }]}>
{`Company,Amount,Frequency,Category,Date
Netflix,£12.99,Monthly,Entertainment,15/01/2024
British Gas,£85.50,Monthly,Utilities,01/02/2024`}
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setImportHelpModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Got it</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: '#10b981' }]} 
                onPress={() => {
                  downloadSampleCSV();
                }}
              >
                <Text style={styles.submitButtonText}>📥 Download Sample</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={() => {
                  setImportHelpModalVisible(false);
                  handleFileUpload();
                }}
              >
                <Text style={styles.submitButtonText}>Select File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Numbers File Processing Modal */}
      <Modal
        visible={numbersFileModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNumbersFileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedNumbersFile?.errorType ? '❌ File Error' :
                 selectedNumbersFile?.fileType === 'csv' ? '📁 CSV File' : '📱 Numbers File'}
              </Text>
              <TouchableOpacity onPress={() => setNumbersFileModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedNumbersFile?.errorType === 'unsupported' ? (
                <View>
                  <Text style={[styles.helpText, { marginBottom: 16, color: '#ef4444' }]}>
                    ❌ Unsupported File Format
                  </Text>
                  <Text style={[styles.helpText, { marginBottom: 16 }]}>
                    {selectedNumbersFile.errorMessage}
                  </Text>
                </View>
              ) : selectedNumbersFile?.fileType === 'csv' ? (
                <View>
                  <Text style={[styles.helpText, { marginBottom: 16 }]}>
                    📁 CSV File Ready to Import
                  </Text>
                  <Text style={[styles.helpText, { marginBottom: 16 }]}>
                    {selectedNumbersFile.message}
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={[styles.helpText, { marginBottom: 16 }]}>
                    You selected a Numbers file. We'll try to extract the data directly.
                  </Text>
                  <Text style={[styles.helpText, { marginTop: 16, fontSize: 14, color: '#6b7280' }]}>
                    Note: Numbers files are complex. If direct processing fails, we'll guide you through exporting as CSV.
                  </Text>
                </View>
              )}
              
              {selectedNumbersFile && (
                <View style={[styles.formGroup, { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 6 }]}>
                  <Text style={[styles.label, { marginBottom: 4 }]}>Selected File:</Text>
                  <Text style={[styles.helpText, { fontWeight: '600' }]}>{selectedNumbersFile.name}</Text>
                  <Text style={[styles.helpText, { fontSize: 12, color: '#6b7280' }]}>
                    Type: {selectedNumbersFile.fileType === 'csv' ? 'CSV File' : 
                           selectedNumbersFile.errorType ? 'Unsupported Format' : 'Numbers Document'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setNumbersFileModalVisible(false);
                  setSelectedNumbersFile(null);
                }}
              >
                <Text style={styles.cancelButtonText}>
                  {selectedNumbersFile?.errorType ? 'OK' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              
              {!selectedNumbersFile?.errorType && (
                <TouchableOpacity 
                  style={styles.submitButton} 
                  onPress={() => {
                    setNumbersFileModalVisible(false);
                    if (selectedNumbersFile) {
                      processUploadedFile(selectedNumbersFile);
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>
                    {selectedNumbersFile?.fileType === 'csv' ? 'Import CSV' : 'Process Numbers File'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Confirmation Modal */}
      <Modal
        visible={importConfirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImportConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✅ Import Successful</Text>
              <TouchableOpacity onPress={() => setImportConfirmModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalBody, { maxHeight: 400 }]}>
              <Text style={[styles.helpText, { marginBottom: 16, fontSize: 16 }]}>
                Found {parsedDebits.length} direct debits. Import them now?
              </Text>
              
              <View style={[styles.formGroup, { backgroundColor: '#f0f9ff', padding: 12, borderRadius: 6, marginBottom: 16 }]}>
                <Text style={[styles.label, { marginBottom: 8 }]}>Debits Found:</Text>
                {parsedDebits.map((debit, index) => (
                  <Text key={index} style={[styles.helpText, { marginBottom: 4 }]}>
                    • {debit.name}: {debit.amount} ({debit.frequency})
                  </Text>
                ))}
              </View>

              <View style={[styles.formGroup, { backgroundColor: '#fef3c7', padding: 12, borderRadius: 6 }]}>
                <Text style={[styles.helpText, { fontSize: 14, color: '#92400e' }]}>
                  💡 These direct debits will be added to your account and will process automatically on their due dates.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setImportConfirmModalVisible(false);
                  setParsedDebits([]);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={() => {
                  setImportConfirmModalVisible(false);
                  saveImportedDebits(parsedDebits);
                }}
              >
                <Text style={styles.submitButtonText}>Import All ({parsedDebits.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  uploadButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  cardInfo: {
    alignItems: 'center',
  },
  cardText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  totalText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  debitItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 1px 4px rgba(0, 0, 0, 0.05)' : undefined,
  },
  debitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  debitEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  debitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 2,
  },
  debitCategory: {
    fontSize: 13,
    color: '#718096',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  debitDescription: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'normal',
    marginBottom: 2,
    lineHeight: 16,
  },
  debitDetails: {
    fontSize: 14,
    color: '#718096',
  },
  linkedCardText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  debitRight: {
    alignItems: 'flex-end',
  },
  debitAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0 1px 4px rgba(0, 0, 0, 0.05)' : undefined,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    boxShadow: Platform.OS === 'web' ? '0 4px 8px rgba(0, 0, 0, 0.25)' : undefined,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeIcon: {
    fontSize: 24,
    color: '#4a5568',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a202c',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  frequencyButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
    color: '#ffffff',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  dropdownButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1a202c',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  // Credit Card Selector Styles
  creditCardOptions: {
    gap: 8,
  },
  creditCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f7fafc',
  },
  creditCardOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#eef2ff',
  },
  creditCardEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  creditCardInfo: {
    flex: 1,
  },
  creditCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  creditCardNameSelected: {
    color: '#667eea',
  },
  creditCardDue: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: 'bold',
  },
  noCreditCards: {
    fontSize: 14,
    color: '#a0aec0',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  helpText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  requirementLabel: {
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '600',
    width: 80,
    flexShrink: 0,
  },
  requirementText: {
    fontSize: 14,
    color: '#4a5568',
    flex: 1,
    lineHeight: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  categoryChipSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '500',
    marginLeft: 4,
  },
  categoryChipTextSelected: {
    color: '#ffffff',
  },
  // Category Selector Styles for Edit Modal
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  categoryArrow: {
    fontSize: 16,
    color: '#a0aec0',
    marginLeft: 8,
  },
  categoryDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryScroll: {
    maxHeight: 180,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  categoryOptionSelected: {
    backgroundColor: '#eef2ff',
  },
  categoryOptionEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#2d3748',
    flex: 1,
  },
  categoryOptionTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  categoryCheckmark: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: 'bold',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // Payment history styles
  paymentHistoryItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 13,
    color: '#718096',
  },
  paymentAmountContainer: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f7fafc',
  },
  paymentCategory: {
    fontSize: 14,
    fontWeight: '500',
  },
  pauseBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
