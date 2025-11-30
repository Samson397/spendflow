// components/UpdateNotification.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// App version - increment this when you deploy updates
export const APP_VERSION = '1.0.0';

export default function UpdateNotification() {
  // Temporarily disabled to prevent infinite reloads during development
  if (Platform.OS !== 'web') return null;
  
  return null; // Always return null for now
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  gradient: {
    paddingTop: Platform.OS === 'web' ? 10 : 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
});
