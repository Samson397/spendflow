import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';

export default function LocationPermissionModal({ 
  visible, 
  onAllow, 
  onDeny, 
  onClose 
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalIcon}>📍</Text>
            <Text style={styles.modalTitle}>Location Permission</Text>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.explanationTitle}>
              Why we need your location:
            </Text>
            
            <View style={styles.reasonsList}>
              <View style={styles.reasonItem}>
                <Text style={styles.reasonEmoji}>💰</Text>
                <Text style={styles.reasonText}>
                  <Text style={styles.reasonBold}>Auto-detect currency:</Text> Show amounts in your local currency (USD, EUR, GBP, etc.)
                </Text>
              </View>
              
              <View style={styles.reasonItem}>
                <Text style={styles.reasonEmoji}>📅</Text>
                <Text style={styles.reasonText}>
                  <Text style={styles.reasonBold}>Regional date format:</Text> Display dates in your country's format (MM/DD/YYYY for US, DD/MM/YYYY for EU)
                </Text>
              </View>
              
              <View style={styles.reasonItem}>
                <Text style={styles.reasonEmoji}>🌍</Text>
                <Text style={styles.reasonText}>
                  <Text style={styles.reasonBold}>Better experience:</Text> Personalized app interface based on your region
                </Text>
              </View>
            </View>

            <View style={styles.privacyNote}>
              <Text style={styles.privacyIcon}>🔒</Text>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>Your Privacy:</Text>
                <Text style={styles.privacyText}>
                  • Location is only used once to detect your country, currency, and date format{'\n'}
                  • We don't track or store your precise location{'\n'}
                  • You can change currency and region manually anytime in settings{'\n'}
                  • No location data is shared with third parties
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.denyButton} onPress={onDeny}>
              <Text style={styles.denyButtonText}>Not Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.allowButton} onPress={onAllow}>
              <Text style={styles.allowButtonText}>Allow Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
    paddingTop: 0,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 16,
  },
  reasonsList: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reasonEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  reasonBold: {
    fontWeight: '600',
    color: '#2d3748',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  privacyIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#4a5568',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  denyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  allowButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
