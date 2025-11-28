import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleResetPassword = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    setIsSubmitted(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>SpendFlow</Text>
          <Text style={styles.subtitle}>Reset your password</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            {!isSubmitted ? (
              <>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.description}>
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#a0aec0"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.resetButtonText}>Send Reset Link</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.backToSignIn}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.backToSignInText}>← Back to Sign In</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.successIcon}>
                  <Text style={styles.successIconText}>✉️</Text>
                </View>
                <Text style={styles.successTitle}>Check Your Email</Text>
                <Text style={styles.successDescription}>
                  We've sent a password reset link to <Text style={styles.emailText}>{email}</Text>
                </Text>
                <Text style={styles.successDescription}>
                  Please check your inbox and click the link to reset your password. The link will expire in 24 hours.
                </Text>

                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.resetButtonText}>Back to Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.resendLink}
                  onPress={() => setIsSubmitted(false)}
                >
                  <Text style={styles.resendLinkText}>Didn't receive the email? Try again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    boxShadow: Platform.OS === 'web' ? '0 4px 12px rgba(0, 0, 0, 0.1)' : undefined,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 32,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a202c',
  },
  resetButton: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
    boxShadow: Platform.OS === 'web' ? '0 4px 8px rgba(102, 126, 234, 0.3)' : undefined,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backToSignIn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backToSignInText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconText: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 16,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  emailText: {
    fontWeight: '600',
    color: '#667eea',
  },
  resendLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resendLinkText: {
    fontSize: 14,
    color: '#667eea',
    textDecorationLine: 'underline',
  },
});
