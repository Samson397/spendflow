import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import FirebaseService from '../services/FirebaseService';

const LEADERBOARD_CATEGORIES = [
  { id: 'points', label: 'Top Points', emoji: '🏆', description: 'Overall leaderboard based on all activities' },
  { id: 'tips', label: 'Most Tips', emoji: '💡', description: 'Users who shared the most tips (10 pts each)' },
  { id: 'likes', label: 'Most Liked', emoji: '❤️', description: 'Tips with the most likes (2 pts each)' },
  { id: 'comments', label: 'Most Active', emoji: '💬', description: 'Users with most comments (1 pt each)' },
  { id: 'savings', label: 'Top Savers', emoji: '💰', description: 'Highest reported savings (5 pts per £100)' },
  { id: 'streaks', label: 'Streaks', emoji: '🔥', description: 'Longest daily activity streaks (3 pts per day)' },
  { id: 'badges', label: 'Collectors', emoji: '🎖️', description: 'Most badges earned (15 pts per badge)' },
];

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

const SCOPE_OPTIONS = [
  { id: 'world', label: '🌍 World', description: 'Global rankings' },
  { id: 'country', label: '🏠 Your Country', description: 'Rankings in your country' },
];

export default function LeaderboardScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('points');
  const [selectedScope, setSelectedScope] = useState('world');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRank, setUserRank] = useState(null);
  const [userCountry, setUserCountry] = useState(user?.profile?.country || 'United Kingdom');
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);
  const [userBadges, setUserBadges] = useState({}); // Store badges for each user
  const [showPointsGuide, setShowPointsGuide] = useState(false); // Toggle for points guide

  // Group badges by category for the modal
  const badgeCategories = [
    { id: 'monthly', name: '🏆 Monthly Competition', badges: BADGES.filter(b => b.category === 'monthly') },
    { id: 'seasonal', name: '🥇 Seasonal Champions', badges: BADGES.filter(b => b.category === 'seasonal') },
    { id: 'starter', name: '🚀 Getting Started', badges: BADGES.filter(b => b.category === 'starter') },
    { id: 'milestones', name: '💰 Personal Milestones', badges: BADGES.filter(b => b.category === 'milestones') },
    { id: 'streaks', name: '🔥 Streaks', badges: BADGES.filter(b => b.category === 'streaks') },
    { id: 'community', name: '👥 Community', badges: BADGES.filter(b => b.category === 'community') },
    { id: 'special', name: '✨ Special', badges: BADGES.filter(b => b.category === 'special') },
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

  // Load badges for multiple users
  const loadUserBadges = async (userIds) => {
    try {
      const badgePromises = userIds.map(async (userId) => {
        // Use consistent badges based on user ID to prevent random changes
        const userSeed = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const mockBadges = [];
        
        // Everyone gets starter badge
        mockBadges.push('first_steps');
        
        // Consistent achievement badge based on user seed
        const achievementSeed = userSeed % 100;
        if (achievementSeed > 70) {
          mockBadges.push('savings_milestone_1k'); // 30% have savings milestone
        } else if (achievementSeed > 40) {
          mockBadges.push('money_tracker'); // 30% have transaction tracker
        }
        // 40% only have first_steps
        
        // Monthly competition badge - VERY LIMITED and consistent
        const monthlySeed = (userSeed * 3) % 100;
        if (monthlySeed > 90) {
          // Only 10% of users have monthly badges (consistent top performers)
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

  useEffect(() => {
    loadLeaderboard();
  }, [selectedCategory, selectedScope]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const result = await FirebaseService.getLeaderboard(selectedCategory, selectedScope === 'country' ? userCountry : null);
      if (result.success) {
        setLeaderboardData(result.data);
        // Find current user's rank
        const userIndex = result.data.findIndex(item => item.userId === user.uid);
        setUserRank(userIndex >= 0 ? userIndex + 1 : null);
        // Load badges for all users in leaderboard
        const uniqueUserIds = [...new Set(result.data.map(item => item.userId))];
        loadUserBadges(uniqueUserIds);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getRankEmoji = (rank) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return theme.textSecondary;
    }
  };

  const getStatValue = (item, category) => {
    switch (category) {
      case 'points': return `${item.totalPoints || 0} pts`;
      case 'tips': return `${item.tipCount || 0} tips`;
      case 'likes': return `${item.totalLikes || 0} likes`;
      case 'comments': return `${item.commentCount || 0} comments`;
      case 'savings': return `£${(item.totalSavings || 0).toLocaleString()}`;
      case 'streaks': return `${item.streak || 0} days 🔥`;
      case 'badges': return `${(item.badges || []).length} badges 🎖️`;
      default: return '0';
    }
  };

  const getCountryFlag = (country) => {
    const flags = {
      'United Kingdom': '🇬🇧',
      'UK': '🇬🇧',
      'United States': '🇺🇸',
      'USA': '🇺🇸',
      'Canada': '🇨🇦',
      'Australia': '🇦🇺',
      'Germany': '🇩🇪',
      'France': '🇫🇷',
      'Spain': '🇪🇸',
      'Italy': '🇮🇹',
      'Netherlands': '🇳🇱',
      'India': '🇮🇳',
      'Japan': '🇯🇵',
      'China': '🇨🇳',
      'Brazil': '🇧🇷',
      'Mexico': '🇲🇽',
      'South Africa': '🇿🇦',
      'Nigeria': '🇳🇬',
      'Ireland': '🇮🇪',
      'New Zealand': '🇳🇿',
      'Singapore': '🇸🇬',
      'UAE': '🇦🇪',
      'Poland': '🇵🇱',
      'Sweden': '🇸🇪',
      'Norway': '🇳🇴',
    };
    return flags[country] || '🌍';
  };

  const selectedCategoryData = LEADERBOARD_CATEGORIES.find(cat => cat.id === selectedCategory);

  return (
    <View style={[styles.container, { backgroundColor: theme.background[0] }]}>
      <LinearGradient colors={theme.gradient} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
            <Text style={styles.headerSub}>Community Champions</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={onRefresh}>
            <Text style={styles.backBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Scope Toggle (World vs Country) */}
      <View style={[styles.scopeToggle, { backgroundColor: theme.cardBg }]}>
        {SCOPE_OPTIONS.map((scope) => (
          <TouchableOpacity
            key={scope.id}
            style={[
              styles.scopeBtn,
              { backgroundColor: theme.background[0] },
              selectedScope === scope.id && { backgroundColor: theme.primary }
            ]}
            onPress={() => setSelectedScope(scope.id)}
          >
            <Text style={[
              styles.scopeBtnText,
              { color: theme.text },
              selectedScope === scope.id && { color: '#fff' }
            ]}>
              {scope.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {selectedScope === 'country' && (
        <View style={[styles.countryIndicator, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.countryText, { color: theme.text }]}>
            📍 Showing rankings for {userCountry}
          </Text>
        </View>
      )}

      {/* Category Selector */}
      <View style={[styles.categoryContainer, { backgroundColor: theme.cardBg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {LEADERBOARD_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                { backgroundColor: theme.background[0] },
                selectedCategory === category.id && { backgroundColor: theme.primary }
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={[
                styles.categoryLabel,
                { color: theme.text },
                selectedCategory === category.id && { color: '#fff' }
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content ScrollView */}
      <ScrollView
        style={styles.mainScrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Description */}
        <View style={[styles.descriptionCard, { backgroundColor: theme.primary + '15' }]}>
          <Text style={[styles.descriptionText, { color: theme.text }]}>
            {selectedCategoryData?.description}
          </Text>
        </View>

        {/* Points Guide (only show for points category) */}
        {selectedCategory === 'points' && (
          <View style={[styles.pointsGuide, { backgroundColor: theme.cardBg }]}>
            <TouchableOpacity 
              style={styles.pointsGuideHeader}
              onPress={() => setShowPointsGuide(!showPointsGuide)}
            >
              <Text style={[styles.pointsGuideTitle, { color: theme.text }]}>🎯 How to Earn Points</Text>
              <Text style={[styles.dropdownIcon, { color: theme.text }]}>
                {showPointsGuide ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            
            {showPointsGuide && (
              <>
                <View style={styles.pointsGrid}>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>💡</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Share a tip</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+10 pts</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>❤️</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Get a like</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+2 pts</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>💬</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Write comment</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+1 pt</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>💰</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Save £100</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+5 pts</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>🔥</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Daily streak</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+3 pts/day</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>🎖️</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Earn badge</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+150-2500 pts</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>🎯</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Complete goal</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+100 pts</Text>
                  </View>
                  <View style={styles.pointsItem}>
                    <Text style={styles.pointsEmoji}>📊</Text>
                    <Text style={[styles.pointsAction, { color: theme.text }]}>Log transaction</Text>
                    <Text style={[styles.pointsValue, { color: theme.primary }]}>+1 pt</Text>
                  </View>
                </View>
                <Text style={[styles.pointsTip, { color: theme.textSecondary }]}>
                  💡 Pro tip: Build streaks and unlock badges for bonus points!
                </Text>
                <Text style={[styles.fairPlayNote, { color: theme.textSecondary }]}>
                  ⚖️ Fair play: Diminishing returns prevent spam. Comments capped at 50, savings at £50k.
                </Text>
              </>
            )}
          </View>
        )}

        {/* Badges Guide (only show for badges category) */}
        {selectedCategory === 'badges' && (
          <View style={[styles.badgesGuide, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.pointsGuideTitle, { color: theme.text }]}>🎖️ Monthly Competition System</Text>
            
            {/* Monthly Competition Preview */}
            <View style={[styles.competitionSection, { backgroundColor: theme.primary + '10' }]}>
              <Text style={[styles.competitionTitle, { color: theme.primary }]}>🏆 This Month's Competition</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
                {MONTHLY_BADGES.slice(0, 3).map((badge) => (
                  <View key={badge.id} style={[styles.badgeItem, { backgroundColor: theme.background[0] }]}>
                    <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.badgeName, { color: theme.text }]} numberOfLines={1}>{badge.name}</Text>
                    <Text style={[styles.badgeLimit, { color: '#ef4444' }]}>Only {badge.limit} winners</Text>
                    <Text style={[styles.badgePoints, { color: theme.primary }]}>+{badge.points} pts</Text>
                  </View>
                ))}
              </ScrollView>
              <Text style={[styles.competitionNote, { color: theme.textSecondary }]}>
                🔥 Limited badges reset monthly! Compete to be in the top performers.
              </Text>
            </View>

            {/* Achievement Badges Preview */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>💰 Personal Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {ACHIEVEMENT_BADGES.slice(0, 4).map((badge) => (
                <View key={badge.id} style={[styles.badgeItem, { backgroundColor: theme.background[0] }]}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={[styles.badgeName, { color: theme.text }]} numberOfLines={1}>{badge.name}</Text>
                  <Text style={[styles.badgePoints, { color: theme.primary }]}>+{badge.points} pts</Text>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.viewAllButton, { backgroundColor: theme.primary }]}
              onPress={() => setBadgesModalVisible(true)}
            >
              <Text style={styles.viewAllButtonText}>View All {BADGES.length} Badges</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Streaks Guide (only show for streaks category) */}
        {selectedCategory === 'streaks' && (
          <View style={[styles.pointsGuide, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.pointsGuideTitle, { color: theme.text }]}>🔥 Build Your Streak</Text>
            <View style={styles.streakInfo}>
              <Text style={[styles.streakText, { color: theme.text }]}>
                Log in and do any activity daily to build your streak!
              </Text>
              <View style={styles.streakMilestones}>
                <View style={[styles.streakMilestone, { backgroundColor: theme.background[0] }]}>
                  <Text style={styles.streakEmoji}>📅</Text>
                  <Text style={[styles.streakDays, { color: theme.text }]}>7 days</Text>
                  <Text style={[styles.streakReward, { color: theme.primary }]}>+20 pts</Text>
                </View>
                <View style={[styles.streakMilestone, { backgroundColor: theme.background[0] }]}>
                  <Text style={styles.streakEmoji}>🗓️</Text>
                  <Text style={[styles.streakDays, { color: theme.text }]}>30 days</Text>
                  <Text style={[styles.streakReward, { color: theme.primary }]}>+75 pts</Text>
                </View>
                <View style={[styles.streakMilestone, { backgroundColor: theme.background[0] }]}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <Text style={[styles.streakDays, { color: theme.text }]}>100 days</Text>
                  <Text style={[styles.streakReward, { color: theme.primary }]}>+200 pts</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* User's Current Rank */}
        {userRank && (
          <View style={[styles.userRankCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.userRankLabel, { color: theme.textSecondary }]}>Your Rank</Text>
            <View style={styles.userRankContent}>
              <Text style={[styles.userRankNumber, { color: getRankColor(userRank) }]}>
                {getRankEmoji(userRank)}
              </Text>
              <Text style={[styles.userRankText, { color: theme.text }]}>
                {userRank === 1 ? 'You\'re #1!' : `${userRank} of ${leaderboardData.length}`}
              </Text>
            </View>
          </View>
        )}

        {/* Leaderboard List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading leaderboard...</Text>
          </View>
        ) : leaderboardData.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No data yet</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Be the first to share tips and climb the leaderboard!
            </Text>
          </View>
        ) : (
          leaderboardData.map((item, index) => {
              const rank = index + 1;
              const isCurrentUser = item.userId === user.uid;
              
              return (
                <View
                  key={item.userId}
                  style={[
                    styles.leaderboardItem,
                    { backgroundColor: theme.cardBg },
                    isCurrentUser && { borderColor: theme.primary, borderWidth: 2 }
                  ]}
                >
                  <View style={styles.rankSection}>
                    <Text style={[styles.rankText, { color: getRankColor(rank) }]}>
                      #{rank}
                    </Text>
                  </View>
                  
                  <View style={[styles.avatar, { backgroundColor: theme.primary + '30' }]}>
                    {getUserHighestBadge(item.userId) ? (
                      <Text style={styles.avatarBadge}>{getUserHighestBadge(item.userId).emoji}</Text>
                    ) : (
                      <Text style={styles.avatarText}>
                        {(item.username || 'U')[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={[styles.username, { color: theme.text }]}>
                        {item.username || 'Anonymous'}
                      </Text>
                      {isCurrentUser && (
                        <Text style={[styles.youBadge, { backgroundColor: theme.primary + '20', color: theme.primary }]}>
                          You
                        </Text>
                      )}
                      {selectedScope === 'world' && item.country && (
                        <Text style={[styles.countryBadge, { color: theme.textSecondary }]}>
                          {getCountryFlag(item.country)}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.statValue, { color: theme.textSecondary }]}>
                      {getStatValue(item, selectedCategory)}
                    </Text>
                  </View>
                </View>
              );
            })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* All Badges Modal */}
      <Modal
        visible={badgesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBadgesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.background[0] }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>🎖️ All Badges</Text>
              <TouchableOpacity onPress={() => setBadgesModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {badgeCategories.map((category) => (
                <View key={category.id} style={styles.badgeCategorySection}>
                  <Text style={[styles.badgeCategoryTitle, { color: theme.text }]}>{category.name}</Text>
                  <View style={styles.badgeCategoryGrid}>
                    {category.badges.map((badge) => (
                      <View key={badge.id} style={[styles.badgeGridItem, { backgroundColor: theme.background[0] }]}>
                        <Text style={styles.badgeGridEmoji}>{badge.emoji}</Text>
                        <Text style={[styles.badgeGridName, { color: theme.text }]} numberOfLines={1}>{badge.name}</Text>
                        <Text style={[styles.badgeGridDesc, { color: theme.textSecondary }]} numberOfLines={2}>{badge.description}</Text>
                        <Text style={[styles.badgeGridPoints, { color: theme.primary }]}>+{badge.points} pts</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  
  scopeToggle: { flexDirection: 'row', padding: 8, gap: 8 },
  scopeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  scopeBtnText: { fontSize: 14, fontWeight: '600' },
  countryIndicator: { marginHorizontal: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  countryText: { fontSize: 12, textAlign: 'center' },
  
  categoryContainer: { paddingVertical: 12 },
  categoryScroll: { paddingHorizontal: 16 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryEmoji: { fontSize: 14, marginRight: 6 },
  categoryLabel: { fontSize: 13, fontWeight: '500' },
  
  descriptionCard: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 8 },
  descriptionText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  
  mainScrollView: { flex: 1 },
  
  pointsGuide: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12 },
  pointsGuideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pointsGuideTitle: { fontSize: 16, fontWeight: '600' },
  dropdownIcon: { fontSize: 16, fontWeight: 'bold' },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  pointsItem: { width: '48%', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8 },
  pointsEmoji: { fontSize: 24, marginBottom: 4 },
  pointsAction: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  pointsValue: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  pointsTip: { fontSize: 12, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
  fairPlayNote: { fontSize: 10, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  
  // Badges styles
  badgesGuide: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12 },
  badgesScroll: { marginVertical: 12 },
  badgeItem: { width: 90, alignItems: 'center', padding: 12, borderRadius: 12, marginRight: 10 },
  badgeEmoji: { fontSize: 32, marginBottom: 6 },
  badgeName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  badgePoints: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  badgesCount: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  badgeLimit: { fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  viewAllButton: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  viewAllButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Competition styles
  competitionSection: { padding: 12, borderRadius: 12, marginBottom: 16 },
  competitionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  competitionNote: { fontSize: 11, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: 'bold' },
  modalBody: { paddingHorizontal: 16 },
  
  // Badge category styles
  badgeCategorySection: { marginTop: 20 },
  badgeCategoryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  badgeCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeGridItem: { width: '48%', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  badgeGridEmoji: { fontSize: 36, marginBottom: 6 },
  badgeGridName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  badgeGridDesc: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 14 },
  badgeGridPoints: { fontSize: 13, fontWeight: 'bold', marginTop: 6 },
  
  // Streaks styles
  streakInfo: { alignItems: 'center' },
  streakText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  streakMilestones: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  streakMilestone: { alignItems: 'center', padding: 12, borderRadius: 12, width: '30%' },
  streakEmoji: { fontSize: 28, marginBottom: 4 },
  streakDays: { fontSize: 12, fontWeight: '600' },
  streakReward: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  
  userRankCard: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userRankLabel: { fontSize: 14, fontWeight: '500' },
  userRankContent: { flexDirection: 'row', alignItems: 'center' },
  userRankNumber: { fontSize: 24, fontWeight: 'bold', marginRight: 8 },
  userRankText: { fontSize: 16, fontWeight: '600' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  
  leaderboardList: { flex: 1, paddingHorizontal: 16 },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 8, position: 'relative' },
  
  rankSection: { width: 40, alignItems: 'center' },
  rankText: { fontSize: 18, fontWeight: 'bold' },
  
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#667eea' },
  avatarBadge: { fontSize: 28, fontWeight: 'bold' },
  
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  username: { fontSize: 16, fontWeight: '600' },
  youBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  countryBadge: { fontSize: 14, marginLeft: 6 },
  statValue: { fontSize: 14 },
  
  crownContainer: { position: 'absolute', top: -5, right: -5, width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  crownEmoji: { fontSize: 16 },
});
