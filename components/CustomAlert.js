import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Portal from './Portal';

export default function CustomAlert({ visible, title, message, onClose, buttons = null }) {
  const { theme } = useTheme();

  const defaultButtons = [
    {
      text: 'OK',
      onPress: onClose,
      style: 'default'
    }
  ];

  const alertButtons = buttons || defaultButtons;

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.portalContainer}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.alertContainer, { backgroundColor: theme.cardBg }]}>
          {title && (
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          )}
          
          {message && (
            <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
          )}
          
          <View style={styles.buttonContainer}>
            {alertButtons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' 
                    ? { 
                        backgroundColor: theme.background[0], 
                        borderColor: theme.textSecondary + '30',
                        borderWidth: 1
                      }
                    : { backgroundColor: theme.primary },
                  alertButtons.length === 1 ? styles.singleButton : styles.multiButton
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
              >
                <Text style={[
                  styles.buttonText,
                  { color: button.style === 'cancel' ? theme.text : '#ffffff' }
                ]}>
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  portalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  alertContainer: {
    borderRadius: 16,
    padding: 24,
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  singleButton: {
    flex: 1,
  },
  multiButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
