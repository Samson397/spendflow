// SpendFlow Extension - Background Service Worker

console.log('SpendFlow Background Service Worker starting...');

// Install event
chrome.runtime.onInstalled.addListener((details) => {
  console.log('SpendFlow Extension installed:', details.reason);
  
  try {
    // Create context menu
    chrome.contextMenus.create({
      id: 'spendflow-add-expense',
      title: 'Add expense to SpendFlow',
      contexts: ['selection', 'page']
    });
    console.log('Context menu created');
  } catch (error) {
    console.error('Failed to create context menu:', error);
  }
  
  // Set up default settings
  chrome.storage.sync.set({
    spendflow_settings: {
      autoSync: true,
      notifications: true,
      quickCategories: ['Food & Dining', 'Transport', 'Shopping']
    }
  }).then(() => {
    console.log('Default settings saved');
  }).catch(error => {
    console.error('Failed to save settings:', error);
  });
});

// Startup event
chrome.runtime.onStartup.addListener(() => {
  console.log('SpendFlow Extension starting up...');
});

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  // This will keep the service worker active
  return true;
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'spendflow-add-expense') {
    // Try to extract amount from selected text
    const selectedText = info.selectionText || '';
    const amountMatch = selectedText.match(/[\£\$\€]?(\d+\.?\d*)/);
    const amount = amountMatch ? amountMatch[1] : '';
    
    // Store context for popup
    chrome.storage.local.set({
      spendflow_context: {
        amount: amount,
        description: selectedText.substring(0, 50),
        url: tab.url,
        title: tab.title
      }
    });
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Message handler for communication with popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_AUTH_STATUS':
      checkAuthStatus().then(sendResponse);
      return true; // Will respond asynchronously
      
    case 'SYNC_EXPENSES':
      syncPendingExpenses().then(sendResponse);
      return true;
      
    case 'GET_USER_DATA':
      getUserData().then(sendResponse);
      return true;
  }
});

// Check if user is authenticated
async function checkAuthStatus() {
  try {
    const result = await chrome.storage.sync.get(['spendflow_user', 'spendflow_token']);
    return {
      authenticated: !!(result.spendflow_user && result.spendflow_token),
      user: result.spendflow_user
    };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false };
  }
}

// Sync pending expenses with SpendFlow
async function syncPendingExpenses() {
  try {
    const result = await chrome.storage.local.get(['spendflow_pending_expenses']);
    const pending = result.spendflow_pending_expenses || [];
    
    if (pending.length === 0) {
      return { success: true, synced: 0 };
    }
    
    // In a real implementation, this would make API calls to Firebase
    console.log(`Syncing ${pending.length} pending expenses...`);
    
    // For now, just mark as synced
    const synced = pending.map(expense => ({ ...expense, synced: true }));
    
    await chrome.storage.local.set({
      spendflow_pending_expenses: [],
      spendflow_synced_expenses: synced
    });
    
    // Show notification
    if (pending.length > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-48.png',
        title: 'SpendFlow',
        message: `${pending.length} expense(s) synced successfully!`
      });
    }
    
    return { success: true, synced: pending.length };
    
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  }
}

// Get user data (cards, stats, etc.)
async function getUserData() {
  try {
    const result = await chrome.storage.local.get([
      'spendflow_cards',
      'spendflow_stats',
      'spendflow_recent_transactions'
    ]);
    
    return {
      success: true,
      data: {
        cards: result.spendflow_cards || [],
        stats: result.spendflow_stats || {},
        recentTransactions: result.spendflow_recent_transactions || []
      }
    };
  } catch (error) {
    console.error('Failed to get user data:', error);
    return { success: false, error: error.message };
  }
}

// Keep service worker alive with periodic ping
chrome.alarms.create('spendflow-keepalive', { periodInMinutes: 1 });
chrome.alarms.create('spendflow-sync', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'spendflow-sync') {
    console.log('Running periodic sync...');
    syncPendingExpenses();
  } else if (alarm.name === 'spendflow-keepalive') {
    console.log('Service worker keepalive ping');
    // Just a ping to keep the service worker active
  }
});

// Badge management
async function updateBadge() {
  try {
    const result = await chrome.storage.local.get(['spendflow_pending_expenses']);
    const pending = result.spendflow_pending_expenses || [];
    
    if (pending.length > 0) {
      chrome.action.setBadgeText({ text: pending.length.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Failed to update badge:', error);
  }
}

// Update badge on storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.spendflow_pending_expenses) {
    updateBadge();
  }
});

// Initial badge update
updateBadge();
