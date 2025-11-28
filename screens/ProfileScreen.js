import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert, Platform, Modal, Linking, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';

export default function ProfileScreen({ navigation }) {
  const { user, updateProfile, signOut, deleteAccount } = useAuth();
  const { theme } = useTheme();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingNotificationToggle, setPendingNotificationToggle] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({
    push: true,
    email: true,
    community: true,
  });
  const [pushPermissionStatus, setPushPermissionStatus] = useState('unknown');
  const [userBadges, setUserBadges] = useState([]);

  // Monthly Competition Badge System
  const MONTHLY_BADGES = [
    // Monthly Winners (Limited to top performers each month)
    { id: 'monthly_saver_king', name: 'Saver King', emoji: '👑', description: 'Top 5 savers this month', category: 'monthly', points: 500, limit: 5 },
    { id: 'monthly_tip_master', name: 'Tip Master', emoji: '🏆', description: 'Top 3 tip sharers this month', category: 'monthly', points: 400, limit: 3 },
    { id: 'monthly_streak_legend', name: 'Streak Legend', emoji: '🔥', description: 'Top 10 longest streaks this month', category: 'monthly', points: 300, limit: 10 },
    { id: 'monthly_goal_crusher', name: 'Goal Crusher', emoji: '🎯', description: 'Top 5 goal completers this month', category: 'monthly', points: 350, limit: 5 },
    { id: 'monthly_community_star', name: 'Community Star', emoji: '⭐', description: 'Most liked user this month', category: 'monthly', points: 450, limit: 1 },
    
    // Seasonal Badges (Quarterly competitions)
    { id: 'quarterly_champion', name: 'Quarterly Champion', emoji: '🥇', description: 'Top overall performer this quarter', category: 'seasonal', points: 1000, limit: 1 },
    { id: 'quarterly_consistency', name: 'Consistency Master', emoji: '📈', description: 'Top 3 most consistent users this quarter', category: 'seasonal', points: 750, limit: 3 },
  ];

  // Permanent Achievement Badges (Everyone can earn these)
  const ACHIEVEMENT_BADGES = [
    // Getting Started (Much harder requirements)
    { id: 'first_steps', name: 'First Steps', emoji: '👣', description: 'Add 3 cards and set up profile', category: 'starter', points: 150 },
    { id: 'money_tracker', name: 'Money Tracker', emoji: '📊', description: 'Log 100 transactions', category: 'starter', points: 300 },
    { id: 'goal_setter', name: 'Goal Setter', emoji: '🎯', description: 'Create and complete 5 savings goals', category: 'starter', points: 250 },
    { id: 'budget_boss', name: 'Budget Boss', emoji: '📋', description: 'Stay under budget for 6 months straight', category: 'starter', points: 400 },
    
    // Milestone Achievements (Much higher thresholds)
    { id: 'savings_milestone_1k', name: 'First Grand', emoji: '💰', description: 'Save £1,000 in one month', category: 'milestones', points: 500 },
    { id: 'savings_milestone_5k', name: 'Five Grand Club', emoji: '💎', description: 'Save £5,000 in 3 months', category: 'milestones', points: 1200 },
    { id: 'savings_milestone_10k', name: 'Ten Grand Master', emoji: '🏦', description: 'Save £10,000 in 6 months', category: 'milestones', points: 2500 },
    
    // Special Achievements (Harder to get)
    { id: 'early_bird', name: 'Early Bird', emoji: '🐦', description: 'Log transactions before 7am for 30 days', category: 'special', points: 200 },
    { id: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Log transactions after 11pm for 30 days', category: 'special', points: 200 },
    { id: 'weekend_warrior', name: 'Weekend Warrior', emoji: '🎉', description: 'Active every weekend for 3 months', category: 'special', points: 600 },
    { id: 'debt_destroyer', name: 'Debt Destroyer', emoji: '⚔️', description: 'Pay off £5,000+ in debt', category: 'special', points: 1000 },
    
    // Streaks (Much longer requirements)
    { id: 'week_warrior', name: 'Week Warrior', emoji: '📅', description: '30-day activity streak', category: 'streaks', points: 400 },
    { id: 'month_master', name: 'Month Master', emoji: '🗓️', description: '90-day activity streak', category: 'streaks', points: 1000 },
    
    // Community (Higher engagement needed)
    { id: 'helpful_hero', name: 'Helpful Hero', emoji: '🦸', description: 'Share 20 tips with 50+ total likes', category: 'community', points: 500 },
    { id: 'tip_titan', name: 'Tip Titan', emoji: '🏅', description: 'Share 50 tips with 200+ total likes', category: 'community', points: 1200 },
  ];

  // Combined badge system
  const BADGES = [...MONTHLY_BADGES, ...ACHIEVEMENT_BADGES];

  // Get user's highest badge
  const getUserHighestBadge = () => {
    if (userBadges.length === 0) return null;
    
    // Find the badge with highest points
    const badgeObjects = userBadges.map(badgeId => BADGES.find(b => b.id === badgeId)).filter(Boolean);
    if (badgeObjects.length === 0) return null;
    
    return badgeObjects.reduce((highest, current) => 
      current.points > highest.points ? current : highest
    );
  };

  // Calculate total points from earned badges
  const getTotalPoints = () => {
    if (userBadges.length === 0) return 0;
    
    const badgeObjects = userBadges.map(badgeId => BADGES.find(b => b.id === badgeId)).filter(Boolean);
    return badgeObjects.reduce((total, badge) => total + badge.points, 0);
  };

  // Load user badges from Firebase
  const loadUserBadges = async () => {
    try {
      if (!user?.uid) {
        console.log('No user ID available');
        return;
      }

      const result = await FirebaseService.getUserBadges(user.uid);
      if (result.success) {
        setUserBadges(result.data.earned);
        console.log('Loaded badges from Firebase:', result.data.earned);
      } else {
        console.error('Failed to load badges:', result.error);
        // Fallback to mock data if Firebase fails
        setUserBadges(['first_steps']);
      }
    } catch (error) {
      console.error('Error loading user badges:', error);
      // Fallback to mock data
      setUserBadges(['first_steps']);
    }
  };
  
  // Load profile data from Firebase on mount
  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.uid) {
        const result = await FirebaseService.getUserProfile(user.uid);
        if (result.success && result.data) {
          setName(result.data.name || '');
          setEmail(result.data.email || user.email || '');
          // Load notification settings
          if (result.data.notificationSettings) {
            setNotificationSettings(result.data.notificationSettings);
          }
        }
      }
    };
    
    loadProfileData();
    loadUserBadges();
  }, [user]);

  // Check push notification permission status on mount
  useEffect(() => {
    const checkPushPermission = async () => {
      const permissionResult = await NotificationService.requestPushPermissions();
      setPushPermissionStatus(permissionResult.status);
    };
    
    checkPushPermission();
  }, []);

  // Toggle notification setting and save to Firebase
  const toggleNotification = async (key) => {
    const isTurningOn = !notificationSettings[key];
    
    // If turning ON push notifications, show custom permission modal first
    if (key === 'push' && isTurningOn) {
      setPendingNotificationToggle(key);
      setShowPermissionModal(true);
      return; // Wait for user confirmation in modal
    }
    
    // For other settings or turning push OFF, proceed normally
    const newSettings = {
      ...notificationSettings,
      [key]: isTurningOn,
    };
    setNotificationSettings(newSettings);
    
    // Save to Firebase
    if (user?.uid) {
      await FirebaseService.updateUserProfile(user.uid, {
        notificationSettings: newSettings,
      });
    }
  };

  // Handle permission confirmation from custom modal
  const handlePermissionConfirm = async () => {
    setShowPermissionModal(false);
    
    try {
      const permissionResult = await NotificationService.requestPushPermissions();
      setPushPermissionStatus(permissionResult.status);
      
      if (permissionResult.granted) {
        // Permission granted, now toggle the setting
        const newSettings = {
          ...notificationSettings,
          [pendingNotificationToggle]: true,
        };
        setNotificationSettings(newSettings);
        
        // Save to Firebase
        if (user?.uid) {
          await FirebaseService.updateUserProfile(user.uid, {
            notificationSettings: newSettings,
          });
        }
      } else {
        // Permission denied, show message in notifications modal
        // The permission status will already be updated to show the denial
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
    
    setPendingNotificationToggle(null);
  };

  // Handle permission cancellation
  const handlePermissionCancel = () => {
    setShowPermissionModal(false);
    setPendingNotificationToggle(null);
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    // Validate inputs
    if (deletePassword.length < 6) {
      Alert.alert('Error', 'Please enter your correct password');
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE exactly as shown');
      return;
    }

    setIsDeleting(true);
    
    try {
      const result = await deleteAccount(deletePassword);
      
      if (result.success) {
        // Account deleted successfully - user will be logged out automatically
        Alert.alert(
          'Account Deleted',
          'Your account and all associated data have been permanently deleted.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeleteConfirmText('');
    }
  };

  const handleSave = async () => {
    try {
      // Update Firebase profile
      if (user?.uid) {
        const result = await FirebaseService.updateUserProfile(user.uid, {
          name,
          email
        });
        
        if (result.success) {
          // Update local auth context
          await updateProfile({
            name,
            email
          });
          setIsEditing(false);
          Alert.alert('Success', 'Profile updated successfully');
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    }
  };

  const handleSignOut = () => {
    console.log('handleSignOut called');
    setShowSignOutModal(true);
  };

  const performSignOut = async () => {
    console.log('performSignOut called');
    try {
      const result = await signOut();
      console.log('signOut result:', result);
      
      if (result.success) {
        // Force clear browser storage on web to prevent auto sign-in
        if (Platform.OS === 'web') {
          try {
            localStorage.clear();
            sessionStorage.clear();
            // Clear any Firebase persistence
            if (window.indexedDB) {
              const deleteReq = indexedDB.deleteDatabase('firebaseLocalStorageDb');
              deleteReq.onsuccess = () => console.log('Firebase storage cleared');
            }
          } catch (e) {
            console.log('Storage clear error:', e);
          }
        }
      } else {
        const errorMsg = result.error || 'Unable to sign out. Please try again.';
        if (Platform.OS === 'web') {
          alert('Sign Out Failed: ' + errorMsg);
        } else {
          Alert.alert('Sign Out Failed', errorMsg);
        }
      }
    } catch (error) {
      console.error('Sign out error:', error);
      const errorMsg = 'An unexpected error occurred. Please try again.';
      if (Platform.OS === 'web') {
        alert('Sign Out Failed: ' + errorMsg);
      } else {
        Alert.alert('Sign Out Failed', errorMsg);
      }
    }
  };

  return (
    <LinearGradient
      colors={theme.background}
      style={styles.container}
    >
      <LinearGradient
        colors={theme.gradient}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={[styles.profileSection, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
            {getUserHighestBadge() ? (
              <Text style={styles.avatarBadge}>{getUserHighestBadge().emoji}</Text>
            ) : (
              <Text style={styles.avatar}>👤</Text>
            )}
          </View>
          {getUserHighestBadge() && (
            <Text style={[styles.badgeName, { color: theme.text }]}>{getUserHighestBadge().name}</Text>
          )}
          <Text style={[styles.username, { color: theme.text }]}>
            @{user?.username || user?.profile?.username || `${(user?.name || 'User').split(' ')[0]}${Math.floor(Math.random() * 90) + 10}`}
          </Text>
          <Text style={[styles.joinDate, { color: theme.textSecondary }]}>
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}
          </Text>
        </View>

        {/* Points & Badges Section */}
        <View style={[styles.pointsSection, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🏆 Your Progress</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{getTotalPoints().toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>Total Points</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>{userBadges.length}</Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>Badges Earned</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.statNumber, { color: theme.primary }]}>#1</Text>
              <Text style={[styles.statLabel, { color: theme.text }]}>Global Rank</Text>
            </View>
          </View>

          {/* Points Breakdown */}
          {userBadges.length > 0 && (
            <View style={styles.pointsBreakdown}>
              <Text style={[styles.badgesTitle, { color: theme.text }]}>💰 Points Breakdown</Text>
              {userBadges.map((badgeId) => {
                const badge = BADGES.find(b => b.id === badgeId);
                if (!badge) return null;
                return (
                  <View key={badge.id} style={[styles.pointsBreakdownItem, { backgroundColor: theme.background[0] }]}>
                    <View style={styles.pointsBreakdownLeft}>
                      <Text style={styles.pointsBreakdownEmoji}>{badge.emoji}</Text>
                      <Text style={[styles.pointsBreakdownName, { color: theme.text }]}>{badge.name}</Text>
                    </View>
                    <Text style={[styles.pointsBreakdownPoints, { color: theme.primary }]}>+{badge.points}</Text>
                  </View>
                );
              })}
              <View style={[styles.pointsBreakdownTotal, { borderTopColor: theme.textSecondary + '30' }]}>
                <Text style={[styles.pointsBreakdownTotalLabel, { color: theme.text }]}>Total Points</Text>
                <Text style={[styles.pointsBreakdownTotalValue, { color: theme.primary }]}>{getTotalPoints().toLocaleString()}</Text>
              </View>
            </View>
          )}

          {/* Current Badges */}
          {userBadges.length > 0 && (
            <View style={styles.badgesContainer}>
              <Text style={[styles.badgesTitle, { color: theme.text }]}>🎖️ Your Badges</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
                {userBadges.map((badgeId) => {
                  const badge = BADGES.find(b => b.id === badgeId);
                  if (!badge) return null;
                  return (
                    <View key={badge.id} style={[styles.profileBadgeItem, { backgroundColor: theme.background[0] }]}>
                      <Text style={styles.profileBadgeEmoji}>{badge.emoji}</Text>
                      <Text style={[styles.profileBadgeName, { color: theme.text }]} numberOfLines={1}>{badge.name}</Text>
                      <Text style={[styles.profileBadgePoints, { color: theme.primary }]}>+{badge.points}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <Text style={styles.actionButtonText}>🏆 View Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: theme.background[0], borderWidth: 1, borderColor: theme.primary }]}
              onPress={() => navigation.navigate('CommunityTips')}
            >
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>💡 Share Tips</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: theme.cardBg }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }, !isEditing && styles.inputDisabled]}
              value={name}
              onChangeText={setName}
              editable={isEditing}
              placeholder="Enter your name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }, !isEditing && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

        </View>

        <View style={[styles.settingsSection, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.background[0] }]}
            onPress={() => navigation.navigate('Theme')}
          >
            <Text style={styles.settingIcon}>🎨</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingText, { color: theme.text }]}>Themes</Text>
              <Text style={[styles.settingArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.background[0] }]}
            onPress={() => setShowNotificationsModal(true)}
          >
            <Text style={styles.settingIcon}>🔔</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingText, { color: theme.text }]}>Notifications</Text>
              <Text style={[styles.settingArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.background[0] }]}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Text style={styles.settingIcon}>🔒</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingText, { color: theme.text }]}>Privacy & Security</Text>
              <Text style={[styles.settingArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.background[0] }]}
            onPress={() => setShowHelpModal(true)}
          >
            <Text style={styles.settingIcon}>❓</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingText, { color: theme.text }]}>Help & Support</Text>
              <Text style={[styles.settingArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>


          <TouchableOpacity 
            style={[styles.settingItem, { borderBottomColor: theme.background[0] }]}
            onPress={() => navigation.navigate('TermsOfService')}
          >
            <Text style={styles.settingIcon}>📄</Text>
            <View style={styles.settingContent}>
              <Text style={[styles.settingText, { color: theme.text }]}>Terms of Service</Text>
              <Text style={[styles.settingArrow, { color: theme.textSecondary }]}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>


        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={() => {
            setDeletePassword('');
            setDeleteConfirmText('');
            setShowDeleteModal(true);
          }}
        >
          <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.version, { color: theme.textSecondary }]}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Help & Support Modal */}
      <Modal visible={showHelpModal} animationType="fade" transparent onRequestClose={() => setShowHelpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>❓ Help & Support</Text>
            
            <TouchableOpacity 
              style={[styles.helpItem, { backgroundColor: theme.background[0] }]}
              onPress={() => Linking.openURL('mailto:spendflowapp@gmail.com')}
            >
              <Text style={styles.helpIcon}>📧</Text>
              <View>
                <Text style={[styles.helpLabel, { color: theme.textSecondary }]}>Email</Text>
                <Text style={[styles.helpValue, { color: theme.text }]}>spendflowapp@gmail.com</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.helpItem, { backgroundColor: theme.background[0] }]}
              onPress={() => Linking.openURL('https://spendflow.uk')}
            >
              <Text style={styles.helpIcon}>🌐</Text>
              <View>
                <Text style={[styles.helpLabel, { color: theme.textSecondary }]}>Website</Text>
                <Text style={[styles.helpValue, { color: theme.text }]}>spendflow.uk</Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.helpNote, { color: theme.textSecondary }]}>
              For bugs or feature requests, contact us anytime!
            </Text>

            <TouchableOpacity 
              style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowHelpModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotificationsModal} animationType="fade" transparent onRequestClose={() => setShowNotificationsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🔔 Notification Settings</Text>
            
            <TouchableOpacity 
              style={[styles.notificationItem, { backgroundColor: theme.background[0] }]}
              onPress={() => toggleNotification('push')}
            >
              <View style={styles.notificationLeft}>
                <Text style={styles.notificationIcon}>📱</Text>
                <View>
                  <Text style={[styles.notificationText, { color: theme.text }]}>Push Notifications</Text>
                  <Text style={[styles.permissionStatus, { color: theme.textSecondary }]}>
                    {pushPermissionStatus === 'granted' ? '✅ Device permission granted' : 
                     pushPermissionStatus === 'denied' ? '❌ Device permission denied' : 
                     pushPermissionStatus === 'requires_device' ? '⚠️ Requires physical device' :
                     '⏳ Checking permission...'}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, { backgroundColor: notificationSettings.push ? '#10b981' : '#9ca3af' }]}>
                <View style={[styles.toggleKnob, { alignSelf: notificationSettings.push ? 'flex-end' : 'flex-start' }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.notificationItem, { backgroundColor: theme.background[0] }]}
              onPress={() => toggleNotification('email')}
            >
              <View style={styles.notificationLeft}>
                <Text style={styles.notificationIcon}>📧</Text>
                <View>
                  <Text style={[styles.notificationText, { color: theme.text }]}>Email Notifications</Text>
                  <Text style={[styles.permissionStatus, { color: theme.textSecondary }]}>
                    {notificationSettings.email ? '✅ Email notifications enabled' : '❌ Email notifications disabled'}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, { backgroundColor: notificationSettings.email ? '#10b981' : '#9ca3af' }]}>
                <View style={[styles.toggleKnob, { alignSelf: notificationSettings.email ? 'flex-end' : 'flex-start' }]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.notificationItem, { backgroundColor: theme.background[0] }]}
              onPress={() => toggleNotification('community')}
            >
              <View style={styles.notificationLeft}>
                <Text style={styles.notificationIcon}>💬</Text>
                <View>
                  <Text style={[styles.notificationText, { color: theme.text }]}>Community Alerts</Text>
                  <Text style={[styles.permissionStatus, { color: theme.textSecondary }]}>
                    {notificationSettings.community ? '✅ Community alerts enabled' : '❌ Community alerts disabled'}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, { backgroundColor: notificationSettings.community ? '#10b981' : '#9ca3af' }]}>
                <View style={[styles.toggleKnob, { alignSelf: notificationSettings.community ? 'flex-end' : 'flex-start' }]} />
              </View>
            </TouchableOpacity>

            <Text style={[styles.helpNote, { color: theme.textSecondary }]}>
              Tap to toggle. Settings are saved automatically.
            </Text>

            <TouchableOpacity 
              style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]}
              onPress={() => setShowNotificationsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={() => setShowDeleteModal(false)}>
        {Platform.OS === 'web' ? (
          <View style={styles.modalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.cardBg }]}>
              <View style={[styles.deleteIconContainer, { backgroundColor: '#dc2626' + '15' }]}>
                <Text style={styles.deleteIcon}>⚠️</Text>
              </View>
              
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Account</Text>
              
              <Text style={[styles.deleteModalMessage, { color: theme.text }]}>
                This action cannot be undone
              </Text>
              
              <View style={[styles.deleteModalSection, { backgroundColor: theme.background[0] }]}>
                <Text style={[styles.deleteModalDetails, { color: theme.text }]}>
                  All your data will be permanently deleted:
                </Text>
                
                <View style={styles.deleteModalListContainer}>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Profile information</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• All cards and transactions</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Direct debits and savings</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Goals and charts</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Community tips and comments</Text>
                </View>
              </View>

              <Text style={[styles.deleteModalLabel, { color: theme.text }]}>Enter your password:</Text>
              <TextInput
                style={[styles.deleteModalInput, { 
                  backgroundColor: theme.background[0],
                  borderColor: theme.textSecondary + '30',
                  color: theme.text
                }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                value={deletePassword || ''}
                onChangeText={setDeletePassword}
                secureTextEntry
                autoComplete="off"
                autoCorrect={false}
                clearTextOnFocus={true}
              />

              <Text style={[styles.deleteModalLabel, { color: theme.text }]}>Type DELETE to confirm:</Text>
              <TextInput
                style={[styles.deleteModalInput, { 
                  backgroundColor: theme.background[0],
                  borderColor: theme.textSecondary + '30',
                  color: theme.text
                }]}
                placeholder="Type DELETE"
                placeholderTextColor={theme.textSecondary}
                value={deleteConfirmText || ''}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                clearTextOnFocus={true}
              />

              <View style={styles.deleteModalActions}>
                <TouchableOpacity 
                  style={[styles.deleteModalCancelBtn, { backgroundColor: theme.background[0] }]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  <Text style={[styles.deleteModalCancelBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.deleteModalConfirmBtn, { backgroundColor: '#dc2626', opacity: isDeleting ? 0.6 : 1 }]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteModalConfirmBtnText}>
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: theme.cardBg }]}>
              <View style={[styles.deleteIconContainer, { backgroundColor: '#dc2626' + '15' }]}>
                <Text style={styles.deleteIcon}>⚠️</Text>
              </View>
              
              <Text style={[styles.deleteModalTitle, { color: theme.text }]}>Delete Account</Text>
              
              <Text style={[styles.deleteModalMessage, { color: theme.text }]}>
                This action cannot be undone
              </Text>
              
              <View style={[styles.deleteModalSection, { backgroundColor: theme.background[0] }]}>
                <Text style={[styles.deleteModalDetails, { color: theme.text }]}>
                  All your data will be permanently deleted:
                </Text>
                
                <View style={styles.deleteModalListContainer}>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Profile information</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• All cards and transactions</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Direct debits and savings</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Goals and charts</Text>
                  <Text style={[styles.deleteModalListItem, { color: theme.textSecondary }]}>• Community tips and comments</Text>
                </View>
              </View>

              <Text style={[styles.deleteModalLabel, { color: theme.text }]}>Enter your password:</Text>
              <TextInput
                style={[styles.deleteModalInput, { 
                  backgroundColor: theme.background[0],
                  borderColor: theme.textSecondary + '30',
                  color: theme.text
                }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
                value={deletePassword || ''}
                onChangeText={setDeletePassword}
                secureTextEntry
                autoComplete="off"
                autoCorrect={false}
                clearTextOnFocus={true}
              />

              <Text style={[styles.deleteModalLabel, { color: theme.text }]}>Type DELETE to confirm:</Text>
              <TextInput
                style={[styles.deleteModalInput, { 
                  backgroundColor: theme.background[0],
                  borderColor: theme.textSecondary + '30',
                  color: theme.text
                }]}
                placeholder="Type DELETE"
                placeholderTextColor={theme.textSecondary}
                value={deleteConfirmText || ''}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                clearTextOnFocus={true}
              />

              <View style={styles.deleteModalActions}>
                <TouchableOpacity 
                  style={[styles.deleteModalCancelBtn, { backgroundColor: theme.background[0] }]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  <Text style={[styles.deleteModalCancelBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.deleteModalConfirmBtn, { backgroundColor: '#dc2626', opacity: isDeleting ? 0.6 : 1 }]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteModalConfirmBtnText}>
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal visible={showSignOutModal} animationType="fade" transparent onRequestClose={() => setShowSignOutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.signOutIconContainer, { backgroundColor: '#ef4444' + '15' }]}>
              <Text style={styles.signOutIcon}>👋</Text>
            </View>
            
            <Text style={[styles.modalTitle, { color: theme.text }]}>Sign Out</Text>
            
            <Text style={[styles.signOutMessage, { color: theme.text }]}>
              Are you sure you want to sign out of your account?
            </Text>
            
            <Text style={[styles.signOutNote, { color: theme.textSecondary }]}>
              You'll need to sign in again to access your financial data.
            </Text>

            <View style={styles.signOutActions}>
              <TouchableOpacity 
                style={[styles.signOutCancelBtn, { backgroundColor: theme.background[0] }]}
                onPress={() => setShowSignOutModal(false)}
              >
                <Text style={[styles.signOutCancelBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.signOutConfirmBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => {
                  setShowSignOutModal(false);
                  performSignOut();
                }}
              >
                <Text style={styles.signOutConfirmBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Permission Request Modal */}
      <Modal visible={showPermissionModal} animationType="fade" transparent onRequestClose={handlePermissionCancel}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>📱 Enable Push Notifications</Text>
            
            <View style={[styles.permissionIconContainer, { backgroundColor: theme.background[0] }]}>
              <Text style={styles.permissionIcon}>🔔</Text>
            </View>
            
            <Text style={[styles.permissionMessage, { color: theme.text }]}>
              Stay updated with your financial activity!
            </Text>
            
            <View style={[styles.permissionSection, { backgroundColor: theme.background[0] }]}>
              <Text style={[styles.permissionDetails, { color: theme.text }]}>
                We'll send you notifications for:
              </Text>
              
              <View style={styles.permissionListContainer}>
                <Text style={[styles.permissionListItem, { color: theme.textSecondary }]}>• Payment reminders and due dates</Text>
                <Text style={[styles.permissionListItem, { color: theme.textSecondary }]}>• Transaction alerts</Text>
                <Text style={[styles.permissionListItem, { color: theme.textSecondary }]}>• Goal achievements</Text>
                <Text style={[styles.permissionListItem, { color: theme.textSecondary }]}>• Community activity</Text>
                <Text style={[styles.permissionListItem, { color: theme.textSecondary }]}>• Security alerts</Text>
              </View>
            </View>

            <Text style={[styles.permissionNote, { color: theme.textSecondary }]}>
              You can disable these anytime in your settings.
            </Text>

            <View style={styles.permissionActions}>
              <TouchableOpacity 
                style={[styles.permissionCancelBtn, { backgroundColor: theme.background[0] }]}
                onPress={handlePermissionCancel}
              >
                <Text style={[styles.permissionCancelBtnText, { color: theme.text }]}>Not Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.permissionAllowBtn, { backgroundColor: theme.primary }]}
                onPress={handlePermissionConfirm}
              >
                <Text style={styles.permissionAllowBtnText}>Enable Notifications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    fontSize: 48,
  },
  avatarBadge: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.8,
  },
  joinDate: {
    fontSize: 14,
    color: '#718096',
  },
  
  // Points & Badges Section
  pointsSection: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Points Breakdown
  pointsBreakdown: {
    marginBottom: 20,
  },
  pointsBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pointsBreakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsBreakdownEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  pointsBreakdownName: {
    fontSize: 14,
    fontWeight: '500',
  },
  pointsBreakdownPoints: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pointsBreakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  pointsBreakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pointsBreakdownTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  badgesContainer: {
    marginBottom: 20,
  },
  badgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  badgesScroll: {
    marginBottom: 8,
  },
  profileBadgeItem: {
    width: 80,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  profileBadgeEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  profileBadgeName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  profileBadgePoints: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  formSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  inputGroup: {
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
    backgroundColor: '#ffffff',
  },
  inputDisabled: {
    backgroundColor: '#f7fafc',
    color: '#718096',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f7fafc',
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#1a202c',
  },
  settingArrow: {
    fontSize: 20,
    color: '#cbd5e0',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteAccountButton: {
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  version: {
    fontSize: 12,
    color: '#a0aec0',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  deleteModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  deleteModalScroll: {
    flex: 1,
  },
  deleteModalScrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  helpIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  helpLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  helpValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpNote: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
  modalCloseBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    minHeight: 60,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  notificationLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  permissionStatus: {
    fontSize: 11,
    lineHeight: 14,
  },
  notificationStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  // Delete modal styles
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  deleteIcon: {
    fontSize: 40,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#dc2626',
  },
  deleteModalSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  deleteModalDetails: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  deleteModalListContainer: {
    paddingLeft: 8,
  },
  deleteModalListItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  deleteModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  deleteModalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteModalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  deleteModalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Sign out modal styles
  signOutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  signOutIcon: {
    fontSize: 40,
  },
  signOutMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  signOutNote: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  signOutActions: {
    flexDirection: 'row',
    gap: 12,
  },
  signOutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  signOutConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Permission modal styles
  permissionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  permissionIcon: {
    fontSize: 40,
  },
  permissionMessage: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  permissionDetails: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  permissionListContainer: {
    paddingLeft: 8,
  },
  permissionListItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  permissionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  permissionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  permissionCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionAllowBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  permissionAllowBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
