import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import { currencies } from '../constants/currencies';

export default function CurrencySettingsModal({ 
  visible, 
  onClose, 
  onSave,
  currentCurrency
}) {
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency || currencies[0]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible && currentCurrency) {
      setSelectedCurrency(currentCurrency);
      setSearchQuery('');
    }
  }, [visible, currentCurrency]);
  
  const filteredCurrencies = currencies.filter(currency =>
    currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (currency.flag && currency.flag.includes(searchQuery))
  );

  const handleSave = () => {
    if (selectedCurrency) {
      onSave(selectedCurrency);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Currency */}
          <View style={styles.selectedSection}>
            <Text style={styles.selectedLabel}>Current:</Text>
            <View style={styles.selectedCurrency}>
              <Text style={styles.selectedFlag}>{selectedCurrency?.flag || '💰'}</Text>
              <Text style={styles.selectedCode}>{selectedCurrency?.code}</Text>
              <Text style={styles.selectedName}>{selectedCurrency?.name}</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search currency..."
              placeholderTextColor="#a0aec0"
            />
          </View>

          {/* Currency List */}
          <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
            {filteredCurrencies.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={[
                  styles.currencyItem,
                  selectedCurrency?.code === currency.code && styles.currencyItemSelected
                ]}
                onPress={() => setSelectedCurrency(currency)}
              >
                <Text style={styles.currencyFlag}>{currency.flag || '💰'}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                </View>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                {selectedCurrency?.code === currency.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
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
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
    color: '#718096',
  },
  selectedSection: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectedLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
  },
  selectedCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  selectedCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
    marginRight: 8,
  },
  selectedName: {
    fontSize: 14,
    color: '#4a5568',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a202c',
    backgroundColor: '#f7fafc',
  },
  currencyList: {
    maxHeight: 300,
    paddingHorizontal: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f7fafc',
  },
  currencyItemSelected: {
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
  },
  currencyName: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
    marginRight: 8,
  },
  checkmark: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#667eea',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
