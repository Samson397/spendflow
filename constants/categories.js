// Centralized categories for the entire app
export const CATEGORIES = [
  { emoji: '🛒', name: 'Groceries' },
  { emoji: '☕', name: 'Food & Drink' },
  { emoji: '🚇', name: 'Transport' },
  { emoji: '🛍️', name: 'Shopping' },
  { emoji: '🎬', name: 'Entertainment' },
  { emoji: '📄', name: 'Bills' },
  { emoji: '🏥', name: 'Health' },
  { emoji: '🏠', name: 'Home' },
  { emoji: '💳', name: 'Other' },
  { emoji: '💰', name: 'Income' },
  { emoji: '↩️', name: 'Refund' },
  { emoji: '🔄', name: 'Transfer' }
];

// For screens that need just the names
export const CATEGORY_NAMES = CATEGORIES.map(cat => cat.name);

// For screens that need emoji + name format
export const CATEGORY_WITH_EMOJI = CATEGORIES.map(cat => `${cat.emoji} ${cat.name}`);

// Category mapping for legacy formats
export const CATEGORY_MAP = {
  'Groceries': ['🛒 Groceries', 'Groceries'],
  'Food & Drink': ['☕ Food & Drink', 'Food & Drink', 'Food & Dining'],
  'Transport': ['🚇 Transport', 'Transport'],
  'Shopping': ['🛍️ Shopping', 'Shopping'],
  'Entertainment': ['🎬 Entertainment', 'Entertainment'],
  'Bills': ['📄 Bills', 'Bills', 'Bills & Utilities'],
  'Health': ['🏥 Health', 'Health', 'Healthcare'],
  'Home': ['🏠 Home', 'Home'],
  'Other': ['💳 Other', 'Other'],
  'Income': ['💰 Income', 'Income'],
  'Refund': ['↩️ Refund', 'Refund'],
  'Transfer': ['🔄 Transfer', 'Transfer']
};

// Colors for categories (for screens that need them)
export const CATEGORY_COLORS = {
  'Groceries': '#10b981',
  'Food & Drink': '#ef4444',
  'Transport': '#3b82f6',
  'Shopping': '#f59e0b',
  'Entertainment': '#8b5cf6',
  'Bills': '#06b6d4',
  'Health': '#ec4899',
  'Home': '#f97316',
  'Other': '#6b7280',
  'Income': '#22c55e',
  'Refund': '#f59e0b',
  'Transfer': '#3b82f6'
};
