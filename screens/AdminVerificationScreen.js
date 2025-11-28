import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, TextInput, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FirebaseService from '../services/FirebaseService';
import SavingsVerificationService from '../services/SavingsVerificationService';

export default function AdminVerificationScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [pendingTips, setPendingTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTip, setSelectedTip] = useState(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    loadPendingVerifications();
  }, []);

  const loadPendingVerifications = async () => {
    try {
      setLoading(true);
      // Get tips that need verification (high amounts or flagged)
      const result = await FirebaseService.getCommunityTips();
      if (result.success) {
        const flaggedTips = result.data.filter(tip => 
          tip.savedAmount > 1000 || tip.flagged || !tip.verified
        );
        setPendingTips(flaggedTips);
      }
    } catch (error) {
      console.error('Error loading pending verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVerificationModal = async (tip) => {
    setSelectedTip(tip);
    setShowVerificationModal(true);
    
    // Get verification analysis
    try {
      const analysis = await SavingsVerificationService.verifySavingsAgainstSpending(
        tip.authorId,
        tip.savedAmount,
        tip.category
      );
      setSelectedTip({...tip, analysis});
    } catch (error) {
      console.error('Error getting analysis:', error);
    }
  };

  const handleVerification = async (approved, reason) => {
    if (!selectedTip) return;
    
    try {
      const verificationData = {
        tipId: selectedTip.id,
        verifiedBy: user.uid,
        approved,
        reason,
        verificationDate: new Date(),
        originalAmount: selectedTip.savedAmount,
        adjustedAmount: approved ? selectedTip.savedAmount : 0,
      };

      await FirebaseService.updateTipVerification(selectedTip.id, verificationData);
      
      // Update local state
      setPendingTips(prev => prev.filter(tip => tip.id !== selectedTip.id));
      setShowVerificationModal(false);
      setSelectedTip(null);
      setVerificationNotes('');
      
      Alert.alert('Success', `Tip ${approved ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error('Error updating verification:', error);
      Alert.alert('Error', 'Failed to update verification');
    }
  };

  const getVerificationColor = (amount) => {
    if (amount >= 5000) return '#ef4444';
    if (amount >= 2000) return '#f59e0b';
    if (amount >= 1000) return '#3b82f6';
    return '#10b981';
  };

  const getRiskLevel = (amount) => {
    if (amount >= 5000) return 'HIGH RISK';
    if (amount >= 2000) return 'MEDIUM RISK';
    if (amount >= 1000) return 'LOW RISK';
    return 'VERIFIED';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🔍 Tip Verification</Text>
            <Text style={styles.headerSub}>Review pending savings claims</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
      </LinearGradient>

      <View style={[styles.statsBar, { backgroundColor: theme.cardBg }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{pendingTips.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#ef4444' }]}>
            {pendingTips.filter(tip => tip.savedAmount >= 5000).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>High Risk</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
            {pendingTips.filter(tip => tip.savedAmount >= 2000 && tip.savedAmount < 5000).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Medium Risk</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading pending verifications...</Text>
        </View>
      ) : (
        <ScrollView style={styles.tipsList}>
          {pendingTips.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No tips pending verification</Text>
            </View>
          ) : (
            pendingTips.map((tip) => (
              <View key={tip.id} style={[styles.tipCard, { backgroundColor: theme.cardBg }]}>
                <View style={styles.tipHeader}>
                  <View style={styles.tipInfo}>
                    <Text style={[styles.tipTitle, { color: theme.text }]}>{tip.title}</Text>
                    <Text style={[styles.tipAuthor, { color: theme.textSecondary }]}>
                      by {tip.authorName} • {tip.category}
                    </Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: getVerificationColor(tip.savedAmount) + '20' }]}>
                    <Text style={[styles.riskText, { color: getVerificationColor(tip.savedAmount) }]}>
                      {getRiskLevel(tip.savedAmount)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.tipContent, { color: theme.textSecondary }]} numberOfLines={2}>
                  {tip.content}
                </Text>

                <View style={styles.savingsInfo}>
                  <View style={[styles.savingsAmount, { backgroundColor: getVerificationColor(tip.savedAmount) + '15' }]}>
                    <Text style={[styles.savingsText, { color: getVerificationColor(tip.savedAmount) }]}>
                      💰 Claims £{tip.savedAmount.toLocaleString()} saved
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.reviewBtn, { backgroundColor: theme.primary }]}
                    onPress={() => openVerificationModal(tip)}
                  >
                    <Text style={styles.reviewBtnText}>Review Details</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.quickApproveBtn, { backgroundColor: '#10b981' + '20' }]}
                    onPress={() => handleVerification(true, 'Quick approval')}
                  >
                    <Text style={[styles.quickApproveBtnText, { color: '#10b981' }]}>✓ Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.quickRejectBtn, { backgroundColor: '#ef4444' + '20' }]}
                    onPress={() => handleVerification(false, 'Suspicious amount')}
                  >
                    <Text style={[styles.quickRejectBtnText, { color: '#ef4444' }]}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Verification Modal */}
      <Modal visible={showVerificationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Verification Details</Text>
              <TouchableOpacity onPress={() => setShowVerificationModal(false)}>
                <Text style={{ fontSize: 24, color: theme.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedTip && (
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalTipTitle, { color: theme.text }]}>{selectedTip.title}</Text>
                <Text style={[styles.modalTipContent, { color: theme.textSecondary }]}>{selectedTip.content}</Text>
                
                <View style={[styles.claimBox, { backgroundColor: getVerificationColor(selectedTip.savedAmount) + '15' }]}>
                  <Text style={[styles.claimAmount, { color: getVerificationColor(selectedTip.savedAmount) }]}>
                    Claims £{selectedTip.savedAmount.toLocaleString()} saved
                  </Text>
                </View>

                {selectedTip.analysis && (
                  <View style={[styles.analysisBox, { backgroundColor: theme.background[0] }]}>
                    <Text style={[styles.analysisTitle, { color: theme.text }]}>🤖 AI Analysis</Text>
                    <Text style={[styles.analysisText, { color: theme.textSecondary }]}>
                      Confidence: {selectedTip.analysis.confidence}%
                    </Text>
                    <Text style={[styles.analysisReason, { color: theme.textSecondary }]}>
                      {selectedTip.analysis.reason}
                    </Text>
                  </View>
                )}

                <Text style={[styles.notesLabel, { color: theme.text }]}>Verification Notes</Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: theme.background[0], color: theme.text }]}
                  placeholder="Add notes about this verification..."
                  placeholderTextColor={theme.textSecondary}
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.approveBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleVerification(true, verificationNotes)}
                  >
                    <Text style={styles.approveBtnText}>✓ Approve Tip</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.rejectBtn, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleVerification(false, verificationNotes)}
                  >
                    <Text style={styles.rejectBtnText}>✗ Reject Tip</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  
  statsBar: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14 },
  
  tipsList: { flex: 1, paddingHorizontal: 16 },
  tipCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  tipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  tipInfo: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  tipAuthor: { fontSize: 12 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  riskText: { fontSize: 10, fontWeight: '600' },
  tipContent: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  savingsInfo: { marginBottom: 12 },
  savingsAmount: { padding: 8, borderRadius: 8 },
  savingsText: { fontSize: 14, fontWeight: '600' },
  
  actionButtons: { flexDirection: 'row', gap: 8 },
  reviewBtn: { flex: 2, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  reviewBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  quickApproveBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  quickApproveBtnText: { fontSize: 12, fontWeight: '600' },
  quickRejectBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  quickRejectBtnText: { fontSize: 12, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  modalTipTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  modalTipContent: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  claimBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  claimAmount: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  analysisBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  analysisTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  analysisText: { fontSize: 12, marginBottom: 4 },
  analysisReason: { fontSize: 12, fontStyle: 'italic' },
  notesLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  notesInput: { borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  approveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  rejectBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
