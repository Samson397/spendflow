// Social Finance - Payment Requests Service
import FirebaseService from './FirebaseService';

class PaymentRequestsService {
  // Create payment request
  async createPaymentRequest(data) {
    try {
      const requestData = {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: data.amount,
        currency: data.currency || 'GBP',
        reason: data.reason,
        type: data.type, // 'one_time', 'split', 'recurring'
        dueDate: data.dueDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
        reminderSent: false,
        metadata: data.metadata || {}
      };

      const result = await FirebaseService.createPaymentRequest(requestData);
      
      if (result.success) {
        // Send notification to recipient
        await this.sendPaymentRequestNotification(data.toUserId, requestData);
      }

      return result;
    } catch (error) {
      console.error('Create payment request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create split bill request
  async createSplitBillRequest(data) {
    try {
      const splitData = {
        organizerId: data.organizerId,
        totalAmount: data.totalAmount,
        currency: data.currency || 'GBP',
        description: data.description,
        participants: data.participants, // Array of { userId, amount, paid: false }
        type: 'split',
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueDate: data.dueDate
      };

      const result = await FirebaseService.createSplitBillRequest(splitData);
      
      if (result.success) {
        // Send notifications to all participants
        for (const participant of data.participants) {
          await this.sendSplitBillNotification(participant.userId, splitData);
        }
      }

      return result;
    } catch (error) {
      console.error('Create split bill request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Accept payment request
  async acceptPaymentRequest(requestId, fromUserId) {
    try {
      const request = await FirebaseService.getPaymentRequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      // Update request status
      await FirebaseService.updatePaymentRequest(requestId, {
        status: 'accepted',
        respondedAt: new Date().toISOString()
      });

      // Notify the requester
      await this.sendPaymentRequestAcceptedNotification(request.fromUserId, fromUserId, request.amount);

      return { success: true };
    } catch (error) {
      console.error('Accept payment request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Process actual payment for payment request
  async processPaymentRequest(requestId, fromUserId, cardId) {
    try {
      const request = await FirebaseService.getPaymentRequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      // Get the card to debit from
      const card = await FirebaseService.getUserCard(fromUserId, cardId);
      if (!card) {
        return { success: false, error: 'Card not found' };
      }

      // Check if card has sufficient balance
      if (card.balance < request.amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Process the transfer
      const transferResult = await FirebaseService.processCardTransfer(
        fromUserId,
        cardId,
        request.amount,
        `Payment to ${request.fromUserName || 'user'}: ${request.reason}`,
        'payment_request'
      );

      if (!transferResult.success) {
        return { success: false, error: transferResult.error || 'Transfer failed' };
      }

      // Update request status to completed
      await FirebaseService.updatePaymentRequest(requestId, {
        status: 'completed',
        processedAt: new Date().toISOString(),
        processedWithCard: cardId,
        transactionId: transferResult.transactionId
      });

      // Create transaction record for the sender
      await FirebaseService.createTransaction({
        userId: fromUserId,
        amount: -request.amount, // Negative for outgoing payment
        type: 'payment',
        category: 'Transfers',
        description: `Payment to ${request.fromUserName || 'user'}: ${request.reason}`,
        cardId: cardId,
        date: new Date().toISOString(),
        relatedRequestId: requestId
      });

      // Notify the requester that payment was processed
      await this.sendPaymentProcessedNotification(request.fromUserId, fromUserId, request.amount);

      return { success: true, transactionId: transferResult.transactionId };
    } catch (error) {
      console.error('Process payment request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Decline payment request
  async declinePaymentRequest(requestId, fromUserId, reason = '') {
    try {
      const request = await FirebaseService.getPaymentRequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      // Update request status
      await FirebaseService.updatePaymentRequest(requestId, {
        status: 'declined',
        respondedAt: new Date().toISOString(),
        declineReason: reason
      });

      // Notify the requester
      await this.sendPaymentRequestDeclinedNotification(request.fromUserId, fromUserId, request.amount, reason);

      return { success: true };
    } catch (error) {
      console.error('Decline payment request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark payment request as paid
  async markAsPaid(requestId, paymentMethod = 'transfer') {
    try {
      const request = await FirebaseService.getPaymentRequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      // Update request status
      await FirebaseService.updatePaymentRequest(requestId, {
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod
      });

      // Notify both parties
      await this.sendPaymentCompletedNotification(request.fromUserId, request.toUserId, request.amount);

      return { success: true };
    } catch (error) {
      console.error('Mark as paid error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's payment requests (sent and received)
  async getUserPaymentRequests(userId, type = 'all') {
    try {
      let requests = [];
      
      if (type === 'all' || type === 'sent') {
        const sent = await FirebaseService.getSentPaymentRequests(userId);
        requests = requests.concat(sent);
      }
      
      if (type === 'all' || type === 'received') {
        const received = await FirebaseService.getReceivedPaymentRequests(userId);
        requests = requests.concat(received);
      }

      // Enrich with user details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const otherUserId = request.fromUserId === userId ? request.toUserId : request.fromUserId;
          const userDetails = await FirebaseService.getUserDetails(otherUserId);
          
          return {
            ...request,
            otherUser: userDetails,
            direction: request.fromUserId === userId ? 'sent' : 'received'
          };
        })
      );

      return { success: true, requests: enrichedRequests };
    } catch (error) {
      console.error('Get user payment requests error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get split bills for user
  async getUserSplitBills(userId) {
    try {
      const result = await FirebaseService.getUserSplitBills(userId);
      
      if (!result.success) {
        return { success: false, error: 'Failed to load split bills' };
      }
      
      const splitBills = result.data || [];
      
      // Enrich with participant details
      const enrichedSplitBills = await Promise.all(
        splitBills.map(async (splitBill) => {
          const enrichedParticipants = await Promise.all(
            splitBill.participants.map(async (participant) => {
              const userDetails = await FirebaseService.getUserDetails(participant.userId);
              return {
                ...participant,
                user: userDetails
              };
            })
          );

          return {
            ...splitBill,
            participants: enrichedParticipants
          };
        })
      );

      return { success: true, splitBills: enrichedSplitBills };
    } catch (error) {
      console.error('Get user split bills error:', error);
      return { success: false, error: error.message };
    }
  }

  // Accept split bill invitation
  async acceptSplitBill(splitBillId, userId) {
    try {
      await FirebaseService.updateSplitBillParticipant(splitBillId, userId, {
        status: 'accepted',
        respondedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Accept split bill error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark split bill participant as paid
  async markSplitBillParticipantPaid(splitBillId, userId) {
    try {
      await FirebaseService.updateSplitBillParticipant(splitBillId, userId, {
        paid: true,
        paidAt: new Date().toISOString()
      });

      // Check if all participants have paid
      const splitBill = await FirebaseService.getSplitBill(splitBillId);
      const allPaid = splitBill.participants.every(p => p.paid);
      
      if (allPaid) {
        await FirebaseService.updateSplitBill(splitBillId, {
          status: 'completed',
          completedAt: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Mark split bill participant paid error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send payment request notification
  async sendPaymentRequestNotification(toUserId, requestData) {
    const notification = {
      userId: toUserId,
      type: 'payment_request',
      title: '💰 Payment Request',
      message: `You have a payment request of ${requestData.currency} ${requestData.amount}`,
      data: {
        requestId: requestData.id,
        amount: requestData.amount,
        currency: requestData.currency,
        reason: requestData.reason
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send split bill notification
  async sendSplitBillNotification(toUserId, splitData) {
    const notification = {
      userId: toUserId,
      type: 'split_bill_request',
      title: '🧾 Split Bill Request',
      message: `You've been added to a split bill: ${splitData.description}`,
      data: {
        splitBillId: splitData.id,
        totalAmount: splitData.totalAmount,
        description: splitData.description
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send payment processed notification
  async sendPaymentProcessedNotification(toUserId, fromUserId, amount) {
    const notification = {
      userId: toUserId,
      type: 'payment_processed',
      title: '💳 Payment Processed',
      message: `Your payment request for £${amount} has been processed`,
      data: {
        fromUserId,
        amount
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send payment request accepted notification
  async sendPaymentRequestAcceptedNotification(toUserId, fromUserId, amount) {
    const userDetails = await FirebaseService.getUserDetails(fromUserId);
    
    const notification = {
      userId: toUserId,
      type: 'payment_request_accepted',
      title: '✅ Payment Request Accepted',
      message: `${userDetails.name || userDetails.email} accepted your payment request of ${amount}`,
      data: {
        fromUserId,
        amount
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send payment request declined notification
  async sendPaymentRequestDeclinedNotification(toUserId, fromUserId, amount, reason) {
    const userDetails = await FirebaseService.getUserDetails(fromUserId);
    
    const notification = {
      userId: toUserId,
      type: 'payment_request_declined',
      title: '❌ Payment Request Declined',
      message: `${userDetails.name || userDetails.email} declined your payment request of ${amount}`,
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

  // Send payment completed notification
  async sendPaymentCompletedNotification(fromUserId, toUserId, amount) {
    const fromUserDetails = await FirebaseService.getUserDetails(fromUserId);
    const toUserDetails = await FirebaseService.getUserDetails(toUserId);
    
    // Notify sender
    const senderNotification = {
      userId: fromUserId,
      type: 'payment_completed',
      title: '✅ Payment Completed',
      message: `${toUserDetails.name || toUserDetails.email} paid your request of ${amount}`,
      createdAt: new Date().toISOString(),
      read: false
    };

    // Notify receiver
    const receiverNotification = {
      userId: toUserId,
      type: 'payment_sent',
      title: '💸 Payment Sent',
      message: `You paid ${fromUserDetails.name || fromUserDetails.email} ${amount}`,
      createdAt: new Date().toISOString(),
      read: false
    };

    await Promise.all([
      FirebaseService.createNotification(senderNotification),
      FirebaseService.createNotification(receiverNotification)
    ]);
  }

  // Get payment statistics
  async getPaymentStats(userId) {
    try {
      const requests = await this.getUserPaymentRequests(userId);
      const splitBills = await this.getUserSplitBills(userId);
      
      const stats = {
        totalRequested: requests.requests
          .filter(r => r.direction === 'sent')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0),
        totalOwed: requests.requests
          .filter(r => r.direction === 'received' && r.status === 'pending')
          .reduce((sum, r) => sum + parseFloat(r.amount), 0),
        pendingRequests: requests.requests.filter(r => r.status === 'pending').length,
        completedThisMonth: requests.requests
          .filter(r => r.status === 'paid' && new Date(r.paidAt).getMonth() === new Date().getMonth())
          .length,
        activeSplitBills: splitBills.splitBills.filter(s => s.status !== 'completed').length
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Get payment stats error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new PaymentRequestsService();
