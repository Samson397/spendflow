// Social Finance - Connections Service
import FirebaseService from './FirebaseService';

class ConnectionsService {
  // Send connection request
  async sendConnectionRequest(fromUserId, toEmail, connectionType = 'friend') {
    try {
      // Check if user exists with this email
      const users = await FirebaseService.searchUsersByEmail(toEmail);
      if (users.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const targetUser = users[0];
      
      // Check if connection already exists
      const existingConnection = await FirebaseService.checkExistingConnection(fromUserId, targetUser.id);
      if (existingConnection) {
        return { success: false, error: 'Connection already exists' };
      }

      // Create connection request
      const requestData = {
        fromUserId,
        toUserId: targetUser.id,
        toEmail,
        connectionType,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: `Would like to connect with you on SpendFlow`
      };

      const result = await FirebaseService.createConnectionRequest(requestData);
      
      if (result.success) {
        // Send notification to target user
        await this.sendConnectionNotification(targetUser.id, fromUserId, connectionType);
      }

      return result;
    } catch (error) {
      console.error('Send connection request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Accept connection request
  async acceptConnectionRequest(requestId, fromUserId, toUserId) {
    try {
      // Update request status
      await FirebaseService.updateConnectionRequest(requestId, {
        status: 'accepted',
        respondedAt: new Date().toISOString()
      });

      // Create mutual connection
      await FirebaseService.createConnection({
        userId1: fromUserId,
        userId2: toUserId,
        status: 'active',
        createdAt: new Date().toISOString()
      });

      // Notify the requester
      await this.sendConnectionAcceptedNotification(fromUserId, toUserId);

      return { success: true };
    } catch (error) {
      console.error('Accept connection request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Decline connection request
  async declineConnectionRequest(requestId, fromUserId) {
    try {
      await FirebaseService.updateConnectionRequest(requestId, {
        status: 'declined',
        respondedAt: new Date().toISOString()
      });

      // Notify the requester
      await this.sendConnectionDeclinedNotification(fromUserId);

      return { success: true };
    } catch (error) {
      console.error('Decline connection request error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's connections
  async getUserConnections(userId) {
    try {
      const connections = await FirebaseService.getUserConnections(userId);
      
      // Get user details for each connection
      const enrichedConnections = await Promise.all(
        connections.map(async (connection) => {
          const otherUserId = connection.userId1 === userId ? connection.userId2 : connection.userId1;
          const userDetails = await FirebaseService.getUserDetails(otherUserId);
          
          return {
            ...connection,
            user: userDetails,
            connectionType: connection.connectionType || 'friend'
          };
        })
      );

      return { success: true, connections: enrichedConnections };
    } catch (error) {
      console.error('Get user connections error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get pending connection requests
  async getPendingRequests(userId) {
    try {
      const requests = await FirebaseService.getPendingConnectionRequests(userId);
      
      // Get sender details for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const senderDetails = await FirebaseService.getUserDetails(request.fromUserId);
          
          return {
            ...request,
            sender: senderDetails
          };
        })
      );

      return { success: true, requests: enrichedRequests };
    } catch (error) {
      console.error('Get pending requests error:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove connection
  async removeConnection(userId1, userId2) {
    try {
      await FirebaseService.removeConnection(userId1, userId2);
      return { success: true };
    } catch (error) {
      console.error('Remove connection error:', error);
      return { success: false, error: error.message };
    }
  }

  // Block user
  async blockUser(userId, blockedUserId) {
    try {
      await FirebaseService.blockUser(userId, blockedUserId);
      return { success: true };
    } catch (error) {
      console.error('Block user error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update connection settings
  async updateConnectionSettings(userId, connectionUserId, settings) {
    try {
      await FirebaseService.updateConnectionSettings(userId, connectionUserId, settings);
      return { success: true };
    } catch (error) {
      console.error('Update connection settings error:', error);
      return { success: false, error: error.message };
    }
  }

  // Send connection notification
  async sendConnectionNotification(toUserId, fromUserId, connectionType) {
    const notification = {
      userId: toUserId,
      type: 'connection_request',
      title: '🤝 Connection Request',
      message: `Someone wants to connect with you`,
      data: {
        fromUserId,
        connectionType
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send connection accepted notification
  async sendConnectionAcceptedNotification(toUserId, fromUserId) {
    const notification = {
      userId: toUserId,
      type: 'connection_accepted',
      title: '✅ Connection Accepted',
      message: `Your connection request was accepted`,
      data: {
        fromUserId
      },
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Send connection declined notification
  async sendConnectionDeclinedNotification(toUserId) {
    const notification = {
      userId: toUserId,
      type: 'connection_declined',
      title: '❌ Connection Declined',
      message: `Your connection request was declined`,
      createdAt: new Date().toISOString(),
      read: false
    };

    await FirebaseService.createNotification(notification);
  }

  // Search users by email or username
  async searchUsers(query) {
    try {
      const users = await FirebaseService.searchUsers(query);
      return { success: true, users };
    } catch (error) {
      console.error('Search users error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get connection statistics
  async getConnectionStats(userId) {
    try {
      const connections = await FirebaseService.getUserConnections(userId);
      const pending = await FirebaseService.getPendingConnectionRequests(userId);
      
      const stats = {
        totalConnections: connections.length,
        familyConnections: connections.filter(c => c.connectionType === 'family').length,
        friendConnections: connections.filter(c => c.connectionType === 'friend').length,
        colleagueConnections: connections.filter(c => c.connectionType === 'colleague').length,
        pendingRequests: pending.length
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Get connection stats error:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ConnectionsService();
