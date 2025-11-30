import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AIService from '../services/AIService';

const AIControls = ({ userId, onInsightsUpdate }) => {
  const { theme } = useTheme();
  const [currentMode, setCurrentMode] = useState('balanced');
  const [availableModes, setAvailableModes] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load available AI modes
    const modes = AIService.getAvailableModes();
    setAvailableModes(modes);
    
    // Load initial health score and insights
    if (userId) {
      loadHealthScore();
      loadProactiveInsights();
      
      // Preload data for faster responses
      AIService.preloadUserData(userId);
    }
  }, [userId]);

  const loadHealthScore = async () => {
    try {
      const result = await AIService.calculateFinancialHealthScore(userId);
      if (result.success) {
        setHealthScore(result);
      }
    } catch (error) {
      // Silent error handling for UI components
    }
  };

  const loadProactiveInsights = async () => {
    try {
      const result = await AIService.getProactiveInsights(userId);
      if (result.success) {
        setInsights(result.insights);
        onInsightsUpdate?.(result.insights);
      }
    } catch (error) {
      // Silent error handling for UI components
    }
  };

  const handleModeChange = async (mode) => {
    if (mode === currentMode) return;
    
    setLoading(true);
    try {
      const success = AIService.setAIMode(mode);
      if (success) {
        setCurrentMode(mode);
        // Clear cache to force reload with new data limits
        AIService.clearCache?.();
      } else {
        Alert.alert('Error', 'Failed to change AI mode');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to change AI mode');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#3b82f6'; // blue
    if (score >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getScoreEmoji = (score) => {
    if (score >= 80) return '🌟';
    if (score >= 60) return '✅';
    if (score >= 40) return '⚠️';
    return '❌';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBg }]}>
      {/* AI Mode Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>AI Response Speed</Text>
        <View style={styles.modeButtons}>
          {availableModes.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeButton,
                { 
                  backgroundColor: mode.isCurrent ? theme.primary : theme.background[1],
                  borderColor: theme.border
                }
              ]}
              onPress={() => handleModeChange(mode.key)}
              disabled={loading}
            >
              <Text style={[
                styles.modeButtonText,
                { color: mode.isCurrent ? '#fff' : theme.text }
              ]}>
                {mode.key.charAt(0).toUpperCase() + mode.key.slice(1)}
              </Text>
              <Text style={[
                styles.modeDescription,
                { color: mode.isCurrent ? '#fff' : theme.textSecondary }
              ]}>
                {mode.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Financial Health Score */}
      {healthScore && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Financial Health</Text>
          <View style={[styles.healthCard, { backgroundColor: theme.background[1] }]}>
            <View style={styles.healthHeader}>
              <Text style={[styles.healthScore, { color: getScoreColor(healthScore.score) }]}>
                {getScoreEmoji(healthScore.score)} {healthScore.score}/100
              </Text>
              <Text style={[styles.healthRating, { color: theme.text }]}>
                {healthScore.rating}
              </Text>
            </View>
            
            <View style={styles.healthFactors}>
              {healthScore.factors.slice(0, 3).map((factor, index) => (
                <Text key={index} style={[styles.factorText, { color: theme.textSecondary }]}>
                  • {factor}
                </Text>
              ))}
            </View>
            
            {healthScore.recommendations.length > 0 && (
              <View style={styles.recommendations}>
                <Text style={[styles.recommendTitle, { color: theme.text }]}>Recommendations:</Text>
                {healthScore.recommendations.slice(0, 2).map((rec, index) => (
                  <Text key={index} style={[styles.recommendText, { color: theme.textSecondary }]}>
                    • {rec}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Proactive Insights */}
      {insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Important Updates</Text>
          {insights.map((insight, index) => (
            <View key={index} style={[styles.insightCard, { backgroundColor: theme.background[1] }]}>
              <Text style={[styles.insightType, { color: theme.primary }]}>
                {insight.type.replace('_', ' ').toUpperCase()}
              </Text>
              <Text style={[styles.insightMessage, { color: theme.text }]}>
                {insight.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Refresh Button */}
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: theme.primary }]}
        onPress={() => {
          loadHealthScore();
          loadProactiveInsights();
        }}
        disabled={loading}
      >
        <Text style={styles.refreshButtonText}>Refresh Insights</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 11,
    textAlign: 'center',
  },
  healthCard: {
    padding: 16,
    borderRadius: 8,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthScore: {
    fontSize: 24,
    fontWeight: '700',
  },
  healthRating: {
    fontSize: 16,
    fontWeight: '500',
  },
  healthFactors: {
    marginBottom: 12,
  },
  factorText: {
    fontSize: 13,
    marginBottom: 2,
  },
  recommendations: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  recommendText: {
    fontSize: 12,
    marginBottom: 2,
  },
  insightCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
  },
  refreshButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AIControls;
