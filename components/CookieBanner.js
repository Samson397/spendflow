import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    checkCookieConsent();
  }, []);

  const checkCookieConsent = async () => {
    try {
      const consent = Platform.OS === 'web' 
        ? localStorage.getItem('cookieConsent')
        : await AsyncStorage.getItem('cookieConsent');
      if (!consent) {
        setVisible(true);
      }
    } catch (error) {
      console.error('Error checking cookie consent:', error);
      setVisible(true);
    }
  };

  const handleAccept = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('cookieConsent', 'accepted');
      } else {
        await AsyncStorage.setItem('cookieConsent', 'accepted');
      }
      setVisible(false);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  };

  const handleDecline = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('cookieConsent', 'declined');
      } else {
        await AsyncStorage.setItem('cookieConsent', 'declined');
      }
      setVisible(false);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  };

  const handlePrivacyLink = () => {
    if (navigation && navigation.navigate) {
      navigation.navigate('PrivacyPolicy');
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.content}>
          <View style={styles.textSection}>
            <Text style={styles.title}>🍪 Cookie Notice</Text>
            <Text style={styles.description}>
              We use cookies to improve your experience. 
            </Text>
            <TouchableOpacity onPress={handlePrivacyLink}>
              <Text style={styles.link}>Privacy Policy →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.buttonSection}>
            <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    zIndex: 1000,
    alignItems: 'center',
  },
  innerContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 600,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    width: '100%',
    flexWrap: 'nowrap',
    gap: 10,
  },
  textSection: {
    flex: 1,
    marginRight: 16,
    minWidth: 200,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  link: {
    fontSize: 12,
    color: '#667eea',
    textDecorationLine: 'underline',
  },
  buttonSection: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  declineButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default CookieBanner;
