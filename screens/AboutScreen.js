import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const AboutScreen = ({ navigation }) => {
  const stats = [
    { number: '100%', label: 'Free to Use' },
    { number: '∞', label: 'Unlimited Cards' },
    { number: '24/7', label: 'Access Anywhere' },
    { number: '🔒', label: 'Privacy First' }
  ];

  const values = [
    {
      icon: '🎯',
      title: 'Transparency',
      description: 'We believe in complete transparency about fees, data usage, and how our platform works.'
    },
    {
      icon: '🔒',
      title: 'Security First',
      description: 'Your financial security is our top priority. We use bank-level encryption and never store sensitive data.'
    },
    {
      icon: '🌱',
      title: 'Empowerment',
      description: 'We empower people to make informed financial decisions and build long-term wealth.'
    },
    {
      icon: '🤝',
      title: 'Accessibility',
      description: 'Financial tools should be accessible to everyone, regardless of income or background.'
    }
  ];

  const whySpendFlow = [
    {
      icon: '✏️',
      title: 'Manual Control',
      description: 'Unlike apps that connect to your bank, SpendFlow gives you complete control. Add transactions manually for maximum privacy.'
    },
    {
      icon: '🆓',
      title: 'Completely Free',
      description: 'No hidden fees, no premium tiers, no subscriptions. All features are available to everyone for free.'
    },
    {
      icon: '📱',
      title: 'Works Everywhere',
      description: 'Use SpendFlow on web, iOS, or Android. Your data syncs automatically across all your devices.'
    },
    {
      icon: '🎨',
      title: 'Beautiful Design',
      description: 'A modern, intuitive interface with multiple themes. Managing money has never looked this good.'
    }
  ];

  return (
    <View style={styles.container}>
      <SEO 
        title="About SpendFlow | Free Privacy-First Personal Finance App"
        description="SpendFlow is a free personal finance app that puts you in control. Track spending, manage budgets, and achieve savings goals - all without connecting your bank account."
        url="https://spedflowapp.web.app/about"
      />
      <StatusBar style="light" />
      
      <Header navigation={navigation} currentPage="about" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>Simple, Private, Free Finance Tracking</Text>
            <Text style={styles.heroSubtitle}>
              SpendFlow is a personal finance app that puts you in control. Track your spending, manage budgets, 
              and achieve your savings goals - all without connecting your bank account.
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.sectionContainer}>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <Text style={styles.statNumber}>{stat.number}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Story Section */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Why SpendFlow?</Text>
            <View style={styles.storyContent}>
              <Text style={styles.storyText}>
                SpendFlow was created for people who want to take control of their finances without connecting their bank accounts 
                to yet another app. We believe in privacy-first personal finance management.
              </Text>
              <Text style={styles.storyText}>
                With SpendFlow, you manually track your income and expenses, giving you complete awareness of where your money goes. 
                Create virtual cards to organize spending, set budgets, track savings goals, and visualize your financial progress 
                with beautiful charts.
              </Text>
              <Text style={styles.storyText}>
                Whether you're saving for a vacation, paying off debt, or just trying to spend less on takeout, SpendFlow gives you 
                the tools you need - completely free, with no strings attached.
              </Text>
            </View>
          </View>
        </View>

        {/* Values Section */}
        <View style={[styles.section, styles.valuesSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Our Values</Text>
            <Text style={styles.sectionSubtitle}>
              These principles guide everything we do at SpendFlow
            </Text>
            <View style={styles.valuesGrid}>
              {values.map((value, index) => (
                <View key={index} style={styles.valueCard}>
                  <Text style={styles.valueIcon}>{value.icon}</Text>
                  <Text style={styles.valueTitle}>{value.title}</Text>
                  <Text style={styles.valueDescription}>{value.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Why SpendFlow Section */}
        <View style={[styles.section, styles.timelineSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>What Makes Us Different</Text>
            <Text style={styles.sectionSubtitle}>
              Built with privacy and simplicity in mind
            </Text>
            <View style={styles.teamGrid}>
              {whySpendFlow.map((item, index) => (
                <View key={index} style={styles.teamCard}>
                  <Text style={styles.teamEmoji}>{item.icon}</Text>
                  <Text style={styles.teamName}>{item.title}</Text>
                  <Text style={styles.teamBio}>{item.description}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.sectionContainer}>
            <Text style={styles.ctaTitle}>Join Our Mission</Text>
            <Text style={styles.ctaSubtitle}>
              Be part of the financial revolution. Start your journey to financial freedom today.
            </Text>
            <View style={styles.ctaButtons}>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.ctaButtonText}>Get Started Free</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondaryButton}
                onPress={() => navigation.navigate('Contact')}
              >
                <Text style={styles.ctaSecondaryButtonText}>Contact Us</Text>
              </TouchableOpacity>
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
    marginBottom: 24,
    lineHeight: width > 768 ? 50 : 38,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 28,
  },
  statsSection: {
    backgroundColor: '#667eea',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCard: {
    alignItems: 'center',
    flex: width > 768 ? 1 : 0,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  valuesSection: {
    backgroundColor: '#f8f9fa',
  },
  timelineSection: {
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
  storyContent: {
    maxWidth: 800,
    alignSelf: 'center',
  },
  storyText: {
    fontSize: 18,
    color: '#4a5568',
    lineHeight: 28,
    marginBottom: 24,
    textAlign: 'left',
  },
  valuesGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 32,
    justifyContent: 'center',
  },
  valueCard: {
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
  },
  valueIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  valueTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 12,
    textAlign: 'center',
  },
  valueDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    textAlign: 'center',
  },
  teamGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 32,
    justifyContent: 'center',
  },
  teamCard: {
    backgroundColor: '#ffffff',
    padding: 32,
    borderRadius: 16,
    width: width > 768 ? 280 : width - 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  teamEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  teamRole: {
    fontSize: 16,
    color: '#667eea',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  teamBio: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    textAlign: 'center',
  },
  timeline: {
    maxWidth: 600,
    alignSelf: 'center',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  timelineYear: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 24,
    minWidth: 80,
    alignItems: 'center',
  },
  timelineYearText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  timelineDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
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
  ctaButtons: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
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
  ctaSecondaryButton: {
    borderWidth: 2,
    borderColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  ctaSecondaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AboutScreen;
