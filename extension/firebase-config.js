// Firebase configuration for SpendFlow Extension
// This should match your main app's Firebase config

const firebaseConfig = {
  // These should match your actual Firebase project config
  // You can get these from your Firebase console
  apiKey: "your-api-key-here",
  authDomain: "spedflowapp.firebaseapp.com", 
  projectId: "spedflowapp",
  storageBucket: "spedflowapp.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Firebase API helper functions
class FirebaseAPI {
  constructor() {
    this.baseUrl = 'https://firestore.googleapis.com/v1';
    this.projectId = firebaseConfig.projectId;
  }

  // Get user's cards
  async getUserCards(userId, token) {
    try {
      const url = `${this.baseUrl}/projects/${this.projectId}/databases/(default)/documents/users/${userId}/cards`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return this.parseFirestoreDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
      return [];
    }
  }

  // Get user's recent transactions
  async getUserTransactions(userId, token, limit = 10) {
    try {
      const url = `${this.baseUrl}/projects/${this.projectId}/databases/(default)/documents/users/${userId}/transactions`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const transactions = this.parseFirestoreDocuments(data.documents || []);
      
      // Sort by date and limit
      return transactions
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }

  // Add a new transaction
  async addTransaction(userId, token, transactionData) {
    try {
      const url = `${this.baseUrl}/projects/${this.projectId}/databases/(default)/documents/users/${userId}/transactions`;
      
      const firestoreData = this.convertToFirestoreFormat(transactionData);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: firestoreData
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return { success: true, id: result.name.split('/').pop() };
    } catch (error) {
      console.error('Failed to add transaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper: Parse Firestore documents to regular objects
  parseFirestoreDocuments(documents) {
    return documents.map(doc => {
      const data = { id: doc.name.split('/').pop() };
      
      for (const [key, value] of Object.entries(doc.fields || {})) {
        if (value.stringValue !== undefined) {
          data[key] = value.stringValue;
        } else if (value.doubleValue !== undefined) {
          data[key] = parseFloat(value.doubleValue);
        } else if (value.integerValue !== undefined) {
          data[key] = parseInt(value.integerValue);
        } else if (value.booleanValue !== undefined) {
          data[key] = value.booleanValue;
        } else if (value.timestampValue !== undefined) {
          data[key] = value.timestampValue;
        }
      }
      
      return data;
    });
  }

  // Helper: Convert regular object to Firestore format
  convertToFirestoreFormat(obj) {
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        result[key] = { doubleValue: value };
      } else if (typeof value === 'boolean') {
        result[key] = { booleanValue: value };
      } else if (value instanceof Date) {
        result[key] = { timestampValue: value.toISOString() };
      }
    }
    
    return result;
  }
}

// Export for use in popup.js
window.FirebaseAPI = FirebaseAPI;
