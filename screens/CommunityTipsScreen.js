import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Platform, ActivityIndicator, KeyboardAvoidingView, RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';
import EmailService from '../services/EmailService';
import SavingsVerificationService from '../services/SavingsVerificationService';

const CATEGORIES = [
  { id: 'all', label: 'All Tips', emoji: '📚' },
  { id: 'budgeting', label: 'Budgeting', emoji: '📊' },
  { id: 'saving', label: 'Saving', emoji: '💰' },
  { id: 'investing', label: 'Investing', emoji: '📈' },
  { id: 'debt', label: 'Debt Free', emoji: '🎯' },
  { id: 'frugal', label: 'Frugal Living', emoji: '🏠' },
  { id: 'income', label: 'Extra Income', emoji: '💼' },
];

export default function CommunityTipsScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTip, setNewTip] = useState({ title: '', content: '', category: 'saving', savedAmount: '' });
  
  // New features state
  const [bookmarkedTips, setBookmarkedTips] = useState([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedTip, setSelectedTip] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [myUsername, setMyUsername] = useState(user.username || user.profile?.username || '');
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, authorName }
  const [expandedReplies, setExpandedReplies] = useState(new Set()); // Track which comments have expanded replies
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tipToDelete, setTipToDelete] = useState(null);
  const [userBadges, setUserBadges] = useState({}); // Store badges for each user

  useEffect(() => { 
    loadTips(); 
    loadBookmarks();
    ensureUsername();
  }, []);

  // Badge definitions (same as leaderboard)
  const BADGES = [
    // Getting Started
    { id: 'first_steps', name: 'First Steps', emoji: '👣', description: 'Add your first card', category: 'starter', points: 50 },
    { id: 'money_tracker', name: 'Money Tracker', emoji: '📊', description: 'Log 10 transactions', category: 'starter', points: 75 },
    { id: 'goal_setter', name: 'Goal Setter', emoji: '🎯', description: 'Create your first savings goal', category: 'starter', points: 50 },
    { id: 'budget_boss', name: 'Budget Boss', emoji: '📋', description: 'Set up your first budget', category: 'starter', points: 75 },
    
    // Savings Milestones
    { id: 'penny_pincher', name: 'Penny Pincher', emoji: '🪙', description: 'Save your first £100', category: 'savings', points: 100 },
    { id: 'savings_star', name: 'Savings Star', emoji: '⭐', description: 'Save £500 total', category: 'savings', points: 200 },
    { id: 'money_master', name: 'Money Master', emoji: '💎', description: 'Save £1,000 total', category: 'savings', points: 350 },
    { id: 'wealth_builder', name: 'Wealth Builder', emoji: '🏦', description: 'Save £5,000 total', category: 'savings', points: 750 },
    { id: 'financial_freedom', name: 'Financial Freedom', emoji: '🦅', description: 'Save £10,000 total', category: 'savings', points: 1500 },
    
    // Goals
    { id: 'goal_crusher', name: 'Goal Crusher', emoji: '💪', description: 'Complete 1 savings goal', category: 'goals', points: 100 },
    { id: 'goal_machine', name: 'Goal Machine', emoji: '🤖', description: 'Complete 5 savings goals', category: 'goals', points: 300 },
    { id: 'dream_achiever', name: 'Dream Achiever', emoji: '🌟', description: 'Complete 10 savings goals', category: 'goals', points: 750 },
    
    // Streaks
    { id: 'week_warrior', name: 'Week Warrior', emoji: '📅', description: '7-day activity streak', category: 'streaks', points: 100 },
    { id: 'month_master', name: 'Month Master', emoji: '🗓️', description: '30-day activity streak', category: 'streaks', points: 400 },
    { id: 'streak_legend', name: 'Streak Legend', emoji: '🔥', description: '100-day activity streak', category: 'streaks', points: 1000 },
    
    // Community
    { id: 'helpful_hero', name: 'Helpful Hero', emoji: '🦸', description: 'Share 5 tips', category: 'community', points: 100 },
    { id: 'tip_titan', name: 'Tip Titan', emoji: '🏅', description: 'Share 25 tips', category: 'community', points: 400 },
    { id: 'community_champion', name: 'Community Champion', emoji: '👑', description: 'Get 100 total likes', category: 'community', points: 500 },
    { id: 'viral_voice', name: 'Viral Voice', emoji: '📣', description: 'Get 50 likes on a single tip', category: 'community', points: 750 },
    
    // Budgeting
    { id: 'budget_keeper', name: 'Budget Keeper', emoji: '🎯', description: 'Stay under budget for 1 month', category: 'budgeting', points: 150 },
    { id: 'budget_pro', name: 'Budget Pro', emoji: '📈', description: 'Stay under budget for 3 months', category: 'budgeting', points: 400 },
    { id: 'budget_legend', name: 'Budget Legend', emoji: '🏆', description: 'Stay under budget for 6 months', category: 'budgeting', points: 800 },
    
    // Special
    { id: 'early_bird', name: 'Early Bird', emoji: '🐦', description: 'Log a transaction before 7am', category: 'special', points: 50 },
    { id: 'night_owl', name: 'Night Owl', emoji: '🦉', description: 'Log a transaction after 11pm', category: 'special', points: 50 },
    { id: 'weekend_warrior', name: 'Weekend Warrior', emoji: '🎉', description: 'Log transactions every weekend for a month', category: 'special', points: 200 },
    { id: 'debt_destroyer', name: 'Debt Destroyer', emoji: '⚔️', description: 'Pay off a credit card completely', category: 'special', points: 500 },
    { id: 'direct_debit_master', name: 'DD Master', emoji: '🔄', description: 'Set up 5 direct debits', category: 'special', points: 100 },
  ];

  // Get user's highest badge
  const getUserHighestBadge = (userId) => {
    const badges = userBadges[userId] || [];
    if (badges.length === 0) return null;
    
    // Find the badge with highest points
    const badgeObjects = badges.map(badgeId => BADGES.find(b => b.id === badgeId)).filter(Boolean);
    if (badgeObjects.length === 0) return null;
    
    return badgeObjects.reduce((highest, current) => 
      current.points > highest.points ? current : highest
    );
  };

  // Ensure user has a username for community features
  const ensureUsername = async () => {
    if (!myUsername && !user.username && !user.profile?.username) {
      // Generate username based on user's name
      const fullName = user.name || user.profile?.name || '';
      // Extract first name (everything before first space)
      const firstName = fullName.trim().split(' ')[0];
      const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '');
      const capitalizedName = cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1).toLowerCase();
      
      // Generate 2-digit number (10-99)
      const randomDigits = Math.floor(Math.random() * 90) + 10;
      
      // If no valid first name, use fallback
      let newUsername;
      if (!capitalizedName || capitalizedName.length < 2) {
        const fallbackNames = ['User', 'Saver', 'Budgeter', 'Planner', 'Investor'];
        const fallbackName = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
        newUsername = `${fallbackName}${randomDigits}`;
      } else {
        newUsername = `${capitalizedName}${randomDigits}`;
      }
      
      try {
        await FirebaseService.updateUserProfile(user.uid, { username: newUsername });
        setMyUsername(newUsername);
        // Username generated successfully
      } catch (error) {
        console.error('Error setting username:', error);
      }
    }
  };

  const loadTips = async () => {
    try {
      setLoading(true);
      const result = await FirebaseService.getCommunityTips();
      if (result.success) {
        setTips(result.data);
        // Load badges for all unique users in tips
        const uniqueUserIds = [...new Set(result.data.map(tip => tip.authorId))];
        loadUserBadges(uniqueUserIds);
      }
    } catch (error) {
      console.error('Error loading tips:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load badges for multiple users
  const loadUserBadges = async (userIds) => {
    try {
      const badgePromises = userIds.map(async (userId) => {
        // Use consistent badges based on user ID to prevent random changes
        const userSeed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const mockBadges = [];
        
        // Everyone gets starter badge
        mockBadges.push('first_steps');
        
        // Consistent achievement badge based on user seed (1-2 max per user)
        const achievementSeed = userSeed % 100;
        if (achievementSeed > 80) {
          mockBadges.push('savings_milestone_1k'); // 20% have savings milestone
        } else if (achievementSeed > 60) {
          mockBadges.push('helpful_hero'); // 20% have community badge
        } else if (achievementSeed > 40) {
          mockBadges.push('week_warrior'); // 20% have streak badge
        }
        // 40% only have first_steps
        
        // Monthly competition badge - EXTREMELY LIMITED and consistent
        const monthlySeed = (userSeed * 5) % 100;
        if (monthlySeed > 95) {
          // Only 5% of users have monthly badges (true top performers)
          const monthlyBadges = ['monthly_saver_king', 'monthly_tip_master', 'monthly_community_star'];
          const monthlyIndex = userSeed % monthlyBadges.length;
          mockBadges.push(monthlyBadges[monthlyIndex]);
        }
        
        return { userId, badges: mockBadges };
      });
      
      const results = await Promise.all(badgePromises);
      const badgesMap = {};
      results.forEach(({ userId, badges }) => {
        badgesMap[userId] = badges;
      });
      
      setUserBadges(badgesMap);
    } catch (error) {
      console.error('Error loading user badges:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTips();
    setRefreshing(false);
  };

  const handleSubmitTip = async () => {
    if (!newTip.title.trim() || !newTip.content.trim()) return;
    
    // Validate savings amount to prevent gaming
    let validatedSavings = null;
    if (newTip.savedAmount) {
      const amount = parseFloat(newTip.savedAmount);
      if (amount > 10000) {
        Alert.alert(
          'Savings Amount Too High',
          'For leaderboard fairness, please enter realistic savings amounts under £10,000. You can still share your tip without the amount!',
          [
            { text: 'Remove Amount', onPress: () => setNewTip({...newTip, savedAmount: ''}) },
            { text: 'Edit Amount', style: 'cancel' }
          ]
        );
        setSubmitting(false);
        return;
      }
      validatedSavings = amount;
    }
    
    setSubmitting(true);
    try {
      const tipData = {
        title: newTip.title.trim(),
        content: newTip.content.trim(),
        category: newTip.category,
        savedAmount: validatedSavings,
        authorId: user.uid,
        authorName: myUsername || 'Anonymous', // Use username for privacy
        likes: [], likesCount: 0, createdAt: new Date(),
      };
      const result = await FirebaseService.addCommunityTip(tipData);
      if (result.success) {
        // Auto-verify savings if amount is provided
        if (validatedSavings) {
          try {
            const verification = await SavingsVerificationService.verifySavingsAgainstSpending(
              user.uid, 
              validatedSavings, 
              newTip.category
            );
            
            if (verification.confidence < 50) {
              Alert.alert(
                'Savings Verification',
                `${verification.reason}\n\nYour tip has been posted but may be flagged for review.`,
                [{ text: 'OK' }]
              );
            }
          } catch (error) {
            console.log('Verification failed, but tip posted successfully');
          }
        }
        
        setShowAddModal(false);
        setNewTip({ title: '', content: '', category: 'saving', savedAmount: '' });
        loadTips();
      }
    } catch (error) {
      console.error('Error submitting tip:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeTip = async (tipId) => {
    try {
      await FirebaseService.toggleTipLike(tipId, user.uid);
      setTips(prev => prev.map(tip => {
        if (tip.id === tipId) {
          const hasLiked = tip.likes?.includes(user.uid);
          const newLikeState = !hasLiked;
          
          // Send notification when liking (not unliking)
          if (newLikeState && tip.authorId !== user.uid) {
            // Push notification
            NotificationService.sendNotification(
              tip.authorId,
              `${myUsername} liked your tip`,
              `"${tip.title}"`
            );
            // Email notification
            FirebaseService.getUserProfile(tip.authorId).then(tipAuthor => {
              if (tipAuthor.success && tipAuthor.data?.email) {
                EmailService.sendTipLikedNotification(
                  tipAuthor.data.email,
                  myUsername,
                  tip.title
                );
              }
            });
          }
          
          return {
            ...tip,
            likes: hasLiked ? tip.likes.filter(id => id !== user.uid) : [...(tip.likes || []), user.uid],
            likesCount: hasLiked ? (tip.likesCount || 1) - 1 : (tip.likesCount || 0) + 1,
          };
        }
        return tip;
      }));
    } catch (error) {
      console.error('Error liking tip:', error);
    }
  };

  // Bookmark functions
  const loadBookmarks = async () => {
    try {
      const result = await FirebaseService.getUserBookmarks(user.uid);
      if (result.success) setBookmarkedTips(result.data);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const handleBookmark = async (tipId) => {
    const isBookmarked = bookmarkedTips.includes(tipId);
    try {
      await FirebaseService.toggleBookmark(user.uid, tipId);
      setBookmarkedTips(prev => 
        isBookmarked ? prev.filter(id => id !== tipId) : [...prev, tipId]
      );
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  // Comments functions
  const openComments = async (tip) => {
    setSelectedTip(tip);
    setShowCommentsModal(true);
    setLoadingComments(true);
    setReplyingTo(null); // Reset reply state
    setExpandedReplies(new Set()); // Reset expanded replies
    try {
      const result = await FirebaseService.getTipComments(tip.id);
      if (result.success) setComments(result.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTip) return;
    try {
      const commentData = {
        text: newComment.trim(), // Keep comment as user typed it
        authorId: user.uid,
        authorName: myUsername || 'Anonymous', // Use username for privacy
        createdAt: new Date(),
        replyTo: replyingTo?.commentId || null, // Add reply reference
        replyToAuthor: replyingTo?.authorName || null,
      };
      await FirebaseService.addTipComment(selectedTip.id, commentData);
      setComments(prev => [...prev, { ...commentData, id: Date.now().toString() }]);
      setNewComment('');
      
      // Send notifications (push + email)
      if (replyingTo) {
        // Notify the person being replied to
        const originalComment = comments.find(c => c.id === replyingTo.commentId);
        if (originalComment && originalComment.authorId !== user.uid) {
          // Push notification
          NotificationService.sendNotification(
            originalComment.authorId,
            `${myUsername} replied to your comment`,
            `"${commentData.text}"`
          );
          // Email notification
          const originalCommentAuthor = await FirebaseService.getUserProfile(originalComment.authorId);
          if (originalCommentAuthor.success && originalCommentAuthor.data?.email) {
            EmailService.sendReplyNotification(
              originalCommentAuthor.data.email,
              myUsername,
              originalComment.text,
              commentData.text
            );
          }
        }
      } else if (selectedTip.authorId !== user.uid) {
        // Notify the tip creator of new comment
        // Push notification
        NotificationService.sendNotification(
          selectedTip.authorId,
          `${myUsername} commented on your tip`,
          `"${commentData.text}"`
        );
        // Email notification
        const tipAuthor = await FirebaseService.getUserProfile(selectedTip.authorId);
        if (tipAuthor.success && tipAuthor.data?.email) {
          EmailService.sendTipCommentNotification(
            tipAuthor.data.email,
            myUsername,
            selectedTip.title,
            commentData.text
          );
        }
      }
      
      setReplyingTo(null); // Clear reply state
      // Update comment count on tip
      setTips(prev => prev.map(t => 
        t.id === selectedTip.id ? { ...t, commentsCount: (t.commentsCount || 0) + 1 } : t
      ));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleReply = (comment) => {
    setReplyingTo({ commentId: comment.id, authorName: comment.authorName });
    setNewComment(''); // Don't pre-fill, let user type naturally
  };

  // Toggle reply expansion for a comment
  const toggleReplies = (commentId) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  // Organize comments into threads (main comments and their replies)
  const organizeComments = (comments) => {
    const mainComments = comments.filter(comment => !comment.replyTo);
    const replies = comments.filter(comment => comment.replyTo);
    
    return mainComments.map(mainComment => ({
      ...mainComment,
      replies: replies.filter(reply => reply.replyTo === mainComment.id)
    }));
  };

  // Delete tip function - opens custom confirmation modal
  const handleDeleteTip = (tipId) => {
    setTipToDelete(tipId);
    setShowDeleteModal(true);
  };

  const confirmDeleteTip = async () => {
    if (tipToDelete) {
      await deleteTip(tipToDelete);
      setShowDeleteModal(false);
      setTipToDelete(null);
    }
  };

  const cancelDeleteTip = () => {
    setShowDeleteModal(false);
    setTipToDelete(null);
  };

  const deleteTip = async (tipId) => {
    try {
      await FirebaseService.deleteTip(tipId);
      setTips(prev => prev.filter(tip => tip.id !== tipId));
    } catch (error) {
      console.error('Error deleting tip:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete tip. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to delete tip. Please try again.');
      }
    }
  };

  // Report functions
  const openReport = (tip) => {
    setSelectedTip(tip);
    setShowReportModal(true);
    setReportReason('');
  };

  const handleReport = async () => {
    if (!reportReason.trim() || !selectedTip) return;
    try {
      await FirebaseService.reportTip(selectedTip.id, user.uid, reportReason);
      setShowReportModal(false);
      setReportReason('');
      if (Platform.OS === 'web') {
        window.alert('Report Submitted - Thank you for helping keep our community safe.');
      } else {
        Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
      }
    } catch (error) {
      console.error('Error reporting tip:', error);
    }
  };

  const handlePeerVerification = async (tip) => {
    try {
      const result = await SavingsVerificationService.initiatePeerVerification(
        tip.authorId,
        tip.id,
        tip.savedAmount
      );
      
      if (result.success) {
        if (Platform.OS === 'web') {
          window.alert('Verification Request Sent - The community will review this savings claim.');
        } else {
          Alert.alert(
            'Verification Request Sent',
            'Your verification request has been submitted. The community will review this savings claim.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error initiating peer verification:', error);
    }
  };

  const filteredTips = selectedCategory === 'all' ? tips : tips.filter(tip => tip.category === selectedCategory);
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    const diffDays = Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const getCategoryEmoji = (category) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat ? cat.emoji : '💡';
  };

  const getVerificationBadge = (amount) => {
    if (amount >= 5000) return '⚠️ Unverified';
    if (amount >= 2000) return '❓ Pending';
    if (amount >= 1000) return '🔍 Review';
    return '✅ Likely';
  };

  const getVerificationColor = (amount) => {
    if (amount >= 5000) return '#ef4444'; // Red
    if (amount >= 2000) return '#f59e0b'; // Orange
    if (amount >= 1000) return '#3b82f6'; // Blue
    return '#10b981'; // Green
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Community Tips</Text>
            <Text style={styles.headerSub}>Share & Learn Together</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.backBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={[styles.catContainer, { backgroundColor: theme.cardBg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.id} style={[styles.catChip, { backgroundColor: theme.background[0] }, selectedCategory === cat.id && { backgroundColor: theme.primary }]} onPress={() => setSelectedCategory(cat.id)}>
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[styles.catLabel, { color: theme.text }, selectedCategory === cat.id && { color: '#fff' }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView style={styles.tipsList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={[styles.banner, { backgroundColor: theme.primary + '15' }]}>
            <Text style={styles.bannerEmoji}>💡</Text>
            <View><Text style={[styles.bannerTitle, { color: theme.text }]}>Share Your Journey!</Text><Text style={[styles.bannerText, { color: theme.textSecondary }]}>Your tips could help someone achieve their goals</Text></View>
          </View>
          {filteredTips.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyEmoji}>📝</Text><Text style={[styles.emptyTitle, { color: theme.text }]}>No tips yet</Text><Text style={[styles.emptyText, { color: theme.textSecondary }]}>Be the first to share!</Text></View>
          ) : (
            filteredTips.map((tip) => (
              <View key={tip.id} style={[styles.tipCard, { backgroundColor: theme.cardBg }]}>
                <View style={styles.tipHeader}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '30' }]}>
                    {getUserHighestBadge(tip.authorId) ? (
                      <Text style={styles.avatarBadge}>{getUserHighestBadge(tip.authorId).emoji}</Text>
                    ) : (
                      <Text style={styles.avatarText}>{(tip.authorName || 'A')[0].toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.tipInfo}>
                    <View style={styles.authorRow}>
                      <Text style={[styles.authorName, { color: theme.text }]}>{tip.authorName}</Text>
                      {getUserHighestBadge(tip.authorId) && (
                        <View style={[styles.userBadge, { backgroundColor: theme.primary + '15' }]}>
                          <Text style={[styles.userBadgeText, { color: theme.primary }]}>{getUserHighestBadge(tip.authorId).name}</Text>
                        </View>
                      )}
                      {tip.authorId === user.uid && <Text style={[styles.myTipBadge, { backgroundColor: theme.primary + '20', color: theme.primary }]}>You</Text>}
                    </View>
                    <Text style={[styles.tipDate, { color: theme.textSecondary }]}>{formatDate(tip.createdAt)} • {getCategoryEmoji(tip.category)}</Text>
                  </View>
                  {tip.authorId !== user.uid && (
                    <TouchableOpacity onPress={() => openReport(tip)} style={styles.reportBtn}>
                      <Text style={{ color: theme.textSecondary, fontSize: 16 }}>⚠️</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={[styles.tipTitle, { color: theme.text }]}>{tip.title}</Text>
                <Text style={[styles.tipContent, { color: theme.textSecondary }]}>{tip.content}</Text>
                {tip.savedAmount && (
                  <View style={styles.savingsRow}>
                    <View style={[styles.savedBadge, { backgroundColor: '#10b981' + '20' }]}>
                      <Text style={styles.savedText}>💰 Saved £{tip.savedAmount.toLocaleString()}</Text>
                    </View>
                    {tip.savedAmount > 500 && (
                      <View style={[styles.verificationBadge, { backgroundColor: getVerificationColor(tip.savedAmount) + '20' }]}>
                        <Text style={[styles.verificationText, { color: getVerificationColor(tip.savedAmount) }]}>
                          {getVerificationBadge(tip.savedAmount)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.tipActions}>
                  {tip.authorId === user.uid ? (
                    // Creator actions: Comments and Delete
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.background[0] }]} onPress={() => openComments(tip)}>
                        <Text>💬</Text>
                        <Text style={[styles.actionCount, { color: theme.text }]}>{tip.commentsCount || 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' + '20' }]} onPress={() => handleDeleteTip(tip.id)}>
                        <Text>🗑️</Text>
                        <Text style={[styles.deleteText, { color: '#ef4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // Regular user actions: Like, Comment, Bookmark
                    <>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.background[0] }]} onPress={() => handleLikeTip(tip.id)}>
                        <Text>{tip.likes?.includes(user.uid) ? '❤️' : '🤍'}</Text>
                        <Text style={[styles.actionCount, { color: theme.text }]}>{tip.likesCount || 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.background[0] }]} onPress={() => openComments(tip)}>
                        <Text>💬</Text>
                        <Text style={[styles.actionCount, { color: theme.text }]}>{tip.commentsCount || 0}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: bookmarkedTips.includes(tip.id) ? theme.primary + '30' : theme.background[0] }]} onPress={() => handleBookmark(tip.id)}>
                        <Text>{bookmarkedTips.includes(tip.id) ? '🔖' : '📑'}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Share Your Tip</Text><TouchableOpacity onPress={() => setShowAddModal(false)}><Text style={{ fontSize: 24, color: theme.textSecondary }}>✕</Text></TouchableOpacity></View>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                  <TouchableOpacity key={cat.id} style={[styles.catChip, { backgroundColor: theme.background[0] }, newTip.category === cat.id && { backgroundColor: theme.primary }]} onPress={() => setNewTip({ ...newTip, category: cat.id })}>
                    <Text>{cat.emoji}</Text><Text style={{ color: newTip.category === cat.id ? '#fff' : theme.text, marginLeft: 4 }}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Title *</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]} placeholder="Your tip title" placeholderTextColor={theme.textSecondary} value={newTip.title} onChangeText={(t) => setNewTip({ ...newTip, title: t })} autoCapitalize="words" />
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Your Tip *</Text>
              <TextInput style={[styles.textArea, { backgroundColor: theme.background[0], color: theme.text }]} placeholder="Share your experience..." placeholderTextColor={theme.textSecondary} value={newTip.content} onChangeText={(t) => setNewTip({ ...newTip, content: t })} multiline numberOfLines={5} textAlignVertical="top" autoCapitalize="sentences" />
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Amount Saved (Optional)</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.background[0], color: theme.text }]} placeholder="£0" placeholderTextColor={theme.textSecondary} value={newTip.savedAmount} onChangeText={(t) => setNewTip({ ...newTip, savedAmount: t.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.primary }, (!newTip.title || !newTip.content) && { opacity: 0.5 }]} onPress={handleSubmitTip} disabled={!newTip.title || !newTip.content || submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Share Tip</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showCommentsModal} animationType="slide" transparent onRequestClose={() => setShowCommentsModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.commentsModalContainer}>
            <View style={[styles.commentsModalContent, { backgroundColor: theme.cardBg }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Comments</Text>
                <TouchableOpacity onPress={() => setShowCommentsModal(false)}><Text style={{ fontSize: 24, color: theme.textSecondary }}>✕</Text></TouchableOpacity>
              </View>
              <ScrollView style={styles.commentsBody} contentContainerStyle={{ paddingBottom: 20 }}>
                {loadingComments ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
                ) : comments.length === 0 ? (
                <Text style={[styles.noComments, { color: theme.textSecondary }]}>No comments yet. Be the first to comment!</Text>
              ) : (
                organizeComments(comments).map((comment, idx) => (
                  <View key={comment.id || idx}>
                    {/* Main Comment */}
                    <View style={[styles.commentItem, { borderBottomColor: theme.background[0] }]}>
                      <View style={[styles.commentAvatar, { backgroundColor: theme.primary + '30' }]}>
                        <Text style={styles.commentAvatarText}>{(comment.authorName || 'A')[0].toUpperCase()}</Text>
                      </View>
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentAuthor, { color: theme.text }]}>
                            {comment.authorName}
                            {comment.authorId === selectedTip?.authorId && <Text style={[styles.creatorBadge, { color: theme.primary }]}> • Creator</Text>}
                          </Text>
                          <Text style={[styles.commentDate, { color: theme.textSecondary }]}>{formatDate(comment.createdAt)}</Text>
                        </View>
                        <Text style={[styles.commentText, { color: theme.text }]}>{comment.text}</Text>
                        
                        <View style={styles.commentActions}>
                          <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(comment)}>
                            <Text style={[styles.replyBtnText, { color: theme.textSecondary }]}>Reply</Text>
                          </TouchableOpacity>
                          
                          {selectedTip?.savedAmount > 1000 && (
                            <TouchableOpacity 
                              style={styles.verifyBtn} 
                              onPress={() => handlePeerVerification(selectedTip)}
                            >
                              <Text style={[styles.verifyBtnText, { color: theme.primary }]}>Verify Savings</Text>
                            </TouchableOpacity>
                          )}
                          
                          {comment.replies && comment.replies.length > 0 && (
                            <TouchableOpacity 
                              style={styles.viewRepliesBtn} 
                              onPress={() => toggleReplies(comment.id)}
                            >
                              <Text style={[styles.viewRepliesText, { color: theme.primary }]}>
                                {expandedReplies.has(comment.id) 
                                  ? `Hide ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                                  : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`
                                }
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Replies (if expanded) */}
                    {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
                      <View style={styles.repliesContainer}>
                        {comment.replies.map((reply, replyIdx) => (
                          <View key={reply.id || replyIdx} style={[styles.replyItem, { borderBottomColor: theme.background[0] }]}>
                            <View style={styles.replyConnector} />
                            <View style={[styles.commentAvatar, styles.replyAvatar, { backgroundColor: theme.primary + '20' }]}>
                              <Text style={[styles.commentAvatarText, { fontSize: 12 }]}>{(reply.authorName || 'A')[0].toUpperCase()}</Text>
                            </View>
                            <View style={styles.commentContent}>
                              <View style={styles.commentHeader}>
                                <Text style={[styles.commentAuthor, { color: theme.text }]}>
                                  {reply.authorName}
                                  {reply.authorId === selectedTip?.authorId && <Text style={[styles.creatorBadge, { color: theme.primary }]}> • Creator</Text>}
                                </Text>
                                <Text style={[styles.commentDate, { color: theme.textSecondary }]}>{formatDate(reply.createdAt)}</Text>
                              </View>
                              <Text style={[styles.commentText, { color: theme.text }]}>{reply.text}</Text>
                              <TouchableOpacity style={styles.replyBtn} onPress={() => handleReply(comment)}>
                                <Text style={[styles.replyBtnText, { color: theme.textSecondary }]}>Reply</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}  
              </ScrollView>
              {replyingTo && (
                <View style={[styles.replyingToBar, { backgroundColor: theme.background[0] }]}>
                  <Text style={[styles.replyingToText, { color: theme.textSecondary }]}>
                    Replying to @{replyingTo.authorName}
                  </Text>
                  <TouchableOpacity onPress={() => { setReplyingTo(null); setNewComment(''); }}>
                    <Text style={[styles.cancelReply, { color: theme.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={[styles.commentInputContainer, { borderTopColor: theme.background[0], backgroundColor: theme.cardBg }]}>
                <TextInput 
                  style={[styles.commentInput, { backgroundColor: theme.background[0], color: theme.text }]} 
                  placeholder={replyingTo ? `Reply to @${replyingTo.authorName}...` : "Write a comment..."} 
                  placeholderTextColor={theme.textSecondary} 
                  value={newComment} 
                  onChangeText={setNewComment} 
                  multiline 
                  maxLength={500}
                  autoCapitalize="sentences"
                />
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: newComment.trim() ? 1 : 0.5 }]} onPress={handleAddComment} disabled={!newComment.trim()}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {replyingTo ? 'Reply' : 'Send'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} animationType="fade" transparent onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.reportOverlay}>
          <View style={[styles.reportContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.reportTitle, { color: theme.text }]}>⚠️ Report Tip</Text>
            <Text style={[styles.reportDesc, { color: theme.textSecondary }]}>Help us keep the community safe. Why are you reporting this tip?</Text>
            <View style={styles.reportOptions}>
              {['Inappropriate content', 'Spam or misleading', 'Harmful advice', 'Other'].map((reason) => (
                <TouchableOpacity key={reason} style={[styles.reportOption, { backgroundColor: theme.background[0], borderColor: reportReason === reason ? theme.primary : 'transparent' }]} onPress={() => setReportReason(reason)}>
                  <Text style={[styles.reportOptionText, { color: reportReason === reason ? theme.primary : theme.text }]}>{reason}</Text>
                  {reportReason === reason && <Text>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.reportBtns}>
              <TouchableOpacity style={[styles.reportCancelBtn, { backgroundColor: theme.background[0] }]} onPress={() => setShowReportModal(false)}>
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reportSubmitBtn, { backgroundColor: '#ef4444', opacity: reportReason ? 1 : 0.5 }]} onPress={handleReport} disabled={!reportReason}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={cancelDeleteTip}>
        <View style={styles.reportOverlay}>
          <View style={[styles.reportContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.reportTitle, { color: theme.text }]}>🗑️ Delete Tip</Text>
            <Text style={[styles.reportDesc, { color: theme.textSecondary }]}>
              Are you sure you want to delete this tip? This action cannot be undone.
            </Text>
            <View style={styles.reportBtns}>
              <TouchableOpacity 
                style={[styles.reportCancelBtn, { backgroundColor: theme.background[0] }]} 
                onPress={cancelDeleteTip}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.reportSubmitBtn, { backgroundColor: '#ef4444' }]} 
                onPress={confirmDeleteTip}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => setShowAddModal(true)}><Text style={{ fontSize: 24 }}>✍️</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'web' ? 20 : 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  catContainer: { paddingVertical: 12 },
  catScroll: { paddingHorizontal: 16 },
  catChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  catEmoji: { fontSize: 14, marginRight: 6 },
  catLabel: { fontSize: 13, fontWeight: '500' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tipsList: { flex: 1, paddingHorizontal: 16 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 16, marginBottom: 8 },
  bannerEmoji: { fontSize: 32, marginRight: 12 },
  bannerTitle: { fontSize: 16, fontWeight: '600' },
  bannerText: { fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14 },
  tipCard: { padding: 16, borderRadius: 16, marginTop: 12 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#667eea' },
  avatarBadge: { fontSize: 28, fontWeight: 'bold' },
  tipInfo: { flex: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' },
  authorName: { fontSize: 15, fontWeight: '600' },
  userBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginLeft: 8 },
  userBadgeText: { fontSize: 10, fontWeight: '600' },
  myTipBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  tipDate: { fontSize: 12 },
  tipTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  tipContent: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  savedBadge: { padding: 10, borderRadius: 8 },
  savedText: { fontSize: 14, fontWeight: '600', color: '#10b981' },
  verificationBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  verificationText: { fontSize: 10, fontWeight: '600' },
  reportBtn: { padding: 4 },
  tipActions: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  actionCount: { fontSize: 13, fontWeight: '500' },
  deleteText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 14, fontSize: 15 },
  textArea: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: 14, fontSize: 15, minHeight: 120 },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  // Comments styles
  commentsModalContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  commentsModalContent: { 
    borderRadius: 16, 
    maxHeight: '80%', 
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  commentsBody: { flex: 1, padding: 16, maxHeight: 400 },
  noComments: { textAlign: 'center', paddingVertical: 30 },
  commentItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  commentAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#667eea' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentDate: { fontSize: 11 },
  commentText: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  creatorBadge: { fontSize: 11, fontWeight: '500' },
  replyIndicator: { fontSize: 11, fontStyle: 'italic', marginBottom: 4 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  replyBtn: { alignSelf: 'flex-start' },
  replyBtnText: { fontSize: 12, fontWeight: '500' },
  verifyBtn: { alignSelf: 'flex-start' },
  verifyBtnText: { fontSize: 12, fontWeight: '600' },
  viewRepliesBtn: { alignSelf: 'flex-start' },
  viewRepliesText: { fontSize: 12, fontWeight: '600' },
  repliesContainer: { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: 'rgba(0,0,0,0.1)' },
  replyItem: { flexDirection: 'row', paddingVertical: 8, paddingLeft: 12, borderBottomWidth: 1, position: 'relative' },
  replyConnector: { position: 'absolute', left: -2, top: 0, width: 12, height: 20, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(0,0,0,0.1)', borderBottomLeftRadius: 8 },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  replyingToBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  replyingToText: { fontSize: 12, fontStyle: 'italic' },
  cancelReply: { fontSize: 16, padding: 4 },
  commentInputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8, minHeight: 60 },
  commentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, maxHeight: 100, fontSize: 14, minHeight: 40 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  // Report styles
  reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  reportContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  reportTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  reportDesc: { fontSize: 14, marginBottom: 16 },
  reportOptions: { gap: 8, marginBottom: 20 },
  reportOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 2 },
  reportOptionText: { fontSize: 14 },
  reportBtns: { flexDirection: 'row', gap: 12 },
  reportCancelBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  reportSubmitBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
