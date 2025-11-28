import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function ProfileButton({ onPress, style }) {
  return (
    <TouchableOpacity 
      style={[styles.profileButton, style]}
      onPress={onPress}
    >
      <Text style={styles.profileIcon}>👤</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
});
