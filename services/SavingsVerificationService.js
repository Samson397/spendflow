import FirebaseService from './FirebaseService';

class SavingsVerificationService {
  constructor() {
    this.verificationMethods = {
      BANK_INTEGRATION: 'bank_integration',
      RECEIPT_UPLOAD: 'receipt_upload',
      SPENDING_ANALYSIS: 'spending_analysis',
      PEER_VERIFICATION: 'peer_verification',
      MANUAL_REVIEW: 'manual_review'
    };
  }

  // Verify savings claim against user's actual spending data
  async verifySavingsAgainstSpending(userId, claimedSavings, tipCategory, timeframe = 30) {
    try {
      // Get user's transactions from the last X days
      const userTransactions = await FirebaseService.getUserTransactionsByDays(userId, timeframe);
      
      if (!userTransactions.success || !userTransactions.data.length) {
        return {
          verified: false,
          confidence: 0,
          reason: 'No transaction data available for verification',
          method: this.verificationMethods.SPENDING_ANALYSIS
        };
      }

      const transactions = userTransactions.data;
      
      // Analyze spending patterns based on tip category
      const categoryAnalysis = this.analyzeCategorySpending(transactions, tipCategory, claimedSavings);
      
      return {
        verified: categoryAnalysis.verified,
        confidence: categoryAnalysis.confidence,
        reason: categoryAnalysis.reason,
        method: this.verificationMethods.SPENDING_ANALYSIS,
        data: categoryAnalysis
      };
    } catch (error) {
      console.error('Error verifying savings:', error);
      return {
        verified: false,
        confidence: 0,
        reason: 'Verification failed due to technical error',
        method: this.verificationMethods.SPENDING_ANALYSIS
      };
    }
  }

  // Analyze spending in specific categories
  analyzeCategorySpending(transactions, tipCategory, claimedSavings) {
    const categoryMappings = {
      'budgeting': ['groceries', 'shopping', 'entertainment', 'dining'],
      'saving': ['subscriptions', 'utilities', 'insurance'],
      'investing': ['investment', 'savings', 'pension'],
      'debt': ['credit_card', 'loan', 'mortgage'],
      'frugal': ['groceries', 'shopping', 'utilities'],
      'income': ['salary', 'freelance', 'business']
    };

    const relevantCategories = categoryMappings[tipCategory] || [];
    
    // Calculate spending in relevant categories
    const relevantSpending = transactions
      .filter(t => relevantCategories.includes(t.category?.toLowerCase()))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate average monthly spending
    const monthlySpending = relevantSpending / (transactions.length > 0 ? 1 : 1);
    
    // Verification logic
    let verified = false;
    let confidence = 0;
    let reason = '';

    if (claimedSavings <= monthlySpending * 0.5) {
      // Claimed savings is reasonable (up to 50% of category spending)
      verified = true;
      confidence = 85;
      reason = 'Savings amount is reasonable based on your spending patterns';
    } else if (claimedSavings <= monthlySpending) {
      // Claimed savings is high but possible
      verified = true;
      confidence = 60;
      reason = 'Savings amount is high but within possible range';
    } else {
      // Claimed savings exceeds category spending
      verified = false;
      confidence = 20;
      reason = 'Claimed savings exceeds your typical spending in this category';
    }

    return {
      verified,
      confidence,
      reason,
      monthlySpending,
      claimedSavings,
      relevantTransactions: transactions.filter(t => relevantCategories.includes(t.category?.toLowerCase())).length
    };
  }

  // Receipt verification system
  async verifyWithReceipt(userId, tipId, receiptData) {
    try {
      // This would integrate with OCR service to read receipts
      // For now, we'll simulate the verification
      
      const verification = {
        verified: false,
        confidence: 0,
        method: this.verificationMethods.RECEIPT_UPLOAD,
        receiptAnalysis: null
      };

      // Simulate OCR analysis
      if (receiptData && receiptData.amount && receiptData.merchant) {
        verification.verified = true;
        verification.confidence = 90;
        verification.receiptAnalysis = {
          merchant: receiptData.merchant,
          amount: receiptData.amount,
          date: receiptData.date,
          items: receiptData.items || []
        };
      }

      // Store verification result
      await FirebaseService.storeSavingsVerification(userId, tipId, verification);
      
      return verification;
    } catch (error) {
      console.error('Error verifying receipt:', error);
      return {
        verified: false,
        confidence: 0,
        method: this.verificationMethods.RECEIPT_UPLOAD,
        error: error.message
      };
    }
  }

  // Peer verification system
  async initiatePeerVerification(userId, tipId, claimedSavings) {
    try {
      // Create a peer verification request
      const verificationRequest = {
        tipId,
        userId,
        claimedSavings,
        status: 'pending',
        createdAt: new Date(),
        verifications: [],
        requiredVerifications: 3 // Need 3 peer verifications
      };

      await FirebaseService.createPeerVerificationRequest(verificationRequest);
      
      return {
        success: true,
        verificationId: verificationRequest.id,
        message: 'Peer verification request created'
      };
    } catch (error) {
      console.error('Error creating peer verification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Bank integration verification (future feature)
  async verifyWithBankIntegration(userId, claimedSavings, timeframe) {
    // This would integrate with Open Banking APIs
    // to verify actual account balances and spending
    
    return {
      verified: false,
      confidence: 0,
      method: this.verificationMethods.BANK_INTEGRATION,
      message: 'Bank integration coming soon'
    };
  }

  // Calculate verification score for a tip
  async calculateVerificationScore(userId, tipId, claimedSavings, tipCategory) {
    const verifications = [];
    
    // 1. Spending analysis verification
    const spendingVerification = await this.verifySavingsAgainstSpending(
      userId, 
      claimedSavings, 
      tipCategory
    );
    verifications.push(spendingVerification);

    // 2. Check for receipt verification
    const receiptVerification = await FirebaseService.getSavingsVerification(userId, tipId);
    if (receiptVerification.success && receiptVerification.data) {
      verifications.push(receiptVerification.data);
    }

    // 3. Check peer verification status
    const peerVerification = await FirebaseService.getPeerVerificationStatus(tipId);
    if (peerVerification.success && peerVerification.data) {
      verifications.push(peerVerification.data);
    }

    // Calculate overall score
    const totalConfidence = verifications.reduce((sum, v) => sum + (v.confidence || 0), 0);
    const averageConfidence = verifications.length > 0 ? totalConfidence / verifications.length : 0;
    
    const verificationBadge = this.getVerificationBadge(averageConfidence);
    
    return {
      score: averageConfidence,
      badge: verificationBadge,
      verifications,
      verified: averageConfidence >= 70
    };
  }

  // Get verification badge based on confidence score
  getVerificationBadge(confidence) {
    if (confidence >= 90) return { emoji: '✅', label: 'Verified', color: '#10b981' };
    if (confidence >= 70) return { emoji: '🔍', label: 'Likely', color: '#f59e0b' };
    if (confidence >= 50) return { emoji: '❓', label: 'Unverified', color: '#6b7280' };
    return { emoji: '⚠️', label: 'Questionable', color: '#ef4444' };
  }

  // Auto-verify small amounts (under £100)
  async autoVerifySmallAmount(claimedSavings) {
    if (claimedSavings <= 100) {
      return {
        verified: true,
        confidence: 75,
        reason: 'Small amounts auto-verified',
        method: 'auto_verification'
      };
    }
    return null;
  }

  // Flag suspicious patterns
  async detectSuspiciousPatterns(userId) {
    try {
      const userTips = await FirebaseService.getUserTips(userId);
      
      if (!userTips.success) return { suspicious: false };
      
      const tips = userTips.data;
      const totalClaimed = tips.reduce((sum, tip) => sum + (tip.savedAmount || 0), 0);
      const averageClaim = totalClaimed / tips.length;
      
      // Flag patterns
      const flags = [];
      
      if (averageClaim > 1000) {
        flags.push('High average savings claims');
      }
      
      if (tips.filter(tip => tip.savedAmount > 5000).length > 2) {
        flags.push('Multiple high-value claims');
      }
      
      const recentTips = tips.filter(tip => 
        new Date() - new Date(tip.createdAt) < 7 * 24 * 60 * 60 * 1000
      );
      
      if (recentTips.length > 5) {
        flags.push('High posting frequency');
      }
      
      return {
        suspicious: flags.length > 0,
        flags,
        totalClaimed,
        averageClaim,
        tipCount: tips.length
      };
    } catch (error) {
      console.error('Error detecting suspicious patterns:', error);
      return { suspicious: false, error: error.message };
    }
  }
}

export default new SavingsVerificationService();
