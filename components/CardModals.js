import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, TextInput, Pressable, Platform } from 'react-native';

// Edit Card Modal Component
export function EditCardModal({ 
  visible, 
  onClose, 
  onSave,
  editCardName,
  setEditCardName,
  editBankName,
  setEditBankName,
  editBalance,
  setEditBalance,
  editExpiryDate,
  setEditExpiryDate,
  editSelectedColor,
  setEditSelectedColor,
  editUserName,
  setEditUserName,
  cardType
}) {
  const cardColors = [
    '#667eea', '#764ba2', '#f5576c', '#43e97b', 
    '#fa8142', '#0693e3', '#fcb900', '#7bdcb5'
  ];

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
            <Text style={styles.modalTitle}>✏️ Edit Card</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Cardholder Name</Text>
              <TextInput
                style={styles.input}
                value={editUserName}
                onChangeText={setEditUserName}
                placeholder="Enter cardholder name"
                placeholderTextColor="#a0aec0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Card Name</Text>
              <TextInput
                style={styles.input}
                value={editCardName}
                onChangeText={setEditCardName}
                placeholder="e.g., Primary Account"
                placeholderTextColor="#a0aec0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={editBankName}
                onChangeText={setEditBankName}
                placeholder="e.g., Chase"
                placeholderTextColor="#a0aec0"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Balance</Text>
              <TextInput
                style={styles.input}
                value={editBalance}
                onChangeText={setEditBalance}
                placeholder="£0.00"
                placeholderTextColor="#a0aec0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expiry Date</Text>
              <TextInput
                style={styles.input}
                value={editExpiryDate}
                onChangeText={setEditExpiryDate}
                placeholder="MM/YY"
                placeholderTextColor="#a0aec0"
                maxLength={5}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Card Color</Text>
              <View style={styles.colorPicker}>
                {cardColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      editSelectedColor === color && styles.selectedColor
                    ]}
                    onPress={() => setEditSelectedColor(color)}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={onSave}>
              <Text style={styles.submitButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Delete Confirmation Modal Component
export function DeleteConfirmModal({
  visible,
  onClose,
  onConfirm,
  onSwitchAccount,
  cardName,
  cardType,
  hasDirectDebits,
  hasBalance
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
            <Text style={styles.modalTitle}>🗑️ Delete Card</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.deleteWarningText}>
              Are you sure you want to delete <Text style={styles.cardNameHighlight}>{cardName}</Text>?
            </Text>
            
            {cardType === 'debit' && (hasDirectDebits || hasBalance) && (
              <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>⚠️ Important Notice</Text>
                {hasDirectDebits && (
                  <Text style={styles.warningText}>
                    • This card has active direct debits
                  </Text>
                )}
                {hasBalance && (
                  <Text style={styles.warningText}>
                    • This card has a remaining balance
                  </Text>
                )}
                <TouchableOpacity 
                  style={styles.switchButton}
                  onPress={onSwitchAccount}
                >
                  <Text style={styles.switchButtonText}>
                    Switch to Another Account First
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            <Text style={styles.deleteConfirmText}>
              This action cannot be undone. All transaction history for this card will be permanently deleted.
            </Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            {cardType === 'debit' && (hasDirectDebits || hasBalance) ? (
              <TouchableOpacity 
                style={[styles.submitButton, styles.switchAccountButton]} 
                onPress={onSwitchAccount}
              >
                <Text style={styles.submitButtonText}>Switch Account</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.submitButton, styles.deleteButtonModal]} 
                onPress={onConfirm}
              >
                <Text style={styles.submitButtonText}>Delete Card</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Alert Modal Component
export function AlertModal({
  visible,
  onClose,
  title,
  message,
  icon = '✅'
}) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Pressable style={styles.alertModalContent}>
          <View style={styles.alertHeader}>
            <Text style={styles.alertIcon}>{icon}</Text>
            <Text style={styles.alertTitle}>{title}</Text>
          </View>
          <Text style={styles.alertMessage}>{message}</Text>
          <TouchableOpacity 
            style={styles.alertButton}
            onPress={onClose}
          >
            <Text style={styles.alertButtonText}>OK</Text>
          </TouchableOpacity>
        </Pressable>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeIcon: {
    fontSize: 24,
    color: '#4a5568',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a202c',
    backgroundColor: '#f7fafc',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#1a202c',
    transform: [{ scale: 1.1 }],
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#667eea',
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButtonModal: {
    backgroundColor: '#ef4444',
  },
  switchAccountButton: {
    backgroundColor: '#10b981',
  },
  deleteWarningText: {
    fontSize: 16,
    color: '#1a202c',
    lineHeight: 24,
    marginBottom: 20,
  },
  cardNameHighlight: {
    fontWeight: 'bold',
    color: '#667eea',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    marginBottom: 4,
  },
  switchButton: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#718096',
    fontStyle: 'italic',
  },
  alertModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    maxWidth: 400,
    width: '90%',
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  alertButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default { EditCardModal, DeleteConfirmModal, AlertModal };
