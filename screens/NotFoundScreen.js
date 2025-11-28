import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function NotFoundScreen({ navigation }) {
  const handleGoHome = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('Dashboard');
    } else if (Platform.OS === 'web') {
      window.location.href = '/';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.errorCode}>404</Text>
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.description}>
            The page you're looking for doesn't exist or has been moved.
          </Text>
          
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
          
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>You might want to:</Text>
            <Text style={styles.suggestion}>• Check your spending with Charts</Text>
            <Text style={styles.suggestion}>• View your Wallet</Text>
            <Text style={styles.suggestion}>• Set new Goals</Text>
            <Text style={styles.suggestion}>• Ask the AI Assistant</Text>
          </View>
        </View>
      </LinearGradient>
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorCode: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  homeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 40,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  suggestions: {
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
});
