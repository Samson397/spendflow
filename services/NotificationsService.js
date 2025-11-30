// Enhanced Notifications Service for Social Finance
import FirebaseService from './FirebaseService';

class NotificationsService {
  // Create notification
  async createNotification(userId, notificationData) {
    try {
      const notification = {
        userId,
        ...notificationData,
        createdAt: new Date().toISOString(),
        read: false
      };

      return await FirebaseService.createNotification(notification);
    } catch (error) {
      console.error('Create notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 50, unreadOnly = false) {
    try {
      const notifications = await FirebaseService.getUserNotifications(userId, limit, unreadOnly);
      
      // Enrich with user details where applicable
      const enrichedNotifications = await Promise.all(
        notifications.map(async (notification) => {
          let enriched = { ...notification };
          
          // Add sender details for connection/payment notifications
          if (notification.data?.fromUserId) {
            const senderDetails = await FirebaseService.getUserDetails(notification.data.fromUserId);
            enriched.sender = senderDetails;
          }
          
          // Add user details for other user notifications
          if (notification.data?.otherUserId) {
            const otherUserDetails = await FirebaseService.getUserDetails(notification.data.otherUserId);
            enriched.otherUser = otherUserDetails;
          }
          
          return enriched;
        })
      );

      return { success: true, notifications: enrichedNotifications };
    } catch (error) {
      console.error('Get user notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const result = await FirebaseService.updateNotification(notificationId, {
        read: true,
        readAt: new Date().toISOString()
      });
      
      // If notification doesn't exist, that's okay - it might have been deleted
      if (!result.success && result.error === 'Notification not found') {
        console.log('Notification already deleted, no need to mark as read:', notificationId);
        return { success: true }; // Treat as success since the goal is achieved
      }
      
      return result;
    } catch (error) {
      console.error('Mark as read error:', error);
      return { success: false, error: error.message };
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      await FirebaseService.markAllNotificationsAsRead(userId);
      return { success: true };
    } catch (error) {
      console.error('Mark all as read error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      await FirebaseService.deleteNotification(notificationId, userId);
      return { success: true };
    } catch (error) {
      console.error('Delete notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const count = await FirebaseService.getUnreadNotificationCount(userId);
      return { success: true, count };
    } catch (error) {
      console.error('Get unread count error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send payment reminder
  async sendPaymentReminder(requestId, userId) {
    try {
      const request = await FirebaseService.getPaymentRequest(requestId);
      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      const notification = {
        userId,
        type: 'payment_reminder',
        title: '⏰ Payment Reminder',
        message: `You have a payment request of ${request.currency} ${request.amount} pending`,
        data: {
          requestId,
          amount: request.amount,
          currency: request.currency,
          reason: request.reason,
          dueDate: request.dueDate
        },
        createdAt: new Date().toISOString(),
        read: false,
        requiresAction: true
      };

      return await this.createNotification(userId, notification);
    } catch (error) {
      console.error('Send payment reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send bill due reminder
  async sendBillDueReminder(userId, bill, daysUntilDue) {
    try {
      let priority = 'low';
      let title = '📅 Bill Due Soon';
      
      if (daysUntilDue <= 1) {
        priority = 'high';
        title = '🚨 Bill Due Today!';
      } else if (daysUntilDue <= 3) {
        priority = 'medium';
        title = '⏰ Bill Due Soon';
      }

      const notification = {
        userId,
        type: 'bill_due_reminder',
        title,
        message: `${bill.name} payment of ${bill.amount} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`,
        data: {
          billId: bill.id,
          billName: bill.name,
          amount: bill.amount,
          dueDate: bill.dueDate,
          daysUntilDue
        },
        createdAt: new Date().toISOString(),
        read: false,
        priority,
        requiresAction: true
      };

      return await this.createNotification(userId, notification);
    } catch (error) {
      console.error('Send bill due reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send low balance alert
  async sendLowBalanceAlert(userId, card, balance) {
    try {
      const notification = {
        userId,
        type: 'low_balance_alert',
        title: '💳 Low Balance Alert',
        message: `${card.name} balance is ${balance}. Consider adding funds.`,
        data: {
          cardId: card.id,
          cardName: card.name,
          balance,
          currency: card.currency || 'GBP'
        },
        createdAt: new Date().toISOString(),
        read: false,
        priority: 'medium'
      };

      return await this.createNotification(userId, notification);
    } catch (error) {
      console.error('Send low balance alert error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send spending limit alert
  async sendSpendingLimitAlert(userId, category, spent, limit, percentage) {
    try {
      let priority = 'medium';
      if (percentage >= 100) {
        priority = 'high';
      }

      const notification = {
        userId,
        type: 'spending_limit_alert',
        title: '📊 Spending Limit Alert',
        message: `You've spent ${percentage}% of your ${category} budget (${spent} of ${limit})`,
        data: {
          category,
          spent,
          limit,
          percentage
        },
        createdAt: new Date().toISOString(),
        read: false,
        priority
      };

      return await this.createNotification(userId, notification);
    } catch (error) {
      console.error('Send spending limit alert error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send split bill payment reminder
  async sendSplitBillReminder(userId, splitBill, amountOwed) {
    try {
      const notification = {
        userId,
        type: 'split_bill_reminder',
        title: '🧾 Split Bill Reminder',
        message: `You owe ${amountOwed} for "${splitBill.description}"`,
        data: {
          splitBillId: splitBill.id,
          description: splitBill.description,
          amountOwed,
          totalAmount: splitBill.totalAmount
        },
        createdAt: new Date().toISOString(),
        read: false,
        requiresAction: true
      };

      return await this.createNotification(userId, notification);
    } catch (error) {
      console.error('Send split bill reminder error:', error);
      return { success: false, error: error.message };
    }
  }

  // Batch create notifications for multiple users
  async batchCreateNotifications(notifications) {
    try {
      const results = await Promise.all(
        notifications.map(notification => 
          this.createNotification(notification.userId, notification.data)
        )
      );
      
      return { success: true, results };
    } catch (error) {
      console.error('Batch create notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification statistics
  async getNotificationStats(userId) {
    try {
      const notifications = await FirebaseService.getUserNotifications(userId, 1000);
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        requiresAction: notifications.filter(n => n.requiresAction).length,
        byType: {},
        byPriority: {
          high: notifications.filter(n => n.priority === 'high').length,
          medium: notifications.filter(n => n.priority === 'medium').length,
          low: notifications.filter(n => n.priority === 'low').length
        }
      };

      // Count by type
      notifications.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      });

      return { success: true, stats };
    } catch (error) {
      console.error('Get notification stats error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create notification preferences
  async createNotificationPreferences(userId, preferences) {
    try {
      const defaultPreferences = {
        paymentRequests: true,
        connectionRequests: true,
        smartTransfers: true,
        billReminders: true,
        lowBalanceAlerts: true,
        spendingAlerts: true,
        splitBillReminders: true,
        pushNotifications: true,
        emailNotifications: false,
        marketingEmails: false
      };

      const userPreferences = { ...defaultPreferences, ...preferences };
      
      return await FirebaseService.createNotificationPreferences(userId, userPreferences);
    } catch (error) {
      console.error('Create notification preferences error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId) {
    try {
      const preferences = await FirebaseService.getNotificationPreferences(userId);
      return { success: true, preferences };
    } catch (error) {
      console.error('Get notification preferences error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      return await FirebaseService.updateNotificationPreferences(userId, preferences);
    } catch (error) {
      console.error('Update notification preferences error:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user should receive notification based on preferences
  async shouldNotify(userId, notificationType) {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      
      if (!preferences.success) {
        return true; // Default to allowing if preferences not found
      }

      const preferenceMap = {
        'payment_request': 'paymentRequests',
        'payment_reminder': 'paymentRequests',
        'connection_request': 'connectionRequests',
        'smart_transfer_detected': 'smartTransfers',
        'bill_due_reminder': 'billReminders',
        'low_balance_alert': 'lowBalanceAlerts',
        'spending_limit_alert': 'spendingAlerts',
        'split_bill_request': 'splitBillReminders',
        'split_bill_reminder': 'splitBillReminders'
      };

      const preferenceKey = preferenceMap[notificationType];
      return preferenceKey ? preferences.preferences[preferenceKey] : true;
    } catch (error) {
      console.error('Check notification preference error:', error);
      return true; // Default to allowing
    }
  }

  // Create notification with preference check
  async createNotificationWithPreferenceCheck(userId, notificationData) {
    try {
      const shouldSend = await this.shouldNotify(userId, notificationData.type);
      
      if (!shouldSend) {
        return { success: true, skipped: true, reason: 'User preference disabled' };
      }

      return await this.createNotification(userId, notificationData);
    } catch (error) {
      console.error('Create notification with preference check error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationsService();
