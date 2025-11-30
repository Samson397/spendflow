// Social Finance - Smart Transfer Detection Service
import FirebaseService from './FirebaseService';
import ConnectionsService from './ConnectionsService';
import PaymentRequestsService from './PaymentRequestsService';

class SmartTransferService {
  // Detect and match transfers between users
  async detectTransfers() {
    try {
      // Get recent transactions for all users
      const recentTransactions = await FirebaseService.getRecentTransactions(24); // Last 24 hours
      
      // Group transactions by amount and timing
      const transferGroups = this.groupPotentialTransfers(recentTransactions);
      
      // Process each group for potential matches
      for (const group of transferGroups) {
        await this.processTransferGroup(group);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Detect transfers error:', error);
      return { success: false, error: error.message };
    }
  }

  // Group transactions that could be related
  groupPotentialTransfers(transactions) {
    const groups = [];
    
    // Filter for transfer transactions and recent deposits
    const transferTransactions = transactions.filter(t => 
      t.category === 'Transfer' || t.type === 'transfer'
    );
    
    const depositTransactions = transactions.filter(t => 
      t.type === 'income' || t.amount > 0
    );
    
    // Group by amount (within small tolerance) and time window
    for (const transfer of transferTransactions) {
      const amount = Math.abs(parseFloat(transfer.amount));
      const transferTime = new Date(transfer.date);
      
      // Look for matching deposits within 1 hour
      const matchingDeposits = depositTransactions.filter(deposit => {
        const depositAmount = Math.abs(parseFloat(deposit.amount));
        const depositTime = new Date(deposit.date);
        const timeDiff = Math.abs(transferTime - depositTime) / (1000 * 60 * 60); // Hours
        
        return Math.abs(amount - depositAmount) < 0.01 && timeDiff <= 1; // Within 1 hour and same amount
      });
      
      if (matchingDeposits.length > 0) {
        groups.push({
          transfer,
          potentialMatches: matchingDeposits,
          amount,
          timestamp: transferTime
        });
      }
    }
    
    return groups;
  }

  // Process a group of potential transfers
  async processTransferGroup(group) {
    try {
      // Get user details for transfer sender
      const transferUser = await FirebaseService.getUserDetails(group.transfer.userId);
      
      // Check each potential match
      for (const match of group.potentialMatches) {
        const matchUser = await FirebaseService.getUserDetails(match.userId);
        
        // Check if users are connected
        const areConnected = await this.checkConnection(transferUser.id, matchUser.id);
        
        if (areConnected) {
          // Create smart transfer match
          await this.createSmartTransferMatch(group.transfer, match, transferUser, matchUser);
        }
      }
    } catch (error) {
      console.error('Process transfer group error:', error);
    }
  }

  // Check if two users are connected
  async checkConnection(userId1, userId2) {
    try {
      const connection = await FirebaseService.checkExistingConnection(userId1, userId2);
      return connection && connection.status === 'active';
    } catch (error) {
      return false;
    }
  }

  // Create smart transfer match
  async createSmartTransferMatch(transfer, deposit, transferUser, depositUser) {
    try {
      // Check if match already exists
      const existingMatch = await FirebaseService.checkExistingSmartTransferMatch(transfer.id, deposit.id);
      if (existingMatch) {
        return; // Already matched
      }

      // Create the match
      const matchData = {
        transferTransactionId: transfer.id,
        depositTransactionId: deposit.id,
        transferUserId: transferUser.id,
        depositUserId: depositUser.id,
        amount: group.amount,
        status: 'pending_confirmation', // Require confirmation
        createdAt: new Date().toISOString(),
        confidence: this.calculateMatchConfidence(transfer, deposit)
      };

      const result = await FirebaseService.createSmartTransferMatch(matchData);
      
      if (result.success) {
        // Send notifications to both users
        await this.sendSmartTransferNotifications(transfer, deposit, transferUser, depositUser, matchData);
      }

      return result;
    } catch (error) {
      console.error('Create smart transfer match error:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate confidence score for the match
  calculateMatchConfidence(transfer, deposit) {
    let confidence = 0.5; // Base confidence
    
    // Amount match (exact amount)
    const transferAmount = Math.abs(parseFloat(transfer.amount));
    const depositAmount = Math.abs(parseFloat(deposit.amount));
    if (Math.abs(transferAmount - depositAmount) < 0.01) {
      confidence += 0.3;
    }
    
    // Time proximity
    const transferTime = new Date(transfer.date);
    const depositTime = new Date(deposit.date);
    const timeDiff = Math.abs(transferTime - depositTime) / (1000 * 60 * 60); // Hours
    if (timeDiff < 0.5) confidence += 0.2; // Within 30 minutes
    
    // Description keywords
    const transferDesc = (transfer.description || '').toLowerCase();
    const depositDesc = (deposit.description || '').toLowerCase();
    const keywords = ['transfer', 'payment', 'send', 'received'];
    const hasKeywords = keywords.some(keyword => 
      transferDesc.includes(keyword) || depositDesc.includes(keyword)
    );
    if (hasKeywords) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  // Send smart transfer notifications
  async sendSmartTransferNotifications(transfer, deposit, transferUser, depositUser, matchData) {
    // Notify transfer sender
    const senderNotification = {
      userId: transferUser.id,
      type: 'smart_transfer_detected',
      title: '🔗 Smart Transfer Detected',
      message: `Your transfer of ${transfer.amount} may match a deposit received by ${depositUser.name || depositUser.email}`,
      data: {
        matchId: matchData.id,
        transferId: transfer.id,
        depositId: deposit.id,
        otherUserId: depositUser.id,
        amount: transfer.amount,
        confidence: matchData.confidence
      },
      createdAt: new Date().toISOString(),
      read: false,
      requiresAction: true
    };

    // Notify deposit receiver
    const receiverNotification = {
      userId: depositUser.id,
      type: 'smart_transfer_detected',
      title: '🔗 Smart Transfer Detected',
      message: `Your deposit of ${deposit.amount} may match a transfer sent by ${transferUser.name || transferUser.email}`,
      data: {
        matchId: matchData.id,
        transferId: transfer.id,
        depositId: deposit.id,
        otherUserId: transferUser.id,
        amount: deposit.amount,
        confidence: matchData.confidence
      },
      createdAt: new Date().toISOString(),
      read: false,
      requiresAction: true
    };

    await Promise.all([
      FirebaseService.createNotification(senderNotification),
      FirebaseService.createNotification(receiverNotification)
    ]);
  }

  // Accept smart transfer match
  // Accept a smart transfer match
  async acceptSmartTransfer(userId, transferId) {
    return this.acceptSmartTransferMatch(transferId, userId);
  }

  // Reject a smart transfer match
  async rejectSmartTransfer(userId, transferId) {
    return this.rejectSmartTransferMatch(transferId, userId);
  }

  async acceptSmartTransferMatch(matchId, userId) {
    try {
      const match = await FirebaseService.getSmartTransferMatch(matchId);
      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      // Update match status
      await FirebaseService.updateSmartTransferMatch(matchId, {
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: new Date().toISOString()
      });

      // Link the transactions
      await this.linkTransactions(match.transferTransactionId, match.depositTransactionId);

      // Notify the other user if they haven't responded yet
      const otherUserId = match.transferUserId === userId ? match.depositUserId : match.transferUserId;
      if (match.status !== 'accepted_by_both') {
        await this.sendMatchAcceptedNotification(otherUserId, userId, match.amount);
      }

      return { success: true };
    } catch (error) {
      console.error('Accept smart transfer match error:', error);
      return { success: false, error: error.message };
    }
  }

  // Decline smart transfer match
  async declineSmartTransferMatch(matchId, userId, reason = '') {
    try {
      const match = await FirebaseService.getSmartTransferMatch(matchId);
      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      // Update match status
      await FirebaseService.updateSmartTransferMatch(matchId, {
        status: 'declined',
        declinedBy: userId,
        declinedAt: new Date().toISOString(),
        declineReason: reason
      });

      // Notify the other user
      const otherUserId = match.transferUserId === userId ? match.depositUserId : match.transferUserId;
      await this.sendMatchDeclinedNotification(otherUserId, userId, match.amount, reason);

      return { success: true };
    } catch (error) {
      console.error('Decline smart transfer match error:', error);
      return { success: false, error: error.message };
    }
  }

  // Link transactions together
  async linkTransactions(transferId, depositId) {
    try {
      // Add linking metadata to both transactions
      await Promise.all([
        FirebaseService.updateTransaction(transferId, {
          linkedTransactionId: depositId,
          linkType: 'smart_transfer',
          linkedAt: new Date().toISOString()
        }),
        FirebaseService.updateTransaction(depositId, {
          linkedTransactionId: transferId,
          linkType: 'smart_transfer',
          linkedAt: new Date().toISOString()
        })
      ]);

      return { success: true };
    } catch (error) {
      console.error('Link transactions error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's smart transfer matches
  async getUserSmartTransfers(userId) {
    try {
      const matches = await FirebaseService.getUserSmartTransferMatches(userId);
      
      // Enrich with transaction and user details
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          const [transfer, deposit] = await Promise.all([
            FirebaseService.getTransaction(match.transferTransactionId),
            FirebaseService.getTransaction(match.depositTransactionId)
          ]);
          
          const otherUserId = match.transferUserId === userId ? match.depositUserId : match.transferUserId;
          const otherUser = await FirebaseService.getUserDetails(otherUserId);
          
          return {
            ...match,
            transfer,
            deposit,
            otherUser,
            isSender: match.transferUserId === userId
          };
        })
      );

      return { success: true, matches: enrichedMatches };
    } catch (error) {
      console.error('Get user smart transfers error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send match accepted notification
  async sendMatchAcceptedNotification(toUserId, fromUserId, amount) {
    const userDetails = await FirebaseService.getUserDetails(fromUserId);
    
    const notification = {
      userId: toUserId,
      type: 'smart_transfer_accepted',
      title: '✅ Transfer Match Accepted',
      message: `${userDetails.name || userDetails.email} accepted the smart transfer match of ${amount}`,
      data: {
        fromUserId,
        amount
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send match declined notification
  async sendMatchDeclinedNotification(toUserId, fromUserId, amount, reason) {
    const userDetails = await FirebaseService.getUserDetails(fromUserId);
    
    const notification = {
      userId: toUserId,
      type: 'smart_transfer_declined',
      title: '❌ Transfer Match Declined',
      message: `${userDetails.name || userDetails.email} declined the smart transfer match of ${amount}`,
      data: {
        fromUserId,
        amount,
        reason
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Manual transfer match request
  async requestTransferMatch(userId, transactionId, recipientEmail) {
    try {
      // Find user by email
      const users = await FirebaseService.searchUsersByEmail(recipientEmail);
      if (users.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const recipientUser = users[0];
      const transaction = await FirebaseService.getTransaction(transactionId);
      
      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // Create manual match request
      const matchRequest = {
        requesterUserId: userId,
        recipientUserId: recipientUser.id,
        transactionId,
        amount: Math.abs(parseFloat(transaction.amount)),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const result = await FirebaseService.createManualTransferMatchRequest(matchRequest);
      
      if (result.success) {
        // Send notification to recipient
        await this.sendManualMatchRequestNotification(recipientUser.id, userId, transaction);
      }

      return result;
    } catch (error) {
      console.error('Request transfer match error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send manual match request notification
  async sendManualMatchRequestNotification(toUserId, fromUserId, transaction) {
    const userDetails = await FirebaseService.getUserDetails(fromUserId);
    
    const notification = {
      userId: toUserId,
      type: 'manual_transfer_match_request',
      title: '🔗 Transfer Match Request',
      message: `${userDetails.name || userDetails.email} wants to link a transaction of ${transaction.amount} with you`,
      data: {
        fromUserId,
        transactionId: transaction.id,
        amount: transaction.amount,
        description: transaction.description
      },
      createdAt: new Date().toISOString(),
      read: false,
      requiresAction: true
    };

    await FirebaseService.createNotification(notification);
  }
}

export default new SmartTransferService();
