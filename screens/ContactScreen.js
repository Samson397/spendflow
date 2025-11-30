import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const ContactScreen = ({ navigation }) => {

  const contactMethods = [
    {
      icon: '📧',
      title: 'Email Support',
      description: 'Get detailed help via email',
      contact: 'spendflowapp@gmail.com',
      responseTime: 'Response within 24 hours'
    },
  ];
  const faqs = [
    {
      question: 'How quickly do you respond to support requests?',
      answer: 'We typically respond to email inquiries within 24 hours during business days.'
    },
    {
      question: 'Can you help with account setup?',
      answer: 'Absolutely! Our support team can help you set up your account, create virtual cards, and get started with SpendFlow.'
    }
  ];

  return (
    <View style={styles.container}>
      <SEO 
        title="Contact SpendFlow Support | Get Help with Your Privacy-First Finance App"
        description="Need help with SpendFlow? Contact our support team for assistance with virtual cards, budgets, savings goals, or technical issues. Fast, friendly support via email at spendflowapp@gmail.com - we typically respond within 24 hours."
        keywords="SpendFlow support, finance app help, virtual card support, budget help, technical support, customer service"
        url="https://spendflow.uk/contact"
      />
      <StatusBar style="light" />
      
      <Header navigation={navigation} currentPage="contact" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>Get in Touch</Text>
            <Text style={styles.heroSubtitle}>
              We're here to help! Reach out with questions, feedback, or if you need assistance with your account.
            </Text>
          </View>
        </View>

        {/* Contact Methods */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>How Can We Help?</Text>
            <View style={styles.contactMethodsGrid}>
              {contactMethods.map((method, index) => (
                <TouchableOpacity key={index} style={styles.contactMethodCard}>
                  <Text style={styles.contactMethodIcon}>{method.icon}</Text>
                  <Text style={styles.contactMethodTitle}>{method.title}</Text>
                  <Text style={styles.contactMethodDescription}>{method.description}</Text>
                  <Text style={styles.contactMethodContact}>{method.contact}</Text>
                  <Text style={styles.contactMethodResponse}>{method.responseTime}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Direct Contact Info */}
        <View style={[styles.section, styles.formSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Get in Touch</Text>
            <Text style={styles.sectionSubtitle}>
              Send us an email directly - we'll get back to you within 24 hours
            </Text>
            
            <View style={styles.directContactCard}>
              <Text style={styles.directContactIcon}>📧</Text>
              <Text style={styles.directContactTitle}>Email Us Directly</Text>
              <Text style={styles.directContactEmail}>spendflowapp@gmail.com</Text>
              <Text style={styles.directContactNote}>
                Copy the email address above and send us your questions, feedback, or support requests
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={[styles.section, styles.faqSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Quick Answers</Text>
            <Text style={styles.sectionSubtitle}>
              Common questions about our support
            </Text>
            <View style={styles.faqList}>
              {faqs.map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.faqButton}
              onPress={() => navigation.navigate('FAQ')}
            >
              <Text style={styles.faqButtonText}>View All FAQs</Text>
            </TouchableOpacity>
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
  formSection: {
    backgroundColor: '#f8f9fa',
  },
  faqSection: {
    backgroundColor: '#f8f9fa',
  },
  sectionContainer: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: width > 768 ? 32 : 24,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  contactMethodsGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 24,
    justifyContent: 'center',
  },
  contactMethodCard: {
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
  contactMethodIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  contactMethodTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactMethodDescription: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 12,
  },
  contactMethodContact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    textAlign: 'center',
    marginBottom: 4,
  },
  contactMethodResponse: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
  },
  directContactCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    textAlign: 'center',
  },
  directContactIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  directContactTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
    textAlign: 'center',
  },
  directContactEmail: {
    fontSize: 20,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 16,
    textAlign: 'center',
  },
  directContactNote: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 400,
  },
  officesGrid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 24,
    justifyContent: 'center',
  },
  officeCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    flex: width > 768 ? 1 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  officeCity: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
  },
  officeType: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  officeAddress: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  faqList: {
    gap: 24,
    marginBottom: 32,
  },
  faqItem: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  faqButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignSelf: 'center',
  },
  faqButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContactScreen;
