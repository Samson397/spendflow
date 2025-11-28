import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FirebaseService from '../services/FirebaseService';

const NOTIFICATION_TYPES = [
  { id: 'transactions', label: 'Transaction Alerts', description: 'Get notified for new transactions', icon: '💳' },
  { id: 'budgets', label: 'Budget Warnings', description: 'Alerts when approaching budget limits', icon: '⚠️' },
  { id: 'directDebits', label: 'Direct Debit Reminders', description: 'Upcoming payment notifications', icon: '📅' },
  { id: 'goals', label: 'Goal Progress', description: 'Updates on savings goal milestones', icon: '🎯' },
  { id: 'savings', label: 'Savings Updates', description: 'Interest accrual and balance changes', icon: '🏦' },
  { id: 'security', label: 'Security Alerts', description: 'Login attempts and security events', icon: '🔒' },
  { id: 'tips', label: 'Financial Tips', description: 'Personalized money-saving suggestions', icon: '💡' },
  { id: 'weekly', label: 'Weekly Summary', description: 'Weekly spending and savings report', icon: '📊' },
];

const QUIET_HOURS = [
  { id: 'none', label: 'None' },
  { id: 'night', label: '10 PM - 7 AM' },
  { id: 'work', label: '9 AM - 5 PM' },
  { id: 'custom', label: 'Custom' },
];

export default function NotificationPreferencesScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();

  const [preferences, setPreferences] = useState({
    enabled: true,
    email: true,
    push: true,
    types: Object.fromEntries(NOTIFICATION_TYPES.map(t => [t.id, true])),
    quietHours: 'none',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.uid) return;
    try {
      const result = await FirebaseService.getUserProfile(user.uid);
      if (result.success && result.data?.notificationPreferences) {
        setPreferences(prev => ({ ...prev, ...result.data.notificationPreferences }));
      }
    } catch (e) {
      console.error('Failed to load preferences:', e);
    }
    setLoading(false);
  };

  const savePreferences = async (newPrefs) => {
    setPreferences(newPrefs);
    if (!user?.uid) return;
    try {
      await FirebaseService.updateUserProfile(user.uid, { notificationPreferences: newPrefs });
    } catch (e) {
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  const toggleType = (typeId) => {
    const newTypes = { ...preferences.types, [typeId]: !preferences.types[typeId] };
    savePreferences({ ...preferences, types: newTypes });
  };

  const toggleMaster = (key) => {
    savePreferences({ ...preferences, [key]: !preferences[key] });
  };

  const setQuietHours = (id) => {
    savePreferences({ ...preferences, quietHours: id });
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
        <Text style={{ color: theme.text, textAlign: 'center', marginTop: 100 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Notification Preferences</Text>
          <View style={{ width: 50 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Master Toggles */}
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Channels</Text>
          
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>🔔 All Notifications</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Master toggle for all notifications</Text>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={() => toggleMaster('enabled')}
              trackColor={{ false: theme.textSecondary + '30', true: theme.primary + '50' }}
              thumbColor={preferences.enabled ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>📧 Email Notifications</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Receive updates via email</Text>
            </View>
            <Switch
              value={preferences.email}
              onValueChange={() => toggleMaster('email')}
              trackColor={{ false: theme.textSecondary + '30', true: theme.primary + '50' }}
              thumbColor={preferences.email ? theme.primary : '#f4f3f4'}
              disabled={!preferences.enabled}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>📱 Push Notifications</Text>
              <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>Receive push notifications</Text>
            </View>
            <Switch
              value={preferences.push}
              onValueChange={() => toggleMaster('push')}
              trackColor={{ false: theme.textSecondary + '30', true: theme.primary + '50' }}
              thumbColor={preferences.push ? theme.primary : '#f4f3f4'}
              disabled={!preferences.enabled}
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Notification Types</Text>
          
          {NOTIFICATION_TYPES.map(type => (
            <View key={type.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{type.icon} {type.label}</Text>
                <Text style={[styles.rowDesc, { color: theme.textSecondary }]}>{type.description}</Text>
              </View>
              <Switch
                value={preferences.types[type.id]}
                onValueChange={() => toggleType(type.id)}
                trackColor={{ false: theme.textSecondary + '30', true: theme.primary + '50' }}
                thumbColor={preferences.types[type.id] ? theme.primary : '#f4f3f4'}
                disabled={!preferences.enabled}
              />
            </View>
          ))}
        </View>

        {/* Quiet Hours */}
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🌙 Quiet Hours</Text>
          <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>Pause notifications during specific times</Text>
          
          <View style={styles.quietOptions}>
            {QUIET_HOURS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.quietOption,
                  { borderColor: theme.textSecondary + '30', backgroundColor: preferences.quietHours === opt.id ? theme.primary : theme.background[0] }
                ]}
                onPress={() => setQuietHours(opt.id)}
              >
                <Text style={{ color: preferences.quietHours === opt.id ? '#fff' : theme.text }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { color: '#fff', fontSize: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  section: { borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  sectionDesc: { fontSize: 13, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  rowInfo: { flex: 1, marginRight: 12 },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowDesc: { fontSize: 13, marginTop: 2 },
  quietOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  quietOption: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderRadius: 20 },
});
