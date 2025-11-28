import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function TermsOfServiceScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.lastUpdated}>Last updated: November 26, 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using SpendFlow, you agree to be bound by these Terms of Service. 
          If you do not agree to these terms, please do not use our service.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          SpendFlow is a personal finance management application that helps users track expenses, 
          manage budgets, monitor financial goals, participate in community discussions, and receive 
          AI-powered financial insights. The service is provided "as is" without warranties.
        </Text>

        <Text style={styles.sectionTitle}>3. User Account</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials and 
          for all activities that occur under your account. You agree to notify us immediately of 
          any unauthorized use of your account.
        </Text>

        <Text style={styles.sectionTitle}>4. User Conduct</Text>
        <Text style={styles.paragraph}>You agree not to:</Text>
        <Text style={styles.bulletPoint}>• Use the service for any illegal purpose</Text>
        <Text style={styles.bulletPoint}>• Attempt to gain unauthorized access to any part of the service</Text>
        <Text style={styles.bulletPoint}>• Interfere with or disrupt the service</Text>
        <Text style={styles.bulletPoint}>• Transmit any viruses or malicious code</Text>
        <Text style={styles.bulletPoint}>• Use the service to harm minors in any way</Text>

        <Text style={styles.sectionTitle}>5. AI Assistant and Financial Information</Text>
        <Text style={styles.paragraph}>
          SpendFlow includes an AI-powered financial assistant that provides general information and 
          insights based on your financial data. This AI assistant does NOT provide professional 
          financial, investment, or legal advice. All responses are for informational purposes only.
        </Text>
        <Text style={styles.paragraph}>
          All financial decisions should be made after consulting with qualified professionals. 
          We are not responsible for any financial losses resulting from the use of our service 
          or AI recommendations.
        </Text>

        <Text style={styles.sectionTitle}>6. Community Features</Text>
        <Text style={styles.paragraph}>
          SpendFlow includes community features where users can share financial tips and advice. 
          By participating, you agree to:
        </Text>
        <Text style={styles.bulletPoint}>• Share content that is helpful, respectful, and appropriate</Text>
        <Text style={styles.bulletPoint}>• Not share personal financial details or sensitive information</Text>
        <Text style={styles.bulletPoint}>• Respect other users' privacy and opinions</Text>
        <Text style={styles.bulletPoint}>• Not provide professional financial advice unless qualified</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you post, but grant SpendFlow a license to display and 
          moderate your contributions. We reserve the right to remove inappropriate content.
        </Text>

        <Text style={styles.sectionTitle}>7. Privacy</Text>
        <Text style={styles.paragraph}>
          Your use of our service is also governed by our Privacy Policy. Please review our 
          Privacy Policy, which also governs the site and informs users of our data collection practices.
        </Text>

        <Text style={styles.sectionTitle}>8. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          All content, features, and functionality of SpendFlow are owned by us and are protected 
          by international copyright, trademark, and other intellectual property laws.
        </Text>

        <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          SpendFlow shall not be liable for any indirect, incidental, special, consequential, or 
          punitive damages resulting from your use or inability to use the service.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We reserve the right to modify these terms at any time. We will notify users of any 
          material changes via email or through the service.
        </Text>

        <Text style={styles.sectionTitle}>11. Termination</Text>
        <Text style={styles.paragraph}>
          We may terminate or suspend your account immediately, without prior notice or liability, 
          for any reason, including breach of these Terms.
        </Text>

        <Text style={styles.sectionTitle}>12. Governing Law</Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the 
          United Kingdom, without regard to its conflict of law provisions.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Information</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.contactInfo}>spendflowapp@gmail.com</Text>
      </ScrollView>
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 20,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3748',
    marginTop: 20,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4a5568',
    marginBottom: 15,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4a5568',
    marginLeft: 20,
    marginBottom: 5,
  },
  contactInfo: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 15,
  },
});
