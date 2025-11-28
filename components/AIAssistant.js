import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AIService from '../services/AIService';
import FirebaseService from '../services/FirebaseService';

export default function AIAssistant({ visible, onClose }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: "Hi! I'm your AI financial assistant. Ask me anything about your finances - spending patterns, budget advice, or financial goals!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({});
  const [userPreferences, setUserPreferences] = useState({});
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const scrollViewRef = useRef();

  // Load user's financial data and conversation history when component mounts
  useEffect(() => {
    if (user?.uid && visible && !conversationLoaded) {
      loadUserFinancialData();
      loadConversationHistory();
      loadUserPreferences();
    }
  }, [user, visible, conversationLoaded]);

  const loadUserFinancialData = async () => {
    try {
      const [profileResult, cardsResult, transactionsResult, savingsResult, debitsResult, budgetsResult, goalsResult] = await Promise.all([
        FirebaseService.getUserProfile(user.uid),
        FirebaseService.getUserCards(user.uid),
        FirebaseService.getUserTransactions(user.uid),
        FirebaseService.getUserSavingsAccounts(user.uid),
        FirebaseService.getUserDirectDebits(user.uid),
        FirebaseService.getUserBudgets(user.uid),
        FirebaseService.getUserGoals(user.uid)
      ]);

      // Get user name from profile or auth
      const userName = profileResult.success && profileResult.data?.name 
        ? profileResult.data.name 
        : user?.displayName || user?.email?.split('@')[0] || 'User';

      setUserData({
        userName,
        profile: profileResult.success ? profileResult.data : {},
        cards: cardsResult.success ? cardsResult.data : [],
        transactions: (transactionsResult.success ? transactionsResult.data : []).slice(0, 50), // Limit for speed
        savings: savingsResult.success ? savingsResult.data : [],
        directDebits: debitsResult.success ? debitsResult.data : [],
        budgets: budgetsResult.success ? budgetsResult.data : [],
        goals: goalsResult.success ? goalsResult.data : []
      });

      // Update greeting with user's name (only if no conversation history)
      if (!conversationLoaded) {
        setMessages([{
          id: 1,
          type: 'ai',
          text: `Hi ${userName.split(' ')[0]}! 👋 I'm your AI financial assistant. I can see your accounts, transactions, budgets, and goals. Ask me anything about your finances!`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading user financial data:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      const result = await FirebaseService.getAIConversationHistory(user.uid);
      if (result.success && result.data.length > 0) {
        // Convert Firebase timestamps to Date objects
        const messages = result.data.map(msg => ({
          ...msg,
          timestamp: msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.timestamp)
        }));
        setMessages(messages);
        setConversationLoaded(true);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const result = await FirebaseService.getUserPreferences(user.uid);
      if (result.success) {
        setUserPreferences(result.data);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const saveMessage = async (message) => {
    try {
      await FirebaseService.saveAIMessage(user.uid, {
        type: message.type,
        text: message.text,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateUserLearning = async (query, response) => {
    // Simple learning: track topics and communication patterns
    const topics = ['spending', 'saving', 'budget', 'goals', 'investment', 'debt'];
    const mentionedTopics = topics.filter(topic => 
      query.toLowerCase().includes(topic) || response.toLowerCase().includes(topic)
    );
    
    if (mentionedTopics.length > 0) {
      const currentTopics = userPreferences.preferredTopics || '';
      const newTopics = [...new Set([...currentTopics.split(',').filter(Boolean), ...mentionedTopics])].join(',');
      await FirebaseService.saveUserPreference(user.uid, 'preferredTopics', newTopics);
    }

    // Track communication style preference
    if (query.length > 100) {
      await FirebaseService.saveUserPreference(user.uid, 'communicationStyle', 'detailed');
    } else if (query.length < 30) {
      await FirebaseService.saveUserPreference(user.uid, 'communicationStyle', 'concise');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputText.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputText.trim();
    setInputText('');
    setLoading(true);

    // Save user message
    await saveMessage(userMessage);

    try {
      // Get AI response with learning context
      const response = await AIService.answerFinancialQuery(
        query, 
        { ...userData, uid: user.uid }, // Include UID for full data loading
        userPreferences, 
        messages
      );
      
      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          text: response.answer,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // Save AI response
        await saveMessage(aiMessage);
        
        // Update user learning
        await updateUserLearning(query, response.answer);
        
        // Reload preferences to get updated learning
        await loadUserPreferences();
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'ai',
          text: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        await saveMessage(errorMessage);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        text: "I apologize, but I'm experiencing technical difficulties. Please try your question again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      await saveMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "How much did I spend this week?",
    "What are my direct debits?",
    "List my last 10 transactions",
    "What's my account balance?",
    "How close am I to my goals?",
    "What's my biggest expense category?",
    "How can I save more money?",
    "Show me my spending by category",
    "When will I reach my savings goals?",
    "What's my current financial health?",
    "Help me create a budget",
    "What can you help me with?",
    "Hello!",
    // Spanish
    "¿Cuánto gasté esta semana?",
    "¿Cuáles son mis débitos directos?",
    "¡Hola! ¿Cómo estás?",
    "¿Cuál es mi saldo?",
    // French
    "Combien ai-je dépensé cette semaine?",
    "Quels sont mes prélèvements automatiques?",
    "Bonjour! Comment allez-vous?",
    "Quel est mon solde?",
    // German
    "Wie viel habe ich diese Woche ausgegeben?",
    "Was sind meine Lastschriften?",
    "Hallo! Wie geht es dir?",
    "Wie hoch ist mein Saldo?"
  ];

  const handleQuickQuestion = (question) => {
    setInputText(question);
  };

  const clearConversation = async () => {
    try {
      await FirebaseService.clearAIConversation(user.uid);
      setMessages([{
        id: 1,
        type: 'ai',
        text: `Hi ${userData.userName?.split(' ')[0] || 'there'}! 👋 I'm your AI financial assistant. I can see your accounts, transactions, budgets, and goals. Ask me anything about your finances!`,
        timestamp: new Date()
      }]);
      setConversationLoaded(false);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
      <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
        {/* Modern Header */}
        <LinearGradient 
          colors={theme.gradient} 
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarText}>✨</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>SpendFlow AI</Text>
              <Text style={styles.headerSubtitle}>Your Financial Assistant</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={clearConversation} style={styles.clearButton}>
              <Text style={styles.clearIcon}>🗑️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={[styles.messagesContainer, { backgroundColor: theme.background[0] }]}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View key={message.id} style={[
              styles.messageContainer,
              message.type === 'user' ? styles.userMessage : styles.aiMessage
            ]}>
              {message.type === 'ai' && (
                <View style={[styles.messageAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={styles.avatarEmoji}>🤖</Text>
                </View>
              )}
              <View style={[
                styles.messageBubble,
                message.type === 'user' 
                  ? [styles.userBubble, { backgroundColor: theme.primary }]
                  : [styles.aiBubble, { backgroundColor: theme.cardBg }]
              ]}>
                <Text style={[
                  styles.messageText,
                  message.type === 'user' ? styles.userText : [styles.aiText, { color: theme.text }]
                ]}>
                  {message.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  message.type === 'user' ? styles.userTime : [styles.aiTime, { color: theme.textSecondary }]
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
              {message.type === 'user' && (
                <View style={[styles.messageAvatar, styles.userAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
              )}
            </View>
          ))}
          
          {loading && (
            <View style={[styles.messageContainer, styles.aiMessage]}>
              <View style={[styles.messageAvatar, { backgroundColor: theme.primary + '20' }]}>
                <Text style={styles.avatarEmoji}>🤖</Text>
              </View>
              <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble, { backgroundColor: theme.cardBg }]}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, { backgroundColor: theme.primary }]} />
                  <View style={[styles.typingDot, styles.typingDot2, { backgroundColor: theme.primary }]} />
                  <View style={[styles.typingDot, styles.typingDot3, { backgroundColor: theme.primary }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Questions - Redesigned */}
        {messages.length <= 1 && (
          <View style={[styles.quickQuestionsSection, { backgroundColor: theme.background[0], borderTopColor: theme.textSecondary + '20' }]}>
            <Text style={[styles.quickQuestionsLabel, { color: theme.textSecondary }]}>Try asking:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickQuestionsScroll}
            >
              {quickQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickQuestion, { backgroundColor: theme.cardBg, borderColor: theme.primary + '30' }]}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Text style={[styles.quickQuestionText, { color: theme.text }]}>{question}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Modern Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderTopColor: theme.textSecondary + '20' }]}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.messageInput, { backgroundColor: theme.background[0], color: theme.text }]}
              placeholder="Ask me anything about your finances..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
              onKeyPress={({ nativeEvent }) => {
                // Handle Enter key on both web and mobile
                // Enter: Send message (if Shift is not pressed)
                // Shift+Enter: Add new line (multiline behavior)
                if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                  // Prevent default to avoid new line on Enter
                  if (Platform.OS === 'web') {
                    nativeEvent.preventDefault();
                  }
                  // Send message if there's text and not loading
                  if (inputText.trim() && !loading) {
                    sendMessage();
                  }
                }
              }}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton, 
                { backgroundColor: theme.primary },
                (!inputText.trim() || loading) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.poweredBy, { color: theme.textSecondary }]}>Powered by SpendFlow</Text>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    marginTop: Platform.OS === 'web' ? 40 : 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatarText: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  userAvatar: {
    marginLeft: 8,
  },
  avatarEmoji: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
  },
  loadingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#1f2937',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiTime: {
    color: '#9ca3af',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.6,
  },
  typingDot3: {
    opacity: 0.8,
  },
  quickQuestionsSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  quickQuestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickQuestionsScroll: {
    paddingHorizontal: 12,
  },
  quickQuestion: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  quickQuestionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendIcon: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  poweredBy: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
