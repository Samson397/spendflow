import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, FlatList, Modal, TextInput, Alert, ProgressBarAndroid, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCustomAlert } from '../contexts/AlertContext';
import FirebaseService from '../services/FirebaseService';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function GoalsScreen({ navigation }) {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { theme } = useTheme();
  const showAlert = useCustomAlert();
  const [goals, setGoals] = useState([]);
  const [addGoalModalVisible, setAddGoalModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState(null);
  
  // Goal form state
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState('Savings');
  
  // Update amount state
  const [updateAmount, setUpdateAmount] = useState('');
  
  // Helper: safely parse currency/number strings to a number
  const toNumber = (val) => {
    const n = parseFloat(String(val ?? '').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  };
  
  // Load goals from Firebase
  useEffect(() => {
    const loadGoals = async () => {
      if (user?.uid) {
        try {
          const goalsRef = collection(db, 'users', user.uid, 'goals');
          const goalsSnap = await getDocs(goalsRef);
          const userGoals = goalsSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              // normalize numeric fields for safe math/formatting
              targetAmount: toNumber(data.targetAmount),
              currentAmount: toNumber(data.currentAmount)
            };
          });
          setGoals(userGoals);
        } catch (error) {
          console.error('Error loading goals:', error);
          // Show user-friendly error for loading issues
          showAlert('Loading Error', 'Unable to load your goals. Please check your connection and try again.');
        }
      }
    };
    
    loadGoals();
  }, [user]);
  
  const handleAddGoal = async () => {
    if (!goalName || !targetAmount || !deadline) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }
    
    const newGoal = {
      name: goalName,
      targetAmount: toNumber(targetAmount),
      currentAmount: toNumber(currentAmount || 0),
      deadline: deadline,
      category: category,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    if (user?.uid) {
      try {
        const goalsRef = collection(db, 'users', user.uid, 'goals');
        const docRef = await addDoc(goalsRef, newGoal);
        
        setGoals([...goals, { id: docRef.id, ...newGoal }]);
        setAddGoalModalVisible(false);
        clearForm();
        showAlert('Success', 'Goal created successfully!');
      } catch (error) {
        showAlert('Error', 'Failed to create goal');
      }
    }
  };
  
  const clearForm = () => {
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setCategory('Savings');
  };
  
  const handleGoalTap = (goal) => {
    setSelectedGoal(goal);
    setUpdateAmount(String(toNumber(goal.currentAmount)));
    setUpdateModalVisible(true);
  };
  
  const handleUpdateProgress = async () => {
    if (!updateAmount || !selectedGoal) {
      showAlert('Error', 'Please enter an amount');
      return;
    }
    
    const newAmount = toNumber(updateAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      showAlert('Error', 'Please enter a valid amount');
      return;
    }
    
    try {
      const result = await FirebaseService.updateGoal(user.uid, selectedGoal.id, {
        currentAmount: newAmount
      });
      
      if (result.success) {
        setGoals(goals.map(g => 
          g.id === selectedGoal.id ? { ...g, currentAmount: newAmount } : g
        ));
        setUpdateModalVisible(false);
        setUpdateAmount('');
        showAlert('Success', 'Goal progress updated!');
      } else {
        showAlert('Error', 'Failed to update goal');
      }
    } catch (error) {
      showAlert('Error', 'Failed to update goal');
    }
  };
  
  const handleEditGoal = (goal) => {
    setSelectedGoal(goal);
    setGoalName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline);
    setCategory(goal.category);
    setEditModalVisible(true);
  };
  
  const handleSaveEdit = async () => {
    if (!goalName || !targetAmount || !deadline) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      const updates = {
        name: goalName,
        targetAmount: toNumber(targetAmount),
        currentAmount: toNumber(currentAmount || 0),
        deadline: deadline,
        category: category
      };
      
      const result = await FirebaseService.updateGoal(user.uid, selectedGoal.id, updates);
      
      if (result.success) {
        setGoals(goals.map(g => 
          g.id === selectedGoal.id ? { ...g, ...updates } : g
        ));
        setEditModalVisible(false);
        clearForm();
        showAlert('Success', 'Goal updated successfully!');
      } else {
        showAlert('Error', 'Failed to update goal');
      }
    } catch (error) {
      showAlert('Error', 'Failed to update goal');
    }
  };
  
  const handleDeleteGoal = (goal) => {
    // Close other modals first so confirm isn't hidden behind
    setUpdateModalVisible(false);
    setEditModalVisible(false);
    setGoalToDelete(goal);
    setConfirmDeleteVisible(true);
  };

  const performDeleteGoal = async () => {
    if (!goalToDelete || !user?.uid) return;
    try {
      const result = await FirebaseService.deleteGoal(user.uid, goalToDelete.id);
      if (result.success) {
        setGoals(goals.filter(g => g.id !== goalToDelete.id));
        setConfirmDeleteVisible(false);
        setGoalToDelete(null);
        setUpdateModalVisible(false);
        setEditModalVisible(false);
        showAlert('Success', 'Goal deleted successfully!');
      } else {
        showAlert('Error', 'Failed to delete goal. Please try again.');
      }
    } catch (error) {
      console.error('Delete goal error:', error);
      showAlert('Error', 'Failed to delete goal. Please try again.');
    }
  };
  
  const getProgress = (goal) => {
    const target = toNumber(goal?.targetAmount);
    const current = toNumber(goal?.currentAmount);
    if (!target || target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };
  
  const getProgressColor = (progress) => {
    if (progress < 30) return '#ef4444';
    if (progress < 70) return '#f59e0b';
    return '#10b981';
  };
  
  const renderGoal = ({ item }) => {
    const progress = getProgress(item);
    const progressColor = progress >= 100 ? '#10b981' : progress >= 50 ? '#f59e0b' : theme.primary;
    
    return (
      <TouchableOpacity 
        style={[styles.goalCard, { backgroundColor: theme.cardBg }]}
        onPress={() => handleGoalTap(item)}
        onLongPress={() => handleEditGoal(item)}
      >
        <View style={styles.goalHeader}>
          <Text style={[styles.goalName, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.goalCategory, { color: theme.accent }]}>{item.category}</Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.background[0] }]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%`, backgroundColor: progressColor }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.text }]}>{isNaN(progress) ? '0%' : `${progress.toFixed(0)}%`}</Text>
        </View>
        
        <View style={styles.goalDetails}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Current:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {currency.symbol}{toNumber(item.currentAmount).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Target:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>
              {currency.symbol}{toNumber(item.targetAmount).toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Deadline:</Text>
            <Text style={[styles.detailValue, { color: theme.text }]}>{item.deadline}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Financial Goals</Text>
          <TouchableOpacity onPress={() => setAddGoalModalVisible(true)}>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ScrollView style={styles.content}>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Goals Yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Set your first financial goal to start tracking your progress
            </Text>
            <TouchableOpacity 
              style={[styles.createFirstButton, { backgroundColor: theme.primary }]}
              onPress={() => setAddGoalModalVisible(true)}
            >
              <Text style={styles.createFirstButtonText}>Create First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((item) => (
              <View key={item.id}>
                {renderGoal({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* Add Goal Modal */}
      <Modal
        visible={addGoalModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Goal</Text>
              <TouchableOpacity onPress={() => setAddGoalModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Goal Name *</Text>
                <TextInput
                  style={styles.input}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="e.g., Emergency Fund"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="words"
                  autoCorrect={true}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Target Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor="#a0aec0"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Amount</Text>
                <TextInput
                  style={styles.input}
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor="#a0aec0"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Deadline *</Text>
                <TextInput
                  style={styles.input}
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#a0aec0"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryButtons}>
                  {['Savings', 'Investment', 'Purchase', 'Debt', 'Other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonActive
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleAddGoal}
              >
                <Text style={styles.submitButtonText}>Create Goal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        visible={confirmDeleteVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmDeleteVisible(false)}
      >
        <View style={[
          styles.modalOverlay,
          Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } : null
        ]}>
          <View style={[styles.modalContent, { maxWidth: 420 }]}> 
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Goal</Text>
              <TouchableOpacity onPress={() => setConfirmDeleteVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.goalTarget, { textAlign: 'left' }]}>This action cannot be undone.</Text>
              {goalToDelete && (
                <Text style={{ fontSize: 16, color: '#1a202c' }}>
                  Delete "{goalToDelete.name}"?
                </Text>
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => setConfirmDeleteVisible(false)}
              >
                <Text style={styles.editButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={performDeleteGoal}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Update Progress Modal */}
      <Modal
        visible={updateModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setUpdateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Progress</Text>
              <TouchableOpacity onPress={() => setUpdateModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {selectedGoal && (
                <>
                  <Text style={[styles.goalNameLarge, { color: theme.text }]}>{selectedGoal.name}</Text>
                  <Text style={[styles.goalTarget, { color: theme.textSecondary }]}>
                    Target: {currency.symbol}{selectedGoal.targetAmount.toFixed(2)}
                  </Text>
                  
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Current Amount *</Text>
                    <TextInput
                      style={styles.input}
                      value={updateAmount}
                      onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9.]/g, '');
                        const parts = numericText.split('.');
                        let formattedText = parts[0];
                        if (parts.length > 1) {
                          formattedText += '.' + parts[1].substring(0, 2);
                        }
                        setUpdateAmount(formattedText);
                      }}
                      placeholder={`${currency.symbol}0.00`}
                      placeholderTextColor="#a0aec0"
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                  </View>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteGoal(selectedGoal)}
                    >
                      <Text style={styles.deleteButtonText}>Delete Goal</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.editButton]}
                      onPress={() => {
                        setUpdateModalVisible(false);
                        handleEditGoal(selectedGoal);
                      }}
                    >
                      <Text style={styles.editButtonText}>Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleUpdateProgress}
                  >
                    <Text style={styles.submitButtonText}>Update Progress</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Goal Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Goal</Text>
              <TouchableOpacity onPress={() => {
                setEditModalVisible(false);
                clearForm();
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Goal Name *</Text>
                <TextInput
                  style={styles.input}
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="e.g., Emergency Fund"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Target Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={targetAmount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    const parts = numericText.split('.');
                    let formattedText = parts[0];
                    if (parts.length > 1) {
                      formattedText += '.' + parts[1].substring(0, 2);
                    }
                    setTargetAmount(formattedText);
                  }}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor="#a0aec0"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Amount</Text>
                <TextInput
                  style={styles.input}
                  value={currentAmount}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9.]/g, '');
                    const parts = numericText.split('.');
                    let formattedText = parts[0];
                    if (parts.length > 1) {
                      formattedText += '.' + parts[1].substring(0, 2);
                    }
                    setCurrentAmount(formattedText);
                  }}
                  placeholder={`${currency.symbol}0.00`}
                  placeholderTextColor="#a0aec0"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Deadline *</Text>
                <TextInput
                  style={styles.input}
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#a0aec0"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryButtons}>
                  {['Savings', 'Investment', 'Purchase', 'Debt', 'Other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonActive
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    color: '#ffffff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  createFirstButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  goalsList: {
    padding: 20,
  },
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  goalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  goalCategory: {
    fontSize: 14,
    color: '#718096',
    backgroundColor: '#f7fafc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
    minWidth: 40,
  },
  goalDetails: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#718096',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    maxHeight: Platform.OS === 'web' ? '80%' : '90%',
    width: Platform.OS === 'web' ? '100%' : 'auto',
    maxWidth: Platform.OS === 'web' ? 480 : 'none',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a202c',
  },
  closeButton: {
    fontSize: 24,
    color: '#718096',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
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
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a202c',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  categoryButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#4a5568',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  goalTarget: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  editButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
