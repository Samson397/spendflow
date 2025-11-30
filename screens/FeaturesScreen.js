import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const FeaturesScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

  const mainFeatures = [
    {
      icon: '💳',
      title: 'Virtual Card Management',
      description: 'Create and manage virtual debit and credit cards. Track balances, view transactions, and organize your spending across multiple cards.',
      features: [
        'Create unlimited virtual cards',
        'Track card balances in real-time',
        'View transaction history per card',
        'Organize by card type (debit/credit)',
        'Custom card names and colors'
      ]
    },
    {
      icon: '📊',
      title: 'Smart Analytics & Charts',
      description: 'Visualize your spending with beautiful charts and graphs. Understand where your money goes with category breakdowns and trends.',
      features: [
        'Spending by category charts',
        'Monthly spending trends',
        'Income vs expense analysis',
        'Interactive data visualization',
        'Export reports as PDF'
      ]
    },
    {
      icon: '💰',
      title: 'Budget Management',
      description: 'Create budgets for different categories and track your progress. Get alerts when you\'re approaching your limits.',
      features: [
        'Category-based budgets',
        'Visual progress tracking',
        'Spending alerts',
        'Monthly budget cycles',
        'Budget vs actual comparison'
      ]
    },
    {
      icon: '🎯',
      title: 'Savings Goals',
      description: 'Set savings goals and track your progress. Whether it\'s an emergency fund, vacation, or major purchase.',
      features: [
        'Create multiple goals',
        'Track progress visually',
        'Set target dates',
        'Contribute from any account',
        'Goal completion celebrations'
      ]
    },
    {
      icon: '🏦',
      title: 'Savings Accounts',
      description: 'Create virtual savings accounts to organize your money. Perfect for separating funds for different purposes.',
      features: [
        'Multiple savings accounts',
        'Easy transfers between accounts',
        'Track interest earnings',
        'Custom account names',
        'Balance history'
      ]
    },
    {
      icon: '📅',
      title: 'Direct Debits & Recurring',
      description: 'Manage your recurring payments and direct debits. Never miss a bill with automatic payment tracking.',
      features: [
        'Track recurring payments',
        'Payment due date reminders',
        'Automatic payment processing',
        'Import from CSV/spreadsheet',
        'Payment history'
      ]
    }
  ];

  const additionalFeatures = [
    {
      name: 'Calendar View',
      description: 'See all your transactions and bills on a calendar',
      icon: '📆'
    },
    {
      name: 'Statements',
      description: 'Generate monthly statements for any card or account',
      icon: '📄'
    },
    {
      name: 'Community Tips',
      description: 'Share and discover money-saving tips from the community',
      icon: '💡'
    },
    {
      name: 'Leaderboard',
      description: 'Compare your savings progress with others',
      icon: '🏆'
    },
    {
      name: 'Multi-Currency',
      description: 'Track expenses in different currencies',
      icon: '🌍'
    },
    {
      name: 'Theme Customization',
      description: 'Choose from multiple themes including dark mode',
      icon: '🎨'
    }
  ];

  const securityFeatures = [
    {
      title: 'Secure Authentication',
      description: 'Your account is protected with Firebase Authentication and secure password policies.',
      icon: '🔐'
    },
    {
      title: 'Data Privacy',
      description: 'Your financial data stays private. We never sell or share your information with third parties.',
      icon: '🛡️'
    },
    {
      title: 'Cloud Backup',
      description: 'Your data is securely stored in the cloud and synced across all your devices.',
      icon: '☁️'
    },
    {
      title: 'Manual Entry',
      description: 'You control your data. Add transactions manually for complete privacy and accuracy.',
      icon: '✏️'
    }
  ];

  return (
    <View style={styles.container}>
      <SEO 
        title="Features - SpendFlow | Virtual Cards, Budgets & Privacy-First Finance"
        description="Explore SpendFlow's complete feature set: create unlimited virtual cards, track expenses manually for better awareness, set smart budgets, achieve savings goals, and manage direct debits - all with complete privacy and no bank connections required."
        keywords="virtual cards, manual expense tracking, budget management, savings goals, direct debits, privacy finance app, no bank connection"
        url="https://spendflow.uk/features"
      />
      <StatusBar style="light" />
      
      <Header navigation={navigation} currentPage="features" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>Powerful Features for Smart Finance Management</Text>
            <Text style={styles.heroSubtitle}>
              Everything you need to take control of your finances, build wealth, and achieve your financial goals.
            </Text>
          </View>
        </View>

        {/* Main Features */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Core Features</Text>
            <View style={styles.featuresGrid}>
              {mainFeatures.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                  <View style={styles.featureList}>
                    {feature.features.map((item, itemIndex) => (
                      <View key={itemIndex} style={styles.featureListItem}>
                        <Text style={styles.featureListBullet}>✓</Text>
                        <Text style={styles.featureListText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Additional Features Section */}
        <View style={[styles.section, styles.integrationsSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Even More Features</Text>
            <Text style={styles.sectionSubtitle}>
              Everything you need to manage your finances in one place
            </Text>
            <View style={styles.integrationsGrid}>
              {additionalFeatures.map((feature, index) => (
                <View key={index} style={styles.integrationCard}>
                  <Text style={styles.integrationIcon}>{feature.icon}</Text>
                  <Text style={styles.integrationName}>{feature.name}</Text>
                  <Text style={styles.integrationDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
            <Text style={styles.sectionSubtitle}>
              Your financial data is protected with the highest security standards
            </Text>
            <View style={styles.securityGrid}>
              {securityFeatures.map((security, index) => (
                <View key={index} style={styles.securityCard}>
                  <Text style={styles.securityIcon}>{security.icon}</Text>
                  <Text style={styles.securityTitle}>{security.title}</Text>
                  <Text style={styles.securityDescription}>{security.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.sectionContainer}>
            <Text style={styles.ctaTitle}>Ready to Experience These Features?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of users who are already managing their finances smarter with SpendFlow
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.ctaButtonText}>Start Free</Text>
            </TouchableOpacity>
            <Text style={styles.ctaNote}>All features included • No credit card required</Text>
          </View>
        </View>

        <Footer navigation={navigation} />
      </ScrollView>
    </View>
  );
};

const createStyles = (width) => {
  const sectionWidth = width >= 1440 ? width - 160 : Math.min(width - 40, 1200);
  const heroWidth = width >= 1440 ? width - 160 : Math.min(width - 40, 840);
  const cardWidth = width >= 1280 ? (sectionWidth - 64) / 3 : width > 768 ? (sectionWidth - 48) / 2 : width - 40;
  const integrationWidth = width >= 1280 ? (sectionWidth - 72) / 4 : width > 768 ? (sectionWidth - 64) / 3 : width - 40;

  return StyleSheet.create({
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
    maxWidth: heroWidth,
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
    fontSize: 20,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 28,
  },
  section: {
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  integrationsSection: {
    backgroundColor: '#f8f9fa',
  },
  sectionContainer: {
    maxWidth: sectionWidth,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: width > 768 ? 36 : 28,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 26,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    width: cardWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureList: {
    gap: 8,
  },
  featureListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureListBullet: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureListText: {
    fontSize: 14,
    color: '#4a5568',
    flex: 1,
  },
  integrationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  integrationCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    width: integrationWidth,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  integrationIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  integrationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  integrationDescription: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 20,
  },
  securityGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  securityCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    flex: width > 768 ? 1 : 0,
    minWidth: width > 768 ? 250 : width - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  securityIcon: {
    fontSize: 40,
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  securityDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    textAlign: 'center',
  },
  ctaSection: {
    backgroundColor: '#667eea',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  ctaTitle: {
    fontSize: width > 768 ? 36 : 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
  ctaNote: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  });
};

export default FeaturesScreen;
