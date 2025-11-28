import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation?.goBack ? navigation.goBack() : null}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: November 26, 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to SpendFlow. We are committed to protecting your personal information and your right to privacy. 
            This Privacy Policy explains how we collect, use, and safeguard your information when you use our financial 
            management application.
          </Text>
          <Text style={styles.paragraph}>
            We operate in the United Kingdom and comply with the UK General Data Protection Regulation (UK GDPR) and 
            the Data Protection Act 2018.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We only collect information that you voluntarily provide to us:
          </Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Name:</Text> To personalize your experience</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Email Address:</Text> For account creation and communication</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Financial Data:</Text> Transaction details, budgets, and goals that you enter into the app</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Community Content:</Text> Tips, comments, and interactions you share in community features</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Anonymous Username:</Text> Auto-generated username for community participation</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Device Tokens:</Text> For push notifications (with your consent)</Text>
          <Text style={styles.paragraph}>
            We do not automatically collect any data without your explicit input.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use your information solely to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide and maintain our financial management services</Text>
          <Text style={styles.bulletPoint}>• Create and manage your account</Text>
          <Text style={styles.bulletPoint}>• Send you important updates, reports, and notifications</Text>
          <Text style={styles.bulletPoint}>• Provide AI-powered financial insights and recommendations</Text>
          <Text style={styles.bulletPoint}>• Enable community features and moderate content</Text>
          <Text style={styles.bulletPoint}>• Send push notifications (with your consent)</Text>
          <Text style={styles.bulletPoint}>• Improve our application and user experience</Text>
          <Text style={styles.bulletPoint}>• Respond to your inquiries and support requests</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We use the following third-party services to provide our features:
          </Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Firebase (Google):</Text> Authentication, database, hosting, and notifications</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>DeepSeek AI:</Text> AI financial assistant (your financial summaries are sent for analysis)</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Gmail SMTP:</Text> Email delivery for notifications and reports</Text>
          <Text style={styles.paragraph}>
            These services have their own privacy policies. We only share the minimum data necessary for functionality.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Sharing and Disclosure</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>We do not sell, rent, or share your personal information with third parties</Text> except as described in the Third-Party Services section above.
          </Text>
          <Text style={styles.paragraph}>
            Your data remains private and is only accessible to you. We may only disclose your information if:
          </Text>
          <Text style={styles.bulletPoint}>• Required by law or legal process</Text>
          <Text style={styles.bulletPoint}>• Necessary to protect our rights or safety</Text>
          <Text style={styles.bulletPoint}>• You give us explicit consent</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Storage and Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal information against 
            unauthorized access, alteration, disclosure, or destruction. Your data is encrypted both in transit and at rest.
          </Text>
          <Text style={styles.paragraph}>
            However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights (UK GDPR)</Text>
          <Text style={styles.paragraph}>
            Under UK GDPR, you have the following rights:
          </Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Access:</Text> Request a copy of your personal data</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Rectification:</Text> Correct inaccurate or incomplete data</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Erasure:</Text> Request deletion of your personal data</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Restrict Processing:</Text> Limit how we use your data</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Data Portability:</Text> Receive your data in a portable format</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Object:</Text> Object to processing of your data</Text>
          <Text style={styles.bulletPoint}>• <Text style={styles.bold}>Right to Withdraw Consent:</Text> Withdraw consent at any time</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Cookies</Text>
          <Text style={styles.paragraph}>
            We use essential cookies to ensure the proper functioning of our website. These cookies are necessary for 
            the site to work and cannot be disabled. We may also use analytics and marketing cookies with your consent.
          </Text>
          <Text style={styles.paragraph}>
            You can manage your cookie preferences through our cookie banner.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information only for as long as necessary to provide our services and comply with 
            legal obligations. If you delete your account, we will delete your personal data within 30 days, except 
            where we are required to retain it by law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our service is not intended for children under 18 years of age. We do not knowingly collect personal 
            information from children. If you believe we have collected information from a child, please contact us 
            immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
            Privacy Policy on this page and updating the "Last Updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us at:
          </Text>
          <Text style={styles.contactInfo}>Email: spendflowapp@gmail.com</Text>
          <Text style={styles.paragraph}>
            You also have the right to lodge a complaint with the Information Commissioner's Office (ICO), 
            the UK's data protection authority.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 SpendFlow. All rights reserved.</Text>
        </View>
      </ScrollView>
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 50 : 80,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    maxWidth: 800,
    marginHorizontal: 'auto',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 26,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 26,
    marginBottom: 8,
    paddingLeft: 16,
  },
  bold: {
    fontWeight: '600',
    color: '#2d3748',
  },
  contactInfo: {
    fontSize: 16,
    color: '#667eea',
    lineHeight: 26,
    marginBottom: 8,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
  },
});
