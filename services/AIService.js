import FirebaseService from './FirebaseService';

class AIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseURL = 'https://api.deepseek.com/v1';
  }

  // Load complete user financial data for AI analysis
  async loadUserFinancialData(uid) {
    try {
      // Load all user data in parallel
      const [
        transactions,
        directDebits,
        cards,
        savings,
        goals,
        budgets
      ] = await Promise.all([
        FirebaseService.getUserTransactions(uid),
        FirebaseService.getUserDirectDebits(uid),
        FirebaseService.getUserCards(uid),
        FirebaseService.getUserSavingsAccounts(uid),
        FirebaseService.getUserGoals(uid),
        FirebaseService.getUserBudgets(uid)
      ]);

      // Process transactions for AI
      const processedTransactions = (transactions.success ? transactions.data : [])
        .slice(0, 100) // Last 100 transactions
        .map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          category: t.category,
          description: t.description || t.category,
          date: t.date || t.createdAt,
          cardName: t.cardName || 'Unknown',
          time: t.time
        }));

      // Process direct debits for AI
      const processedDirectDebits = (directDebits.success ? directDebits.data : [])
        .filter(dd => dd.status === 'Active')
        .map(dd => ({
          name: dd.name || dd.merchant || 'Unknown',
          amount: dd.amount,
          frequency: dd.frequency || 'Monthly',
          nextDate: dd.nextDate,
          category: dd.category || 'Subscription'
        }));

      // Process cards for AI
      const processedCards = (cards.success ? cards.data : [])
        .map(c => ({
          name: c.bank + ' ****' + c.lastFour,
          type: c.type,
          balance: c.balance || 0
        }));

      // Process goals for AI
      const processedGoals = (goals.success ? goals.data : [])
        .map(g => ({
          name: g.name,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount || 0,
          progress: ((g.currentAmount || 0) / g.targetAmount) * 100,
          status: g.status
        }));

      // Process budgets for AI
      const processedBudgets = (budgets.success ? budgets.data : [])
        .map(b => ({
          category: b.category,
          amount: b.amount,
          spent: b.spent || 0,
          remaining: b.amount - (b.spent || 0)
        }));

      return {
        success: true,
        data: {
          transactions: processedTransactions,
          directDebits: processedDirectDebits,
          cards: processedCards,
          savings: savings.success ? savings.data : [],
          goals: processedGoals,
          budgets: processedBudgets
        }
      };
    } catch (error) {
      console.error('Error loading user financial data:', error);
      return {
        success: false,
        error: error.message,
        data: { transactions: [], directDebits: [], cards: [], savings: [], goals: [], budgets: [] }
      };
    }
  }

  // Make API request to DeepSeek
  async makeRequest(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('AI Service error:', error);
      throw error;
    }
  }

  // Analyze spending patterns
  async analyzeSpending(transactions, timeframe = 'month') {
    const prompt = `
    Analyze the following financial transactions for spending patterns and insights:
    
    Transactions: ${JSON.stringify(transactions)}
    Timeframe: ${timeframe}
    
    Please provide:
    1. Top spending categories
    2. Unusual spending patterns
    3. Budget recommendations
    4. Money-saving opportunities
    
    Format the response as JSON with clear, actionable insights.
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a financial advisor AI that provides clear, actionable insights about spending patterns. Always respond with practical advice in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return {
        success: true,
        insights: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate budget recommendations
  async generateBudgetRecommendations(income, expenses, goals) {
    const prompt = `
    Based on the following financial information, provide budget recommendations:
    
    Monthly Income: ${income}
    Current Expenses: ${JSON.stringify(expenses)}
    Financial Goals: ${JSON.stringify(goals)}
    
    Please provide:
    1. Recommended budget allocation by category
    2. Areas where spending can be reduced
    3. Savings recommendations
    4. Timeline to reach financial goals
    
    Format as JSON with specific amounts and percentages.
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a financial planning expert. Provide practical budget recommendations with specific amounts and realistic timelines.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1200
      });

      return {
        success: true,
        recommendations: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Answer natural language financial queries with user learning
  async answerFinancialQuery(query, userData, userPreferences = {}, conversationHistory = []) {
    // Load complete financial data for this user
    const fullUserData = await this.loadUserFinancialData(userData.uid);
    const financialData = fullUserData.success ? fullUserData.data : { transactions: [], directDebits: [], cards: [], savings: [], goals: [], budgets: [] };

    const q = query.toLowerCase();

    // Deterministic answers for key data questions so we never hallucinate about what the user has
    const hasDirectDebits = (financialData.directDebits || []).length > 0;
    const hasTransactions = (financialData.transactions || []).length > 0;
    const hasCards = (financialData.cards || []).length > 0;
    const hasGoals = (financialData.goals || []).length > 0;
    const hasSavings = (financialData.savings || []).length > 0;

    // Direct debits / subscriptions / recurring payments
    if (
      q.includes('direct debit') ||
      q.includes('direct-debit') ||
      q.includes('subscription') ||
      q.includes('subscriptions') ||
      q.includes('recurring payment') ||
      q.includes('recurring payments') ||
      q.includes('bills') ||
      q.includes('regular payments')
    ) {
      if (!hasDirectDebits) {
        return {
          success: true,
          answer: "Right now I can't see any active direct debits or subscriptions in your SpendFlow account. If you think you already added some, double‑check that they are saved as direct debits for this profile."
        };
      }

      const lines = financialData.directDebits.map((dd) => {
        const amount = typeof dd.amount === 'number' ? `£${dd.amount.toFixed(2)}` : dd.amount || 'Amount not set';
        const freq = dd.frequency || 'Monthly';
        let next = 'next date not set';
        if (dd.nextDate) {
          try {
            const d = new Date(dd.nextDate);
            next = d.toLocaleDateString('en-GB');
          } catch (e) {
            next = String(dd.nextDate);
          }
        }
        return `${dd.name || dd.merchant || 'Unknown'} – ${amount}, ${freq}, next on ${next}`;
      });

      return {
        success: true,
        answer: `Here are the direct debits and recurring payments I can see in your SpendFlow data right now:\n\n${lines.join('\n')}`
      };
    }

    // Cards / accounts / balances
    if (
      q.includes('card') ||
      q.includes('cards') ||
      q.includes('account') ||
      q.includes('accounts') ||
      q.includes('balance') ||
      q.includes('balances')
    ) {
      if (!hasCards) {
        return {
          success: true,
          answer: "I can't see any cards or accounts saved in your SpendFlow profile yet. Once you add your debit or credit cards, I'll be able to list them here with their balances."
        };
      }

      const cardLines = financialData.cards.map((c) => {
        const bal = typeof c.balance === 'number' ? c.balance : parseFloat(c.balance || '0') || 0;
        return `${c.name} – £${bal.toFixed(2)} (${c.type || 'card'})`;
      });

      const totalBalanceLocal = financialData.cards.reduce((sum, c) => {
        const bal = typeof c.balance === 'number' ? c.balance : parseFloat(c.balance || '0') || 0;
        return sum + bal;
      }, 0);

      return {
        success: true,
        answer: `Based on your SpendFlow data, your total card balance is £${totalBalanceLocal.toFixed(2)} across ${financialData.cards.length} cards:\n\n${cardLines.join('\n')}`
      };
    }

    // Transactions / spending / income / expenses
    if (
      q.includes('transaction') ||
      q.includes('transactions') ||
      q.includes('spending') ||
      q.includes('spent') ||
      q.includes('expense') ||
      q.includes('expenses') ||
      q.includes('income') ||
      q.includes('earnings') ||
      q.includes('payments') ||
      q.includes('purchases')
    ) {
      if (!hasTransactions) {
        return {
          success: true,
          answer: "I don't see any transactions in your SpendFlow account yet. Once you start adding or importing transactions, I can break down your spending and income for you."
        };
      }

      const nowLocal = new Date();
      const startOfMonthLocal = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), 1);
      const startOfWeekLocal = new Date(nowLocal.getTime() - 7 * 24 * 60 * 60 * 1000);

      let monthlyExpenses = 0;
      let monthlyIncome = 0;
      let weeklyExpenses = 0;

      const recentLines = financialData.transactions.slice(0, 10).map((t) => {
        const rawAmount = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount || '0')) || 0;
        const dateObj = new Date(t.date || t.createdAt || nowLocal);
        const isThisMonth = dateObj >= startOfMonthLocal;
        const isThisWeek = dateObj >= startOfWeekLocal;

        if (t.type === 'expense') {
          if (isThisMonth) monthlyExpenses += Math.abs(rawAmount);
          if (isThisWeek) weeklyExpenses += Math.abs(rawAmount);
        } else if (t.type === 'income') {
          if (isThisMonth) monthlyIncome += Math.abs(rawAmount);
        }

        const formattedAmount = `£${Math.abs(rawAmount).toFixed(2)}`;
        const typeLabel = t.type === 'income' ? 'Income' : 'Expense';
        return `${dateObj.toLocaleDateString('en-GB')} – ${t.description || t.category || 'Transaction'}: ${formattedAmount} (${typeLabel}${t.category ? `, ${t.category}` : ''})`;
      });

      const summaryParts = [];
      if (monthlyExpenses > 0) summaryParts.push(`you've spent £${monthlyExpenses.toFixed(2)} this month`);
      if (weeklyExpenses > 0) summaryParts.push(`including £${weeklyExpenses.toFixed(2)} in the last 7 days`);
      if (monthlyIncome > 0) summaryParts.push(`and received £${monthlyIncome.toFixed(2)} in income this month`);

      const summaryText = summaryParts.length > 0
        ? `From your SpendFlow data, ${summaryParts.join(', ')}.`
        : "I couldn't calculate a clear breakdown of income vs expenses for this period, but here are your most recent transactions.";

      return {
        success: true,
        answer: `${summaryText}\n\nHere are your latest transactions:\n\n${recentLines.join('\n')}`
      };
    }

    // Goals
    if (q.includes('goal') || q.includes('goals') || q.includes('saving goal') || q.includes('savings goal')) {
      if (!hasGoals) {
        return {
          success: true,
          answer: "I can't see any savings goals set up in your SpendFlow account yet. You can create goals in the Goals screen, and then I'll be able to track your progress here."
        };
      }

      const goalLines = financialData.goals.map((g) => {
        const current = typeof g.currentAmount === 'number' ? g.currentAmount : parseFloat(g.currentAmount || '0') || 0;
        const target = typeof g.targetAmount === 'number' ? g.targetAmount : parseFloat(g.targetAmount || '0') || 0;
        const progress = target > 0 ? (current / target) * 100 : 0;
        return `${g.name}: £${current.toFixed(2)} / £${target.toFixed(2)} (${progress.toFixed(1)}%)`;
      });

      return {
        success: true,
        answer: `Here are the goals I can see in your SpendFlow data:\n\n${goalLines.join('\n')}`
      };
    }

    // Savings accounts overview
    if (q.includes('saving') || q.includes('savings') || q.includes('vault') || q.includes('pots')) {
      if (!hasSavings) {
        return {
          success: true,
          answer: "I don't see any savings accounts set up in your SpendFlow data yet. Once you add them in the Savings section, I can show your total savings and each pot here."
        };
      }

      const savingsLines = financialData.savings.map((s) => {
        const bal = parseFloat(String(s.balance || '0').replace(/[^0-9.-]/g, '')) || 0;
        return `${s.name || s.accountName || 'Savings Account'} – £${bal.toFixed(2)}`;
      });

      const totalSavingsLocal = financialData.savings.reduce((sum, s) => {
        const bal = parseFloat(String(s.balance || '0').replace(/[^0-9.-]/g, '')) || 0;
        return sum + bal;
      }, 0);

      return {
        success: true,
        answer: `Across your savings accounts in SpendFlow you have £${totalSavingsLocal.toFixed(2)} saved:\n\n${savingsLines.join('\n')}`
      };
    }

    // High-level "everything" / overview questions
    if (
      q.includes('everything') ||
      q.includes('all my stuff') ||
      q.includes('all my data') ||
      q.includes('summary') ||
      q.includes('overview') ||
      q.includes('what do i have')
    ) {
      const userNameLocal = userData.userName?.split(' ')[0] || 'you';

      const cardCount = financialData.cards.length;
      const debitCount = financialData.directDebits.length;
      const txCount = financialData.transactions.length;
      const goalCount = financialData.goals.length;
      const savingsCount = financialData.savings.length;

      const totalBalanceLocal = financialData.cards.reduce((sum, c) => {
        const bal = typeof c.balance === 'number' ? c.balance : parseFloat(c.balance || '0') || 0;
        return sum + bal;
      }, 0);

      const totalSavingsLocal = financialData.savings.reduce((sum, s) => {
        const bal = parseFloat(String(s.balance || '0').replace(/[^0-9.-]/g, '')) || 0;
        return sum + bal;
      }, 0);

      const parts = [];
      parts.push(`• ${cardCount} card${cardCount === 1 ? '' : 's'} with a combined balance of £${totalBalanceLocal.toFixed(2)}`);
      parts.push(`• ${debitCount} direct debit${debitCount === 1 ? '' : 's'} / recurring payment${debitCount === 1 ? '' : 's'}`);
      parts.push(`• ${txCount} recorded transaction${txCount === 1 ? '' : 's'}`);
      parts.push(`• ${savingsCount} savings account${savingsCount === 1 ? '' : 's'} totalling £${totalSavingsLocal.toFixed(2)}`);
      parts.push(`• ${goalCount} active goal${goalCount === 1 ? '' : 's'}`);

      return {
        success: true,
        answer: `Here's what I know about your SpendFlow setup, based entirely on your in‑app data, ${userNameLocal}:\n\n${parts.join('\n')}\n\nIf you want, ask me specifically about your direct debits, cards, transactions, goals, or savings and I'll break them down one by one.`
      };
    }

    // Only use quick responses for very basic greetings, not financial questions
    const isBasicGreeting = query.toLowerCase().match(/^(hi|hello|hey|hola|bonjour|hallo|ciao)!?$/);
    if (isBasicGreeting) {
      const quickResponse = this.getQuickResponse(query, { ...userData, ...financialData });
      if (quickResponse) {
        return { success: true, answer: quickResponse };
      }
    }

    // Build a concise summary for faster responses
    const totalBalance = financialData.cards.reduce((sum, c) => sum + (c.balance || 0), 0);
    const totalSavings = financialData.savings.reduce((sum, s) => {
      const bal = parseFloat(String(s.balance || '0').replace(/[^0-9.-]/g, '')) || 0;
      return sum + bal;
    }, 0);

    // Calculate spending by time periods
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const monthlySpending = financialData.transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && date >= startOfMonth;
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

    const weeklySpending = financialData.transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && date >= startOfWeek;
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

    const budgetSummary = financialData.budgets.map(b => `${b.category}: £${b.amount} (spent: £${b.spent.toFixed(2)})`).join(', ');
    const goalsSummary = financialData.goals.map(g => `${g.name}: £${g.currentAmount || 0}/£${g.targetAmount} (${g.progress.toFixed(1)}%)`).join(', ');
    const directDebitCount = financialData.directDebits.length;

    // Build user learning context
    const learningContext = Object.keys(userPreferences).length > 0 ? `
USER PREFERENCES & LEARNING:
- Communication Style: ${userPreferences.communicationStyle || 'Not set'}
- Preferred Topics: ${userPreferences.preferredTopics || 'General financial advice'}
- Risk Tolerance: ${userPreferences.riskTolerance || 'Not assessed'}
- Financial Goals Priority: ${userPreferences.goalsPriority || 'Not set'}
- Spending Habits: ${userPreferences.spendingHabits || 'Learning...'}
- Previous Concerns: ${userPreferences.commonConcerns || 'None noted'}
` : '';

    // Include recent conversation context (last 6 messages)
    const recentContext = conversationHistory.slice(-6).map(msg => 
      `${msg.type === 'user' ? 'User' : 'AI'}: ${msg.text}`
    ).join('\n');

    // Get spending by category for more detailed insights
    const categorySpending = {};
    financialData.transactions.forEach(t => {
      if (t.type === 'expense') {
        const category = t.category || 'Other';
        categorySpending[category] = (categorySpending[category] || 0) + Math.abs(parseFloat(t.amount) || 0);
      }
    });

    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cat, amount]) => `${cat}: £${amount.toFixed(2)}`)
      .join(', ');

    // Add conversation context to make responses more varied
    const conversationLength = conversationHistory.length;
    const isFollowUp = conversationLength > 2;
    const lastAIResponse = conversationHistory.slice(-2, -1)[0]?.text || '';

    const prompt = `
User: ${userData.userName || 'User'}
Question: "${query}"
Conversation Length: ${conversationLength} messages
Is Follow-up Question: ${isFollowUp}

FINANCIAL SUMMARY:
- Total Balance: £${totalBalance.toFixed(2)} across ${financialData.cards.length} accounts
- Total Savings: £${totalSavings.toFixed(2)} in ${financialData.savings.length} savings accounts
- This Month's Spending: £${monthlySpending.toFixed(2)} in ${financialData.transactions.filter(t => t.type === 'expense').length} transactions
- This Week's Spending: £${weeklySpending.toFixed(2)}
- Top Spending Categories: ${topCategories || 'No spending data'}
- Active Direct Debits: ${directDebitCount}
- Budgets: ${budgetSummary || 'None set'}
- Goals: ${goalsSummary || 'None set'}

${learningContext}

${recentContext ? `RECENT CONVERSATION:\n${recentContext}\n` : ''}

IMPORTANT INSTRUCTIONS:
- Be conversational and vary your responses - don't repeat the same phrases
- If this is a follow-up question, acknowledge the previous conversation
- Provide specific insights based on their actual financial data
- Ask follow-up questions to be more helpful
- Be curious about their financial goals and habits
- Suggest actionable next steps

When asked about direct debits, subscriptions, bills, or recurring payments:
LIST EACH ONE with name, amount, frequency, and next payment date.

When asked about transactions, spending, purchases, or payments:
LIST RECENT ONES with date, merchant/description, amount, and category.
CALCULATE TOTALS for time periods (week, month, etc.).

When asked about balances:
LIST EACH CARD with name, type, and current balance.

When asked about goals:
LIST EACH GOAL with name, progress percentage, and target amount.

Recent Transactions (last 20):
${financialData.transactions.slice(0, 20).map(t => `${t.description}: £${Math.abs(t.amount || 0).toFixed(2)} (${new Date(t.date).toLocaleDateString()})`).join('\n')}

Active Direct Debits:
${financialData.directDebits.map(dd => `${dd.name}: £${dd.amount} (${dd.frequency}) - Next: ${dd.nextDate ? new Date(dd.nextDate).toLocaleDateString() : 'Unknown'}`).join('\n') || 'None'}

Account Balances:
${financialData.cards.map(c => `${c.name}: £${c.balance.toFixed(2)} (${c.type})`).join('\n') || 'No cards'}

Goals Progress:
${financialData.goals.map(g => `${g.name}: £${(g.currentAmount || 0).toFixed(2)}/£${g.targetAmount.toFixed(2)} (${g.progress.toFixed(1)}%)`).join('\n') || 'No goals set'}
`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are ${userData.userName || 'the user'}'s personal financial assistant in the SpendFlow app. You have access to their real financial data. 

CRITICAL CONVERSATION RULES:
- NEVER give the exact same response twice - always vary your language and approach
- Be genuinely conversational and engaging, not robotic
- Reference previous parts of the conversation naturally
- Ask thoughtful follow-up questions to keep the conversation going
- Show genuine interest in their financial journey
- Vary your greetings, phrases, and sentence structures
- If they ask the same question again, give a fresh perspective or additional insights

RESPONSE GUIDELINES:
- Always answer the user's question, even if data is limited
- Be friendly and use their first name naturally (not every sentence)
- Give specific advice based on their actual numbers and patterns
- Provide actionable insights, not just data summaries
- Keep responses conversational (2-3 paragraphs max)
- Use emojis sparingly and naturally
- For general questions, provide helpful financial advice with personal context
- For app-specific questions, guide them through SpendFlow features
- Always try to be helpful and add value to the conversation

MANDATORY LISTING RULES:
When the user asks about "direct debits", "subscriptions", "bills", or "recurring payments":
- ALWAYS list each one individually with name, amount, frequency, and next payment date
- Example: "Netflix - £15.99 monthly, next on Dec 3"

When the user asks about "transactions", "spending", "purchases", or "payments":
- ALWAYS list recent ones with date, merchant/description, amount, and category
- CALCULATE and provide totals for time periods (week, month, etc.)
- Example: "Tesco - £12.50 on Nov 25 (Groceries)"

When the user asks about "balances" or "accounts":
- ALWAYS list each card/account with name, type, and current balance
- Example: "Barclays ****1234 - £1,250.50 (debit card)"

When the user asks about "goals" or "savings goals":
- ALWAYS list each goal with name, current progress, and target amount
- Example: "Holiday Fund - £750/£2,000 (37.5%)"

LANGUAGE SUPPORT:
- Detect the language of the user's question automatically
- Respond in the same language the user is using
- Support English, Spanish (Español), French (Français), German (Deutsch), Italian (Italiano), and Portuguese (Português)
- If you detect Spanish, respond in Spanish
- If you detect French, respond in French
- If you detect German, respond in German
- If you detect Italian, respond in Italian
- If you detect Portuguese, respond in Portuguese
- Default to English if language is unclear
- Use natural, native-level language appropriate for financial discussions

CONVERSATION PERSONALITY:
- Be curious about their financial goals and motivations
- Celebrate their financial wins and progress
- Offer gentle guidance for areas of improvement
- Ask about their financial concerns and priorities
- Suggest specific next steps they can take
- Be encouraging and supportive, not judgmental`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.9,
        max_tokens: 1200
      });

      return {
        success: true,
        answer: response.choices[0].message.content
      };
    } catch (error) {
      console.error('AI API Error:', error);
      
      // Fallback response based on question type
      const fallbackResponse = this.getFallbackResponse(query, userData);
      return {
        success: true,
        answer: fallbackResponse
      };
    }
  }

  // Detect language from query
  detectLanguage(query) {
    const q = query.toLowerCase();
    
    // Spanish
    if (q.match(/\b(hola|cuánto|gasté|dinero|saldo|ayuda|presupuesto|ahorros)\b/)) {
      return 'es';
    }
    
    // French
    if (q.match(/\b(bonjour|salut|combien|dépensé|argent|solde|aide|budget|épargne)\b/)) {
      return 'fr';
    }
    
    // German
    if (q.match(/\b(hallo|wieviel|ausgegeben|geld|saldo|hilfe|budget|sparen)\b/)) {
      return 'de';
    }
    
    // Italian
    if (q.match(/\b(ciao|quanto|speso|soldi|saldo|aiuto|budget|risparmi)\b/)) {
      return 'it';
    }
    
    // Portuguese
    if (q.match(/\b(olá|quanto|gastei|dinheiro|saldo|ajuda|orçamento|poupança)\b/)) {
      return 'pt';
    }
    
    // Default to English
    return 'en';
  }

  // Quick responses for common questions with multi-language support
  getQuickResponse(query, userData) {
    const q = query.toLowerCase();
    const userName = userData.userName?.split(' ')[0] || 'there';
    const language = this.detectLanguage(query);
    
    // Calculate basic stats
    const totalBalance = (userData.cards || []).reduce((sum, c) => {
      return sum + (parseFloat(c.balance) || 0);
    }, 0);
    
    const monthlySpending = (userData.transactions || [])
      .filter(t => {
        const d = new Date(t.createdAt || t.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense';
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

    // Multi-language responses
    const responses = {
      en: {
        balance: `Hi ${userName}! 💰 Your current total balance across all accounts is £${totalBalance.toFixed(2)}. This includes ${userData.cards?.length || 0} cards and ${userData.savings?.length || 0} savings accounts.`,
        spending: `${userName}, you've spent £${monthlySpending.toFixed(2)} this month across ${(userData.transactions || []).filter(t => t.type === 'expense').length} transactions. Would you like me to break this down by category?`,
        greeting: `Hello ${userName}! 👋 I'm here to help with your finances. I can see your accounts, transactions, and goals. What would you like to know about your money today?`,
        help: `I can help you with lots of things, ${userName}! 🤖 Ask me about your spending, budgets, savings goals, account balances, or get financial advice. Try asking "How much did I spend this month?" or "What are my biggest expenses?"`
      },
      es: {
        balance: `¡Hola ${userName}! 💰 Tu saldo total en todas las cuentas es £${totalBalance.toFixed(2)}. Esto incluye ${userData.cards?.length || 0} tarjetas y ${userData.savings?.length || 0} cuentas de ahorro.`,
        spending: `${userName}, has gastado £${monthlySpending.toFixed(2)} este mes en ${(userData.transactions || []).filter(t => t.type === 'expense').length} transacciones. ¿Te gustaría que lo desglose por categoría?`,
        greeting: `¡Hola ${userName}! 👋 Estoy aquí para ayudarte con tus finanzas. Puedo ver tus cuentas, transacciones y objetivos. ¿Qué te gustaría saber sobre tu dinero hoy?`,
        help: `¡Puedo ayudarte con muchas cosas, ${userName}! 🤖 Pregúntame sobre tus gastos, presupuestos, objetivos de ahorro, saldos de cuentas, o consejos financieros.`
      },
      fr: {
        balance: `Salut ${userName}! 💰 Votre solde total sur tous les comptes est de £${totalBalance.toFixed(2)}. Cela inclut ${userData.cards?.length || 0} cartes et ${userData.savings?.length || 0} comptes d'épargne.`,
        spending: `${userName}, vous avez dépensé £${monthlySpending.toFixed(2)} ce mois-ci sur ${(userData.transactions || []).filter(t => t.type === 'expense').length} transactions. Voulez-vous que je le détaille par catégorie?`,
        greeting: `Bonjour ${userName}! 👋 Je suis là pour vous aider avec vos finances. Je peux voir vos comptes, transactions et objectifs. Que voulez-vous savoir sur votre argent aujourd'hui?`,
        help: `Je peux vous aider avec beaucoup de choses, ${userName}! 🤖 Demandez-moi vos dépenses, budgets, objectifs d'épargne, soldes de comptes, ou des conseils financiers.`
      },
      de: {
        balance: `Hallo ${userName}! 💰 Ihr Gesamtsaldo auf allen Konten beträgt £${totalBalance.toFixed(2)}. Das umfasst ${userData.cards?.length || 0} Karten und ${userData.savings?.length || 0} Sparkonten.`,
        spending: `${userName}, Sie haben diesen Monat £${monthlySpending.toFixed(2)} für ${(userData.transactions || []).filter(t => t.type === 'expense').length} Transaktionen ausgegeben. Soll ich das nach Kategorien aufschlüsseln?`,
        greeting: `Hallo ${userName}! 👋 Ich bin hier, um Ihnen bei Ihren Finanzen zu helfen. Ich kann Ihre Konten, Transaktionen und Ziele sehen. Was möchten Sie heute über Ihr Geld wissen?`,
        help: `Ich kann Ihnen bei vielen Dingen helfen, ${userName}! 🤖 Fragen Sie mich nach Ihren Ausgaben, Budgets, Sparzielen, Kontosalden oder Finanzberatung.`
      }
    };

    const langResponses = responses[language] || responses.en;

    // Check question type
    if (q.includes('balance') || q.includes('saldo') || q.includes('solde') || q.includes('how much money') || q.includes('dinero') || q.includes('argent') || q.includes('geld')) {
      return langResponses.balance;
    }
    
    if (q.includes('spent') || q.includes('spending') || q.includes('gasté') || q.includes('gastado') || q.includes('dépensé') || q.includes('ausgegeben')) {
      return langResponses.spending;
    }
    
    if (q.includes('hello') || q.includes('hi ') || q.includes('hey') || q.includes('hola') || q.includes('bonjour') || q.includes('salut') || q.includes('hallo') || q.includes('ciao')) {
      return langResponses.greeting;
    }
    
    if (q.includes('help') || q.includes('what can you do') || q.includes('ayuda') || q.includes('aide') || q.includes('hilfe') || q.includes('aiuto')) {
      return langResponses.help;
    }
    
    return null; // No quick response available
  }

  // Fallback responses when API fails
  getFallbackResponse(query, userData) {
    const userName = userData.userName?.split(' ')[0] || 'there';
    const q = query.toLowerCase();
    
    if (q.includes('balance') || q.includes('money')) {
      const totalBalance = (userData.cards || []).reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);
      return `Hi ${userName}! Based on your SpendFlow data, your total balance is £${totalBalance.toFixed(2)}. I'm having trouble connecting to my AI service right now, but I can see your basic account information.`;
    }
    
    if (q.includes('spending') || q.includes('spent')) {
      return `${userName}, I can see your transaction history in SpendFlow. I'm experiencing some technical difficulties with my AI processing, but you can view detailed spending breakdowns in your Charts and Calendar sections.`;
    }
    
    if (q.includes('budget') || q.includes('save')) {
      return `Great question about budgeting, ${userName}! While I'm having some connectivity issues, I recommend checking out your Budget section in SpendFlow to set spending limits and track your progress.`;
    }
    
    if (q.includes('goal')) {
      return `${userName}, financial goals are important! You can set and track savings goals in the Goals section of SpendFlow. I'm having some technical difficulties right now, but the app has great tools to help you reach your targets.`;
    }
    
    // Generic helpful response
    return `Hi ${userName}! I'm experiencing some technical difficulties connecting to my AI service, but I'm still here to help! 🤖 

You can explore your financial data using SpendFlow's features:
- Check your Dashboard for an overview
- View Charts for spending analysis  
- Use Calendar to see transaction history
- Set Goals for savings targets

Try asking me again in a moment, or feel free to explore these sections for now!`;
  }

  // Predict future cash flow
  async predictCashFlow(historicalData, timeframe = '3months') {
    const prompt = `
    Based on the following historical financial data, predict future cash flow:
    
    Historical Data: ${JSON.stringify(historicalData)}
    Prediction Timeframe: ${timeframe}
    
    Please provide:
    1. Predicted income for each month
    2. Predicted expenses by category
    3. Expected account balances
    4. Potential cash flow issues
    5. Recommendations to improve cash flow
    
    Format as JSON with monthly breakdowns.
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a financial forecasting expert. Analyze patterns in historical data to make realistic predictions about future cash flow.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });

      return {
        success: true,
        predictions: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Detect unusual spending patterns
  async detectAnomalies(transactions, userProfile) {
    const prompt = `
    Analyze these transactions for unusual spending patterns:
    
    Transactions: ${JSON.stringify(transactions)}
    User Profile: ${JSON.stringify(userProfile)}
    
    Look for:
    1. Unusually large purchases
    2. Spending spikes in certain categories
    3. New merchant patterns
    4. Potential fraudulent activity
    5. Budget overruns
    
    Provide alerts and recommendations in JSON format.
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a financial security and spending analysis expert. Identify unusual patterns and potential issues in spending data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      return {
        success: true,
        anomalies: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate investment advice
  async generateInvestmentAdvice(financialProfile, riskTolerance) {
    const prompt = `
    Provide investment advice based on this financial profile:
    
    Financial Profile: ${JSON.stringify(financialProfile)}
    Risk Tolerance: ${riskTolerance}
    
    Please provide:
    1. Recommended asset allocation
    2. Specific investment suggestions
    3. Risk assessment
    4. Timeline recommendations
    5. Next steps to get started
    
    Format as JSON with clear, actionable advice.
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a qualified investment advisor. Provide personalized investment advice based on the user\'s financial situation and risk tolerance. Always include appropriate disclaimers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1200
      });

      return {
        success: true,
        advice: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate monthly financial report
  async generateMonthlyReport(monthlyData) {
    const prompt = `
    Generate a comprehensive monthly financial report:
    
    Monthly Data: ${JSON.stringify(monthlyData)}
    
    Include:
    1. Income vs Expenses summary
    2. Spending breakdown by category
    3. Savings progress
    4. Goal achievements
    5. Areas for improvement
    6. Next month's recommendations
    
    Format as a clear, readable report in JSON.
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a financial reporting specialist. Create comprehensive, easy-to-understand monthly financial reports with actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1500
      });

      return {
        success: true,
        report: response.choices[0].message.content
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AIService();
