import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  const features = [
    {
      icon: '💳',
      title: 'Virtual Cards',
      description: 'Create unlimited virtual cards to organize your spending. Track balances and transactions for each card.'
    },
    {
      icon: '💰',
      title: 'Budget Management',
      description: 'Create category budgets and track your spending. Get visual progress bars and alerts when approaching limits.'
    },
    {
      icon: '🎯',
      title: 'Savings Goals',
      description: 'Set savings goals with target amounts and dates. Track your progress and celebrate when you reach them.'
    },
    {
      icon: '📊',
      title: 'Beautiful Charts',
      description: 'Visualize your spending with interactive charts. See where your money goes by category and over time.'
    },
    {
      icon: '📅',
      title: 'Direct Debits',
      description: 'Track recurring bills and payments. Import from CSV or add manually. Never miss a payment again.'
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description: 'No bank connections required. You control your data with manual entry. Your finances stay private.'
    }
  ];

  const benefits = [
    {
      title: '100% Free',
      description: 'All features included at no cost. No premium tiers, no subscriptions, no hidden fees.',
      stat: '🆓',
      statLabel: 'Forever Free'
    },
    {
      title: 'Complete Privacy',
      description: 'Manual entry means no bank connections. Your financial data stays completely private.',
      stat: '🔒',
      statLabel: 'Your Data, Your Control'
    },
    {
      title: 'Works Everywhere',
      description: 'Use on web, iOS, or Android. Your data syncs automatically across all devices.',
      stat: '📱',
      statLabel: 'Any Device, Anywhere'
    }
  ];

  const howItWorks = [
    {
      step: '1',
      title: 'Create Your Account',
      description: 'Sign up for free in seconds. No credit card required, no strings attached.',
      icon: '✨'
    },
    {
      step: '2',
      title: 'Set Up Your Cards',
      description: 'Create virtual cards to organize your spending by category or purpose.',
      icon: '💳'
    },
    {
      step: '3',
      title: 'Track Your Money',
      description: 'Add transactions as you spend. Set budgets and savings goals to stay on track.',
      icon: '📝'
    },
    {
      step: '4',
      title: 'See Your Progress',
      description: 'Watch your savings grow with beautiful charts and celebrate reaching your goals.',
      icon: '🎉'
    }
  ];

  return (
    <View style={styles.container}>
      <SEO />
      <StatusBar style="light" />
      
      <Header navigation={navigation} currentPage="home" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.heroSection}
        >
          <View style={styles.heroContainer}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>
                Master Your Money,{'\n'}
                <Text style={styles.heroTitleAccent}>Amplify Your Life</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                Take control of your finances with SpendFlow's smart budgeting tools. 
                Track expenses, set goals, and build wealth with confidence.
              </Text>
              <View style={styles.heroButtons}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('SignUp')}
                >
                  <Text style={styles.primaryButtonText}>Start Free Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => navigation.navigate('Features')}
                >
                  <Text style={styles.secondaryButtonText}>Learn More</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>100%</Text>
                  <Text style={styles.statLabel}>Free Forever</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>∞</Text>
                  <Text style={styles.statLabel}>Unlimited Cards</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>🔒</Text>
                  <Text style={styles.statLabel}>Privacy First</Text>
                </View>
              </View>
            </View>
            {width > 768 && (
              <View style={styles.heroImageContainer}>
                <Image
                  source={require('../assets/hero.jpg')}
                  style={styles.heroImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Everything You Need to Succeed</Text>
            <Text style={styles.sectionSubtitle}>
              Powerful features designed to help you take control of your financial future
            </Text>
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Benefits Section */}
        <View style={[styles.section, styles.benefitsSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Proven Results</Text>
            <Text style={styles.sectionSubtitle}>
              Join thousands of users who have transformed their financial lives
            </Text>
            <View style={styles.benefitsGrid}>
              {benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitCard}>
                  <Text style={styles.benefitStat}>{benefit.stat}</Text>
                  <Text style={styles.benefitStatLabel}>{benefit.statLabel}</Text>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* How It Works Section */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>How SpendFlow Works</Text>
            <Text style={styles.sectionSubtitle}>
              Get started in minutes and see results in days
            </Text>
            <View style={styles.stepsContainer}>
              {howItWorks.map((step, index) => (
                <View key={index} style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{step.step}</Text>
                    </View>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                  </View>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.ctaSection}
        >
          <View style={styles.sectionContainer}>
            <Text style={styles.ctaTitle}>Ready to Transform Your Finances?</Text>
            <Text style={styles.ctaSubtitle}>
              Start tracking your finances today - completely free, no bank connection required
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.ctaButtonText}>Get Started Free</Text>
            </TouchableOpacity>
            <Text style={styles.ctaNote}>No credit card required • Free forever</Text>
          </View>
        </LinearGradient>

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
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  heroContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: width > 768 ? 'row' : 'column',
    alignItems: 'center',
    gap: 40,
  },
  heroContent: {
    flex: 1,
    alignItems: width > 768 ? 'flex-start' : 'center',
    textAlign: width > 768 ? 'left' : 'center',
  },
  heroTitle: {
    fontSize: width > 768 ? 48 : 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: width > 768 ? 'left' : 'center',
    lineHeight: width > 768 ? 56 : 42,
  },
  heroTitleAccent: {
    color: '#ffd700',
  },
  heroSubtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 32,
    textAlign: width > 768 ? 'left' : 'center',
    lineHeight: 28,
    maxWidth: 500,
  },
  heroButtons: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 16,
    marginBottom: 48,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 40,
    justifyContent: width > 768 ? 'flex-start' : 'center',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 450,
    height: 300,
    borderRadius: 16,
  },
  section: {
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  benefitsSection: {
    backgroundColor: '#f8f9fa',
  },
  sectionContainer: {
    maxWidth: 1200,
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
    gap: 24,
    justifyContent: 'center',
  },
  featureCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    width: width > 768 ? 350 : width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    textAlign: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 32,
    justifyContent: 'center',
  },
  benefitCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  benefitStat: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  benefitStatLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  benefitDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    textAlign: 'center',
  },
  stepsContainer: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 24,
    justifyContent: 'center',
  },
  stepCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    backgroundColor: '#667eea',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepIcon: {
    fontSize: 32,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    textAlign: 'center',
  },
  ctaSection: {
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

export default LandingScreen;
