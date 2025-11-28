import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const FAQScreen = ({ navigation }) => {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleItem = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqCategories = [
    {
      title: 'Getting Started',
      faqs: [
        {
          question: 'How do I create a SpendFlow account?',
          answer: 'Click "Get Started" on our homepage, enter your email and create a password. You can also sign up with Google. The entire process takes less than a minute!'
        },
        {
          question: 'Is SpendFlow really free?',
          answer: 'Yes! SpendFlow is 100% free with all features included. There are no premium tiers, no subscriptions, and no hidden fees. We believe everyone deserves access to great financial tools.'
        },
        {
          question: 'How do I add my transactions?',
          answer: 'SpendFlow uses manual entry for maximum privacy. Tap the + button on your dashboard to add expenses, income, or transfers. You can also import transactions from CSV files for direct debits.'
        },
        {
          question: 'What devices can I use SpendFlow on?',
          answer: 'SpendFlow works on web browsers, iOS, and Android. Your data syncs automatically across all your devices through your account.'
        }
      ]
    },
    {
      title: 'Security & Privacy',
      faqs: [
        {
          question: 'Do you connect to my bank account?',
          answer: 'No! SpendFlow is a manual-entry app. We never connect to your bank or access your financial accounts. You have complete control over what data you add.'
        },
        {
          question: 'How is my data stored?',
          answer: 'Your data is securely stored in Firebase with encryption. Only you can access your financial information through your authenticated account.'
        },
        {
          question: 'Do you sell my data?',
          answer: 'Never. We will never sell, rent, or share your personal financial data with anyone. Your data belongs to you, period.'
        },
        {
          question: 'What happens if I delete my account?',
          answer: 'If you delete your account, all your data is permanently removed from our servers. We cannot recover deleted accounts.'
        }
      ]
    },
    {
      title: 'Features & Functionality',
      faqs: [
        {
          question: 'What are virtual cards?',
          answer: 'Virtual cards help you organize your spending. Create cards for different purposes (groceries, entertainment, bills) and track spending on each. They\'re not real cards - just a way to categorize your money.'
        },
        {
          question: 'How do budgets work?',
          answer: 'Create budgets for different spending categories. Set a monthly limit, and SpendFlow tracks your spending against it. You\'ll see visual progress and get alerts when approaching your limit.'
        },
        {
          question: 'How do savings goals work?',
          answer: 'Set a savings goal with a target amount and optional deadline. Add contributions manually, and SpendFlow tracks your progress with visual charts and celebrates when you reach your goal!'
        },
        {
          question: 'Can I track recurring bills?',
          answer: 'Yes! Use the Direct Debits feature to track recurring payments. You can import them from a CSV file or add them manually. SpendFlow will remind you of upcoming payments.'
        }
      ]
    },
    {
      title: 'Troubleshooting',
      faqs: [
        {
          question: 'My data isn\'t syncing across devices',
          answer: 'Make sure you\'re logged into the same account on all devices. Try pulling down to refresh, or log out and back in. Check your internet connection.'
        },
        {
          question: 'How do I change a transaction\'s category?',
          answer: 'Tap on any transaction to edit it. You can change the category, amount, description, or date. Changes save automatically.'
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes! Go to Statements to generate monthly reports. You can view transaction history and export data for your records.'
        },
        {
          question: 'The app is running slowly',
          answer: 'Try refreshing the page or restarting the app. Clear your browser cache if using web. Make sure you have a stable internet connection.'
        }
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <SEO 
        title="FAQ - SpendFlow | Frequently Asked Questions & Help"
        description="Find answers to common questions about SpendFlow. Learn about security, features, getting started, and troubleshooting. Get help with your personal finance management."
        url="https://spedflowapp.web.app/faq"
      />
      <StatusBar style="light" />
      
      <Header navigation={navigation} currentPage="faq" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
            <Text style={styles.heroSubtitle}>
              Find answers to common questions about SpendFlow. Can't find what you're looking for? 
              Contact our support team for personalized help.
            </Text>
          </View>
        </View>

        {/* FAQ Categories */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            {faqCategories.map((category, categoryIndex) => (
              <View key={categoryIndex} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <View style={styles.faqList}>
                  {category.faqs.map((faq, faqIndex) => {
                    const itemKey = `${categoryIndex}-${faqIndex}`;
                    const isExpanded = expandedItems[itemKey];
                    
                    return (
                      <View key={faqIndex} style={styles.faqItem}>
                        <TouchableOpacity
                          style={styles.faqQuestion}
                          onPress={() => toggleItem(itemKey)}
                        >
                          <Text style={styles.faqQuestionText}>{faq.question}</Text>
                          <Text style={[
                            styles.faqIcon,
                            isExpanded && styles.faqIconExpanded
                          ]}>
                            {isExpanded ? '−' : '+'}
                          </Text>
                        </TouchableOpacity>
                        {isExpanded && (
                          <View style={styles.faqAnswer}>
                            <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <View style={styles.sectionContainer}>
            <Text style={styles.contactTitle}>Still Need Help?</Text>
            <Text style={styles.contactSubtitle}>
              Our support team is here to help you succeed with SpendFlow
            </Text>
            <View style={styles.contactOptions}>
              <View style={styles.contactOption}>
                <Text style={styles.contactIcon}>📧</Text>
                <Text style={styles.contactOptionTitle}>Email Support</Text>
                <Text style={styles.contactOptionText}>Get detailed help via email</Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => navigation.navigate('Contact')}
                >
                  <Text style={styles.contactButtonText}>Send Email</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contactOption}>
                <Text style={styles.contactIcon}>💬</Text>
                <Text style={styles.contactOptionTitle}>Live Chat</Text>
                <Text style={styles.contactOptionText}>Chat with our team in real-time</Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => navigation.navigate('Contact')}
                >
                  <Text style={styles.contactButtonText}>Start Chat</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contactOption}>
                <Text style={styles.contactIcon}>📚</Text>
                <Text style={styles.contactOptionTitle}>Help Center</Text>
                <Text style={styles.contactOptionText}>Browse our knowledge base</Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => navigation.navigate('Blog')}
                >
                  <Text style={styles.contactButtonText}>Visit Help Center</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <Footer navigation={navigation} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  heroContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: width > 768 ? 42 : 32,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: width > 768 ? 50 : 38,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 26,
  },
  section: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  sectionContainer: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  categorySection: {
    marginBottom: 48,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 24,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  faqList: {
    gap: 16,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    flex: 1,
    marginRight: 16,
  },
  faqIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
    width: 24,
    textAlign: 'center',
  },
  faqIconExpanded: {
    color: '#667eea',
  },
  faqAnswer: {
    padding: 20,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
  },
  contactSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  contactTitle: {
    fontSize: width > 768 ? 36 : 28,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
  },
  contactSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 26,
  },
  contactOptions: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 32,
    justifyContent: 'center',
  },
  contactOption: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    flex: width > 768 ? 1 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  contactIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  contactOptionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactOptionText: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  contactButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FAQScreen;
