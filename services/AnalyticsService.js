import { trackEvent, trackScreenView, trackUserAction } from '../config/firebase';

class AnalyticsService {
  // Screen tracking
  trackScreen(screenName) {
    trackScreenView(screenName);
  }

  // Authentication events
  trackSignUp(method = 'email') {
    trackEvent('sign_up', { method });
  }

  trackLogin(method = 'email') {
    trackEvent('login', { method });
  }

  trackLogout() {
    trackEvent('logout');
  }

  // Financial events
  trackAddCard(cardType) {
    trackEvent('add_card', { card_type: cardType });
  }

  trackDeleteCard(cardType) {
    trackEvent('delete_card', { card_type: cardType });
  }

  trackAddTransaction(type, category, amount) {
    trackEvent('add_transaction', {
      transaction_type: type,
      category: category,
      value: amount
    });
  }

  trackAddGoal(goalName, targetAmount) {
    trackEvent('add_goal', {
      goal_name: goalName,
      target_amount: targetAmount
    });
  }

  trackGoalCompleted(goalName, targetAmount) {
    trackEvent('goal_completed', {
      goal_name: goalName,
      target_amount: targetAmount
    });
  }

  trackAddDirectDebit(amount, frequency) {
    trackEvent('add_direct_debit', {
      amount: amount,
      frequency: frequency
    });
  }

  trackAddSavingsAccount(accountName, initialBalance) {
    trackEvent('add_savings_account', {
      account_name: accountName,
      initial_balance: initialBalance
    });
  }

  trackTransfer(fromAccount, toAccount, amount) {
    trackEvent('transfer', {
      from_account: fromAccount,
      to_account: toAccount,
      amount: amount
    });
  }

  // Feature usage
  trackChartAdded(chartType, dataType) {
    trackEvent('chart_added', {
      chart_type: chartType,
      data_type: dataType
    });
  }

  trackChartRemoved(chartType) {
    trackEvent('chart_removed', { chart_type: chartType });
  }

  trackAIAssistantOpened() {
    trackEvent('ai_assistant_opened');
  }

  trackAIQuery(queryType) {
    trackEvent('ai_query', { query_type: queryType });
  }

  trackThemeChanged(themeName) {
    trackEvent('theme_changed', { theme_name: themeName });
  }

  trackCurrencyChanged(currencyCode) {
    trackEvent('currency_changed', { currency_code: currencyCode });
  }

  trackStatementGenerated(format) {
    trackEvent('statement_generated', { format: format });
  }

  trackStatementDownloaded(format) {
    trackEvent('statement_downloaded', { format: format });
  }

  // Engagement events
  trackAppOpen() {
    trackEvent('app_open');
  }

  trackSessionStart() {
    trackEvent('session_start', { timestamp: new Date().toISOString() });
  }

  trackSessionEnd(duration) {
    trackEvent('session_end', { duration_seconds: duration });
  }

  // Error tracking
  trackError(errorType, errorMessage) {
    trackEvent('app_error', {
      error_type: errorType,
      error_message: errorMessage
    });
  }

  // Custom event
  track(eventName, params = {}) {
    trackEvent(eventName, params);
  }
}

export default new AnalyticsService();
