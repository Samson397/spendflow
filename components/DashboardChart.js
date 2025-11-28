import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions, Platform, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCurrency } from '../contexts/CurrencyContext';

const { width: screenWidth } = Dimensions.get('window');

// Futuristic neon gradient colors
const chartGradients = {
  pie: ['#6366f1', '#8b5cf6', '#a855f7'],
  bar: ['#06b6d4', '#3b82f6', '#6366f1'],
  line: ['#10b981', '#14b8a6', '#06b6d4'],
  donut: ['#f59e0b', '#f97316', '#ef4444'],
  area: ['#ec4899', '#f43f5e', '#f97316'],
  scatter: ['#8b5cf6', '#a855f7', '#d946ef'],
  gauge: ['#22c55e', '#10b981', '#14b8a6'],
  heatmap: ['#f43f5e', '#f97316', '#fbbf24'],
};

const neonColors = [
  '#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899',
  '#6366f1', '#14b8a6', '#f43f5e', '#22c55e', '#a855f7'
];

export default function DashboardChart({ chart, onRemove, chartData, onMoveLeft, onMoveRight, canMoveLeft, canMoveRight, isSingleChart = false }) {
  const { currency } = useCurrency();
  const [editMode, setEditMode] = useState(false);
  
  // Animation values - subtle and gentle
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const glowAnim = useRef(new Animated.Value(0.15)).current;
  
  // Gentle animations
  useEffect(() => {
    // Subtle entry animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Very gentle floating effect
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000 + Math.random() * 1000, // Slower
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000 + Math.random() * 1000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();
    
    // Subtle glow pulse
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.25,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.15,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();
    
    return () => {
      floatAnimation.stop();
      glowAnimation.stop();
    };
  }, []);
  
  // Very subtle float movement (only 2px)
  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });
  
  const data = Array.isArray(chartData) ? chartData : [];
  const hasData = data.length > 0;
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  const gradientColors = chartGradients[chart.chartType] || chartGradients.pie;

  // Format large values (1K, 1M, etc.)
  const formatValue = (value) => {
    if (!value) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toLocaleString();
  };

  const renderChart = () => {
    if (!hasData) {
      return renderEmptyState();
    }
    
    switch (chart.chartType) {
      case 'pie':
        return renderPieChart();
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'donut':
        return renderDonutChart();
      case 'area':
        return renderAreaChart();
      case 'scatter':
        return renderScatterChart();
      case 'gauge':
        return renderGaugeChart();
      case 'heatmap':
        return renderHeatmapChart();
      default:
        return renderPieChart();
    }
  };

  // Futuristic Empty State - Shows what data type is needed
  const getDataTypeHint = () => {
    const hints = {
      'income_sources': 'Add income transactions',
      'monthly_income': 'Add income transactions',
      'spending_categories': 'Add expense transactions',
      'spending_by_category': 'Add expense transactions',
      'monthly_spending': 'Add expense transactions',
      'income_vs_expense': 'Add any transactions',
      'savings_goals': 'Create savings goals',
      'account_balances': 'Add cards/accounts',
      'budget_progress': 'Add expenses',
      'savings_rate': 'Add transactions',
    };
    return hints[chart.dataType] || 'Add transactions';
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient colors={[...gradientColors, gradientColors[0] + '40']} style={styles.emptyOrb}>
        <View style={styles.emptyOrbInner}>
          <Text style={styles.emptyIcon}>{chart.emoji}</Text>
        </View>
      </LinearGradient>
      <Text style={styles.emptyText}>No Data</Text>
      <Text style={styles.emptyHint}>{getDataTypeHint()}</Text>
      <View style={styles.dataTypeTag}>
        <Text style={styles.dataTypeText}>{chart.dataType?.replace(/_/g, ' ')}</Text>
      </View>
    </View>
  );

  // 🔮 FUTURISTIC PIE - Orbital Ring Design
  const renderPieChart = () => {
    return (
      <View style={styles.chartArea}>
        <View style={styles.orbitalContainer}>
          {/* Outer glow ring */}
          <LinearGradient colors={[gradientColors[0] + '20', 'transparent']} style={styles.outerGlow} />
          
          {/* Main orbital ring */}
          <View style={styles.orbitalRing}>
            {data.map((item, index) => {
              const color = item.color || neonColors[index % neonColors.length];
              return (
                <LinearGradient 
                  key={index}
                  colors={[color, color + 'CC']}
                  style={[styles.orbitalSegment, { flex: item.value || 1 }]}
                />
              );
            })}
          </View>
          
          {/* Center core - show total */}
          <View style={styles.orbitalCore}>
            <Text style={styles.coreValue}>{currency.symbol}{formatValue(total)}</Text>
            <Text style={styles.coreLabel}>total</Text>
          </View>
        </View>
        
        {/* Holographic legend with values */}
        <View style={styles.holoLegend}>
          {data.slice(0, 2).map((item, index) => (
            <View key={index} style={styles.holoItem}>
              <View style={[styles.holoIndicator, { backgroundColor: item.color || neonColors[index] }]} />
              <Text style={styles.holoText}>{item.label}: {currency.symbol}{formatValue(item.value)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 📊 FUTURISTIC BAR - Neon Tower Design
  const renderBarChart = () => {
    const maxValue = Math.max(...data.map(d => d.value || 0), 1);
    return (
      <View style={styles.chartArea}>
        {/* Grid lines */}
        <View style={styles.gridLines}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>
        
        <View style={styles.towerContainer}>
          {data.slice(0, 5).map((item, index) => {
            const height = Math.max(12, ((item.value || 0) / maxValue) * 75);
            const color = item.color || neonColors[index % neonColors.length];
            return (
              <View key={index} style={styles.towerColumn}>
                <View style={[styles.towerGlow, { backgroundColor: color + '30', height: height + 10 }]} />
                <LinearGradient 
                  colors={[color, color + '80']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[styles.towerBar, { height }]}
                >
                  <View style={[styles.towerShine, { backgroundColor: color }]} />
                </LinearGradient>
                <Text style={[styles.barLabel, { color: color }]} numberOfLines={1}>
                  {item.label?.split(' ')[0]}
                </Text>
              </View>
            );
          })}
        </View>
        
        {/* Legend with values */}
        <View style={styles.barLegend}>
          {data.slice(0, 5).map((item, index) => (
            <View key={index} style={styles.barLegendItem}>
              <View style={[styles.barLegendDot, { backgroundColor: item.color || neonColors[index % neonColors.length] }]} />
              <Text style={styles.barLegendText} numberOfLines={1}>
                {item.label}: {currency.symbol}{formatValue(item.value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 📈 FUTURISTIC LINE - Pulse Wave Design
  const renderLineChart = () => {
    const maxValue = Math.max(...data.map(d => d.value || 0), 1);
    const points = data.slice(0, 6);
    
    return (
      <View style={styles.chartArea}>
        <View style={styles.waveContainer}>
          {/* Gradient background */}
          <LinearGradient 
            colors={[gradientColors[0] + '30', gradientColors[1] + '10', 'transparent']}
            style={styles.waveGradient}
          />
          
          {/* Wave line simulation */}
          <View style={styles.waveLine}>
            {points.map((item, index) => {
              const height = ((item.value || 0) / maxValue) * 50 + 15;
              return (
                <View key={index} style={styles.wavePoint}>
                  <View style={[styles.waveBar, { height, backgroundColor: gradientColors[0] + '60' }]} />
                  <View style={[styles.waveDot, { backgroundColor: gradientColors[0] }]}>
                    <View style={styles.waveDotCore} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        
        <View style={styles.waveStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Peak</Text>
            <Text style={[styles.statValue, { color: gradientColors[0] }]}>
              {currency.symbol}{Math.max(...data.map(d => d.value || 0)).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // 🍩 FUTURISTIC DONUT - Energy Ring Design
  const renderDonutChart = () => {
    return (
      <View style={styles.chartArea}>
        <View style={styles.energyContainer}>
          {/* Pulsing outer ring */}
          <View style={[styles.energyPulse, { borderColor: gradientColors[0] + '30' }]} />
          
          {/* Main energy ring */}
          <View style={styles.energyRing}>
            {data.map((item, index) => {
              const color = item.color || neonColors[index % neonColors.length];
              return (
                <LinearGradient 
                  key={index}
                  colors={[color, color + 'AA']}
                  style={[styles.energySegment, { flex: item.value || 1 }]}
                />
              );
            })}
          </View>
          
          {/* Core display - fixed formatting */}
          <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.energyCore}>
            <Text style={[styles.energyValue, { color: gradientColors[0] }]}>
              {currency.symbol}{formatValue(total)}
            </Text>
          </LinearGradient>
        </View>
        
        {/* Legend - show all items with values */}
        <View style={styles.holoLegend}>
          {data.map((item, index) => (
            <View key={index} style={styles.holoItem}>
              <View style={[styles.holoIndicator, { backgroundColor: item.color || neonColors[index % neonColors.length] }]} />
              <Text style={styles.holoText} numberOfLines={1}>
                {item.label}: {currency.symbol}{formatValue(item.value)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 📉 FUTURISTIC AREA - Terrain Map Design
  const renderAreaChart = () => (
    <View style={styles.chartArea}>
      <View style={styles.terrainContainer}>
        <LinearGradient 
          colors={[gradientColors[0], gradientColors[1], gradientColors[0] + '20']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.terrainGradient}
        >
          <View style={styles.terrainPeaks}>
            <View style={[styles.peak, { height: '60%', backgroundColor: 'rgba(255,255,255,0.1)' }]} />
            <View style={[styles.peak, { height: '80%', backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={[styles.peak, { height: '45%', backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          </View>
        </LinearGradient>
        <View style={styles.terrainStats}>
          <Text style={[styles.terrainValue, { color: gradientColors[0] }]}>
            {currency.symbol}{total.toLocaleString()}
          </Text>
          <Text style={styles.terrainLabel}>Total Value</Text>
        </View>
      </View>
    </View>
  );

  // ⚪ FUTURISTIC SCATTER - Constellation Design
  const renderScatterChart = () => (
    <View style={styles.chartArea}>
      <View style={styles.constellationContainer}>
        {/* Star field background */}
        <LinearGradient colors={['#0f0f23', '#1a1a2e', '#0f0f23']} style={styles.starField}>
          {data.slice(0, 8).map((item, index) => {
            const x = 10 + (index % 4) * 22;
            const y = 15 + Math.floor(index / 4) * 35;
            const size = 8 + (item.value / Math.max(...data.map(d => d.value || 1))) * 8;
            return (
              <View key={index} style={[styles.star, { 
                left: `${x}%`, 
                top: `${y}%`,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: neonColors[index % neonColors.length],
                shadowColor: neonColors[index % neonColors.length],
              }]}>
                <View style={styles.starCore} />
              </View>
            );
          })}
        </LinearGradient>
      </View>
    </View>
  );

  // 🎯 FUTURISTIC GAUGE - Power Meter Design
  const renderGaugeChart = () => {
    const percentage = Math.min(data[0]?.value || 0, 100);
    const color = percentage > 70 ? '#22c55e' : percentage > 40 ? '#f59e0b' : '#ef4444';
    
    return (
      <View style={styles.chartArea}>
        <View style={styles.powerMeterContainer}>
          {/* Background track */}
          <View style={styles.powerTrack}>
            <LinearGradient 
              colors={[color, color + '80']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.powerFill, { width: `${percentage}%` }]}
            />
            <View style={[styles.powerGlow, { width: `${percentage}%`, backgroundColor: color + '40' }]} />
          </View>
          
          <View style={styles.powerDisplay}>
            <Text style={[styles.powerValue, { color }]}>{percentage}</Text>
            <Text style={styles.powerUnit}>%</Text>
          </View>
        </View>
      </View>
    );
  };

  // 🔥 FUTURISTIC HEATMAP - Show actual data items with intensity
  const renderHeatmapChart = () => {
    if (data.length === 0) return renderEmptyState();
    
    const maxVal = Math.max(...data.map(d => d.value || 1), 1);
    
    return (
      <View style={styles.chartArea}>
        <View style={styles.heatmapContainer}>
          {data.slice(0, 6).map((item, index) => {
            const intensity = (item.value || 0) / maxVal;
            const color = item.color || (intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#22c55e');
            
            return (
              <View key={index} style={styles.heatmapItem}>
                <LinearGradient 
                  colors={[color, color + '60']}
                  style={[styles.heatmapCell, { opacity: 0.4 + intensity * 0.6 }]}
                >
                  <Text style={styles.heatmapValue}>{currency.symbol}{formatValue(item.value)}</Text>
                </LinearGradient>
                <Text style={styles.heatmapLabel} numberOfLines={1}>{item.label?.split(' ')[0]}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.heatmapTotal}>Total: {currency.symbol}{formatValue(total)}</Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        editMode && styles.containerEditMode,
        isSingleChart && styles.singleChartContainer,
        {
          transform: [
            { translateY },
            { scale: scaleAnim }
          ],
        }
      ]}
    >
      <Pressable 
        style={styles.chartPressable}
        onLongPress={() => setEditMode(true)}
        onPress={() => editMode && setEditMode(false)}
      >
        {/* Minimal Header - just title (hide if no title) */}
        {(chart.dataTitle || chart.emoji) && (
          <View style={styles.minimalHeader}>
            <View style={styles.minimalTitleRow}>
              {chart.emoji && <Text style={styles.minimalEmoji}>{chart.emoji}</Text>}
              {chart.dataTitle && <Text style={[styles.minimalTitle, isSingleChart && styles.singleChartTitle]} numberOfLines={1}>{chart.dataTitle}</Text>}
            </View>
            {!isSingleChart && (
              <TouchableOpacity onPress={() => onRemove(chart.id)} style={styles.minimalRemoveBtn}>
                <Text style={styles.minimalRemoveIcon}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Chart Content */}
        <View style={isSingleChart && styles.singleChartContent}>
          {renderChart()}
        </View>
        
        {/* Edit Mode Overlay - Move buttons */}
        {editMode && (
          <View style={styles.editOverlay}>
            <View style={styles.moveButtons}>
              {canMoveLeft && onMoveLeft && (
                <TouchableOpacity 
                  style={styles.moveBtn} 
                  onPress={() => { onMoveLeft(); setEditMode(false); }}
                >
                  <Text style={styles.moveBtnText}>←</Text>
                </TouchableOpacity>
              )}
              {canMoveRight && onMoveRight && (
                <TouchableOpacity 
                  style={styles.moveBtn} 
                  onPress={() => { onMoveRight(); setEditMode(false); }}
                >
                  <Text style={styles.moveBtnText}>→</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.editHint}>Tap to close</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Main Container - 2 per row
  container: {
    width: '48%',
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'visible',
    position: 'relative',
  },
  // Single big chart - full width
  singleChartContainer: {
    width: '100%',
    minHeight: 350,
  },
  singleChartContent: {
    transform: [{ scale: 1.5 }],
    marginVertical: 40,
    alignItems: 'center',
  },
  chartPressable: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glowEffect: {
    display: 'none', // Remove glow effect
  },
  containerEditMode: {
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  moveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  editHint: {
    color: '#94a3b8',
    fontSize: 9,
    marginTop: 8,
  },
  
  // Minimal Header - Responsive
  minimalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 2 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 8,
  },
  minimalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  minimalEmoji: {
    fontSize: Platform.OS === 'web' ? 12 : 16,
    marginRight: Platform.OS === 'web' ? 4 : 6,
  },
  minimalTitle: {
    fontSize: Platform.OS === 'web' ? 10 : 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  singleChartTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  minimalRemoveBtn: {
    width: Platform.OS === 'web' ? 18 : 24,
    height: Platform.OS === 'web' ? 18 : 24,
    borderRadius: Platform.OS === 'web' ? 9 : 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalRemoveIcon: {
    color: '#64748b',
    fontSize: Platform.OS === 'web' ? 12 : 16,
    fontWeight: '700',
  },
  
  // Old Header (keeping for reference)
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 28,
  },
  iconOrb: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  chartEmoji: {
    fontSize: 14,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e2e8f0',
    flex: 1,
    letterSpacing: 0.3,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 14,
    color: '#64748b',
  },
  
  // Chart Area - clear/transparent
  chartArea: {
    padding: 6,
    paddingTop: 4,
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  emptyOrb: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyOrbInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  dataTypeTag: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  dataTypeText: {
    fontSize: 9,
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // 🔮 Orbital Pie Chart
  orbitalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 85,
    marginBottom: 8,
  },
  outerGlow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  orbitalRing: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  orbitalSegment: {
    height: '100%',
  },
  orbitalCore: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  coreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  coreLabel: {
    fontSize: 8,
    color: '#64748b',
    letterSpacing: 0.5,
  },
  holoLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? 4 : 8,
  },
  holoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'web' ? 4 : 6,
    marginVertical: Platform.OS === 'web' ? 1 : 2,
  },
  holoIndicator: {
    width: Platform.OS === 'web' ? 5 : 8,
    height: Platform.OS === 'web' ? 5 : 8,
    borderRadius: Platform.OS === 'web' ? 2.5 : 4,
    marginRight: Platform.OS === 'web' ? 2 : 4,
  },
  holoText: {
    fontSize: Platform.OS === 'web' ? 8 : 11,
    color: '#334155',
    fontWeight: '500',
  },
  // 📊 Neon Tower Bar Chart
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 30,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  towerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    marginBottom: 8,
  },
  towerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  towerGlow: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderRadius: 4,
    opacity: 0.5,
  },
  towerBar: {
    width: '100%',
    maxWidth: 18,
    borderRadius: 4,
    overflow: 'hidden',
  },
  towerShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 3,
    height: '100%',
    opacity: 0.3,
  },
  neonTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  neonLabel: {
    fontSize: 9,
    color: '#64748b',
    letterSpacing: 1,
  },
  neonValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  // 📈 Pulse Wave Line Chart
  waveContainer: {
    height: 70,
    position: 'relative',
    marginBottom: 8,
  },
  waveGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    borderRadius: 8,
  },
  waveLine: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 10,
  },
  wavePoint: {
    alignItems: 'center',
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    marginBottom: 4,
  },
  waveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveDotCore: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  waveStats: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statItem: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748b',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  
  // 🍩 Energy Ring Donut Chart - Responsive
  energyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Platform.OS === 'web' ? 60 : 80,
  },
  energyPulse: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 55 : 70,
    height: Platform.OS === 'web' ? 55 : 70,
    borderRadius: Platform.OS === 'web' ? 27.5 : 35,
    borderWidth: 1,
  },
  energyRing: {
    width: Platform.OS === 'web' ? 50 : 65,
    height: Platform.OS === 'web' ? 50 : 65,
    borderRadius: Platform.OS === 'web' ? 25 : 32.5,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  energySegment: {
    height: '100%',
  },
  energyCore: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 32 : 42,
    height: Platform.OS === 'web' ? 32 : 42,
    borderRadius: Platform.OS === 'web' ? 16 : 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyValue: {
    fontSize: Platform.OS === 'web' ? 9 : 12,
    fontWeight: '700',
  },
  
  // 📉 Terrain Area Chart
  terrainContainer: {
    height: 85,
  },
  terrainGradient: {
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
  },
  terrainPeaks: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  peak: {
    width: 30,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  terrainStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  terrainValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  terrainLabel: {
    fontSize: 9,
    color: '#64748b',
    letterSpacing: 0.5,
  },
  
  // ⚪ Constellation Scatter Chart
  constellationContainer: {
    height: 85,
    borderRadius: 10,
    overflow: 'hidden',
  },
  starField: {
    flex: 1,
    position: 'relative',
  },
  star: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  starCore: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
  },
  
  // 🎯 Power Meter Gauge Chart
  powerMeterContainer: {
    paddingVertical: 15,
  },
  powerTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  powerFill: {
    height: '100%',
    borderRadius: 5,
  },
  powerGlow: {
    position: 'absolute',
    top: -4,
    height: 18,
    borderRadius: 9,
  },
  powerDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 10,
  },
  powerValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  powerUnit: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 2,
  },
  
  // 🔥 Thermal Grid Heatmap
  thermalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  thermalCell: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 4,
    marginBottom: 4,
  },
  
  // Improved Heatmap styles
  heatmapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  heatmapItem: {
    width: '30%',
    marginBottom: 8,
    alignItems: 'center',
  },
  heatmapCell: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  heatmapLabel: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  heatmapTotal: {
    color: '#1e293b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  
  // Bar chart labels and legend
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    color: '#334155',
  },
  barLegend: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  barLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  barLegendText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '500',
  },
});
