// services/__tests__/EmailService.test.js
import EmailService from '../EmailService';
import { getFirestore } from 'firebase/firestore';

// Mock Firebase dependencies
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP')
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

// Mock the fetch API
global.fetch = jest.fn();

describe('EmailService', () => {
  let emailService;

  // Sample test data
  const testUserId = 'testUser123';
  const testEmail = 'test@example.com';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formattedDate = tomorrow.toISOString().split('T')[0];

  beforeEach(() => {
    jest.clearAllMocks();
    emailService = new EmailService();
    
    // Default mock implementations
    getFirestore.mockReturnValue({});
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messageId: 'mock-message-id' })
    });
  });

  describe('sendPaymentReminder', () => {
    it('should send a payment reminder email', async () => {
      const paymentData = {
        cardName: 'Premium Card',
        dueDate: formattedDate,
        amount: 199.99,
        minimumPayment: 25.00
      };

      const result = await emailService.sendPaymentReminder(
        testEmail,
        paymentData,
        testUserId
      );

      expect(result).toHaveProperty('success', true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('cloudfunctions.net'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  describe('sendTipLikedNotification', () => {
    it('should handle rate limiting for multiple likes', async () => {
      // First like
      const result1 = await emailService.sendTipLikedNotification(
        testEmail,
        'Test User',
        'Great Budgeting Tip',
        testUserId
      );
      expect(result1).toHaveProperty('success', true);

      // Second like within rate limit window
      const result2 = await emailService.sendTipLikedNotification(
        testEmail,
        'Test User',
        'Great Budgeting Tip',
        testUserId
      );
      expect(result2).toHaveProperty('rateLimited', true);
    });
  });

  describe('sendBudgetAlert', () => {
    it('should send a budget alert for 85% usage', async () => {
      const budgetData = {
        category: 'Groceries',
        spent: 850,
        budget: 1000,
        percentage: 85,
        remaining: 150
      };

      const result = await emailService.sendBudgetAlert(
        testEmail,
        budgetData,
        testUserId
      );

      expect(result).toHaveProperty('success', true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('sendWeeklyDigest', () => {
    it('should send a weekly digest email', async () => {
      const digestData = {
        weeklySpent: 1250.50,
        weeklySaved: 350.25,
        activeGoals: 3,
        goalProgress: 65,
        tipLikes: 5,
        tipComments: 2
      };

      const result = await emailService.sendWeeklyDigest(
        testEmail,
        'Test User',
        digestData
      );

      expect(result).toHaveProperty('success', true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('sendSecurityAlert', () => {
    it('should send a security alert for suspicious login', async () => {
      const alertData = {
        device: 'iPhone 13',
        location: 'New York, NY',
        time: new Date().toISOString(),
        ip: '192.168.1.1'
      };

      const result = await emailService.sendSecurityAlert(
        testEmail,
        'Suspicious Login Attempt',
        JSON.stringify(alertData, null, 2)
      );

      expect(result).toHaveProperty('success', true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('sendContactForm', () => {
    it('should send a contact form submission', async () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Feedback',
        message: 'Great app! I love using SpendFlow.'
      };

      const result = await emailService.sendContactForm(formData);

      expect(result).toHaveProperty('success', true);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('parseStatementEmail', () => {
    it('should parse a bank statement email', () => {
      const emailContent = `
        Transaction Alert
        -----------------
        Date: 2023-11-15
        Description: AMAZON RETAIL PURCHASE
        Amount: -$49.99

        Date: 2023-11-16
        Description: DEPOSIT FROM EMPLOYER
        Amount: $2,500.00
      `;

      const transactions = emailService.parseStatementEmail(emailContent);
      
      expect(transactions).toHaveLength(2);
      expect(transactions[0]).toHaveProperty('description', 'AMAZON RETAIL PURCHASE');
      expect(transactions[0]).toHaveProperty('amount', -49.99);
      expect(transactions[1]).toHaveProperty('description', 'DEPOSIT FROM EMPLOYER');
      expect(transactions[1]).toHaveProperty('amount', 2500.00);
    });
  });

  describe('security', () => {
    it('should sanitize HTML content to prevent XSS', () => {
      const maliciousInput = '<script>alert("XSS")</script><div onload="malicious()">Test</div>';
      const sanitized = emailService.sanitizeHtml(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('onload=');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should prevent template injection', () => {
      const maliciousInput = '${process.exit(1)}';
      const sanitized = emailService.sanitizeText(maliciousInput);
      
      expect(sanitized).not.toContain('${');
      expect(sanitized).toContain('&#36;&#123;');
    });
  });
});
