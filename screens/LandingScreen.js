import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Footer from '../components/Footer';
import Header from '../components/Header';

const LandingScreen = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(width), [width]);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} currentPage="home" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image 
            source={require('../assets/hero.jpg')} 
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Core Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Features</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💳</Text>
              <Text style={styles.featureTitle}>Virtual Cards</Text>
              <Text style={styles.featureDescription}>
                Create unlimited virtual debit/credit cards with real-time balance tracking and custom names
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureTitle}>Smart Analytics</Text>
              <Text style={styles.featureDescription}>
                Beautiful charts, spending insights, category breakdowns, and exportable PDF reports
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💰</Text>
              <Text style={styles.featureTitle}>Budget Management</Text>
              <Text style={styles.featureDescription}>
                Set category budgets, visual progress tracking, spending alerts, and monthly cycles
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureTitle}>Savings Goals</Text>
              <Text style={styles.featureDescription}>
                Multiple goals, visual progress tracking, target dates, and completion celebrations
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🏦</Text>
              <Text style={styles.featureTitle}>Savings Accounts</Text>
              <Text style={styles.featureDescription}>
                Virtual savings accounts, easy transfers, interest tracking, and balance history
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📅</Text>
              <Text style={styles.featureTitle}>Bill Tracking</Text>
              <Text style={styles.featureDescription}>
                Recurring payments, direct debits, due date reminders, and CSV import
              </Text>
            </View>
          </View>
        </View>

        {/* Advanced Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Tools</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureTitle}>Quick Add</Text>
              <Text style={styles.featureDescription}>
                Fast transaction entry with smart categorization and recurring patterns
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📄</Text>
              <Text style={styles.featureTitle}>Statements</Text>
              <Text style={styles.featureDescription}>
                Generate monthly statements for any card or account with detailed breakdowns
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📆</Text>
              <Text style={styles.featureTitle}>Calendar View</Text>
              <Text style={styles.featureDescription}>
                See all transactions and bills on a calendar with monthly/weekly views
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🔄</Text>
              <Text style={styles.featureTitle}>Smart Transfers</Text>
              <Text style={styles.featureDescription}>
                Intelligent money transfers between accounts with scheduling and automation
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🌍</Text>
              <Text style={styles.featureTitle}>Multi-Currency</Text>
              <Text style={styles.featureDescription}>
                Track expenses in different currencies with automatic conversion rates
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📱</Text>
              <Text style={styles.featureTitle}>iOS Shortcuts</Text>
              <Text style={styles.featureDescription}>
                Quick actions from home screen for instant transaction entry and balance checks
              </Text>
            </View>
          </View>
        </View>

      {/* Social & Community */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social & Community</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💡</Text>
              <Text style={styles.featureTitle}>Community Tips</Text>
              <Text style={styles.featureDescription}>
                Share and discover money-saving tips from the SpendFlow community
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🏆</Text>
              <Text style={styles.featureTitle}>Leaderboard</Text>
              <Text style={styles.featureDescription}>
                Compare your savings progress with others and celebrate achievements
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🤝</Text>
              <Text style={styles.featureTitle}>Connections</Text>
              <Text style={styles.featureDescription}>
                Connect with friends and family for shared financial goals and tips
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>💸</Text>
              <Text style={styles.featureTitle}>Payment Requests</Text>
              <Text style={styles.featureDescription}>
                Send and receive payment requests with tracking and reminders
              </Text>
            </View>
          </View>
        </View>

        {/* Personalization & Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalization & Alerts</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🎨</Text>
              <Text style={styles.featureTitle}>Theme Customization</Text>
              <Text style={styles.featureDescription}>
                Choose from multiple themes including dark mode and custom color schemes
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🔔</Text>
              <Text style={styles.featureTitle}>Smart Notifications</Text>
              <Text style={styles.featureDescription}>
                Customizable alerts for budgets, bills, goals, and account activities
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>👤</Text>
              <Text style={styles.featureTitle}>Profile Management</Text>
              <Text style={styles.featureDescription}>
                Complete profile customization with preferences and settings
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📤</Text>
              <Text style={styles.featureTitle}>Share & Export</Text>
              <Text style={styles.featureDescription}>
                Share data, export reports, and integrate with other apps
              </Text>
            </View>
          </View>
        </View>

        {/* Security & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security & Privacy</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🔐</Text>
              <Text style={styles.featureTitle}>Secure Authentication</Text>
              <Text style={styles.featureDescription}>
                Firebase Authentication with secure password policies and 2FA support
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🛡️</Text>
              <Text style={styles.featureTitle}>Data Privacy</Text>
              <Text style={styles.featureDescription}>
                Your financial data stays private. We never sell or share your information
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>☁️</Text>
              <Text style={styles.featureTitle}>Cloud Backup</Text>
              <Text style={styles.featureDescription}>
                Secure cloud storage with automatic sync across all your devices
              </Text>
            </View>
            
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>✏️</Text>
              <Text style={styles.featureTitle}>Manual Control</Text>
              <Text style={styles.featureDescription}>
                Complete control over your data with manual entry for privacy and accuracy
              </Text>
            </View>
          </View>
        </View>

        {/* Authentication Flow */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Easy Account Management</Text>
          <View style={styles.authFlow}>
            <View style={styles.authStep}>
              <Text style={styles.authStepIcon}>👤</Text>
              <Text style={styles.authStepTitle}>Sign Up</Text>
              <Text style={styles.authStepDesc}>Create account in seconds with email verification</Text>
            </View>
            
            <View style={styles.authStep}>
              <Text style={styles.authStepIcon}>🔑</Text>
              <Text style={styles.authStepTitle}>Sign In</Text>
              <Text style={styles.authStepDesc}>Secure login with password recovery options</Text>
            </View>
            
            <View style={styles.authStep}>
              <Text style={styles.authStepIcon}>🔒</Text>
              <Text style={styles.authStepTitle}>Forgot Password</Text>
              <Text style={styles.authStepDesc}>Easy password reset with email verification</Text>
            </View>
            
            <View style={styles.authStep}>
              <Text style={styles.authStepIcon}>⚙️</Text>
              <Text style={styles.authStepTitle}>Profile Settings</Text>
              <Text style={styles.authStepDesc}>Manage your account, preferences, and data</Text>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Ready to master your finances?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of users managing their money with privacy and control
          </Text>
          <View style={styles.ctaButtons}>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.ctaButtonText}>Start Free Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.ctaButtonSecondary}
              onPress={() => navigation.navigate('Features')}
            >
              <Text style={styles.ctaButtonSecondaryText}>View All Features</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Footer navigation={navigation} />
      </ScrollView>
    </View>
  );
};

const createStyles = (width) => {
  const isSmallScreen = width < 768;
  const isMediumScreen = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8fafc',
    },
    scrollView: {
      flex: 1,
    },
    hero: {
      minHeight: isSmallScreen ? 200 : 400,
      maxHeight: isSmallScreen ? 250 : 500,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    heroImage: {
      width: '100%',
      height: '100%',
      minHeight: isSmallScreen ? 200 : 400,
      maxHeight: isSmallScreen ? 250 : 500,
    },
    section: {
      padding: isSmallScreen ? 24 : 40,
      backgroundColor: '#ffffff',
    },
    sectionTitle: {
      fontSize: isSmallScreen ? 24 : 32,
      fontWeight: 'bold',
      color: '#1a202c',
      textAlign: 'center',
      marginBottom: isSmallScreen ? 24 : 40,
    },
    featureGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: isSmallScreen ? 16 : 20,
    },
    featureCard: {
      backgroundColor: '#f8fafc',
      borderRadius: 16,
      padding: isSmallScreen ? 20 : 24,
      width: isSmallScreen 
        ? width - 48 
        : isMediumScreen 
          ? (width - 72) / 2 
          : isLargeScreen 
            ? (width - 96) / 3 
            : 280,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    featureIcon: {
      fontSize: isSmallScreen ? 40 : 48,
      marginBottom: 16,
    },
    featureTitle: {
      fontSize: isSmallScreen ? 18 : 20,
      fontWeight: '600',
      color: '#1a202c',
      marginBottom: 12,
      textAlign: 'center',
    },
    featureDescription: {
      fontSize: isSmallScreen ? 13 : 14,
      color: '#4a5568',
      textAlign: 'center',
      lineHeight: isSmallScreen ? 18 : 20,
    },
    authFlow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: isSmallScreen ? 16 : 20,
    },
    authStep: {
      backgroundColor: '#f8fafc',
      borderRadius: 16,
      padding: isSmallScreen ? 20 : 24,
      width: isSmallScreen 
        ? width - 48 
        : isMediumScreen 
          ? (width - 72) / 2 
          : 200,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    authStepIcon: {
      fontSize: isSmallScreen ? 40 : 48,
      marginBottom: 16,
    },
    authStepTitle: {
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: '600',
      color: '#1a202c',
      marginBottom: 8,
      textAlign: 'center',
    },
    authStepDesc: {
      fontSize: isSmallScreen ? 13 : 14,
      color: '#4a5568',
      textAlign: 'center',
      lineHeight: isSmallScreen ? 18 : 20,
    },
    cta: {
      padding: isSmallScreen ? 32 : 40,
      backgroundColor: '#f8fafc',
      alignItems: 'center',
    },
    ctaTitle: {
      fontSize: isSmallScreen ? 24 : 28,
      fontWeight: 'bold',
      color: '#1a202c',
      textAlign: 'center',
      marginBottom: 16,
    },
    ctaSubtitle: {
      fontSize: isSmallScreen ? 14 : 16,
      color: '#4a5568',
      textAlign: 'center',
      marginBottom: isSmallScreen ? 24 : 32,
      maxWidth: isSmallScreen ? width - 32 : 600,
      lineHeight: isSmallScreen ? 20 : 24,
    },
    ctaButtons: {
      flexDirection: isSmallScreen ? 'column' : 'row',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    ctaButton: {
      backgroundColor: '#667eea',
      paddingHorizontal: isSmallScreen ? 32 : 40,
      paddingVertical: 16,
      borderRadius: 30,
      shadowColor: '#667eea',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      width: isSmallScreen ? width - 64 : 'auto',
    },
    ctaButtonText: {
      color: '#ffffff',
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: 'bold',
    },
    ctaButtonSecondary: {
      backgroundColor: 'transparent',
      paddingHorizontal: isSmallScreen ? 32 : 40,
      paddingVertical: 16,
      borderRadius: 30,
      borderWidth: 2,
      borderColor: '#667eea',
      width: isSmallScreen ? width - 64 : 'auto',
    },
    ctaButtonSecondaryText: {
      color: '#667eea',
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: 'bold',
    },
  });
};

export default LandingScreen;
