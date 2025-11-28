// screens/ThemeScreen.js
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.round((width - 48) / 2);
const CARD_HEIGHT = 180;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Theme categories
const CLASSIC_THEMES = ['sleek_minimal', 'dark_pro', 'bold_gradient', 'banking_professional', 'soft_pastel', 'glassmorphism'];
const FUTURISTIC_THEMES = ['cyber_neon', 'matrix_green', 'neon_sunset', 'aurora_boreal', 'deep_space', 'hologram_blue', 'techno_red', 'quantum_purple'];

function ThemeCard({ theme, selected, onSelect }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // mount animation - fade in
  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  const isFuturistic = FUTURISTIC_THEMES.includes(theme.id);
  
  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <AnimatedPressable
        onPress={() => onSelect(theme.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.themeCard,
          { width: CARD_WIDTH, height: CARD_HEIGHT },
          selected && styles.selectedCard,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        {/* Gradient background */}
        <LinearGradient 
          colors={theme.gradient.length >= 2 ? theme.gradient : [...theme.gradient, theme.gradient[0]]} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Glow effect for futuristic themes */}
          {isFuturistic && (
            <View style={[styles.glowOverlay, { backgroundColor: theme.primary + '20' }]} />
          )}
          
          {/* Theme name */}
          <View style={styles.cardHeader}>
            <Text style={styles.themeName}>{theme.name}</Text>
            {isFuturistic && <Text style={styles.futuristicBadge}>✨</Text>}
          </View>
          
          {/* Preview area */}
          <View style={[styles.previewArea, { backgroundColor: theme.background[0] + 'CC' }]}>
            {/* Mini card preview */}
            <View style={[styles.miniCard, { backgroundColor: theme.cardBg, borderColor: theme.primary + '40' }]}>
              <View style={[styles.miniCardAccent, { backgroundColor: theme.primary }]} />
              <View style={styles.miniCardContent}>
                <View style={[styles.miniDot, { backgroundColor: theme.text + '60' }]} />
                <View style={[styles.miniLine, { backgroundColor: theme.accent }]} />
              </View>
            </View>
            
            {/* Mini chart bars */}
            <View style={styles.miniChart}>
              {[0.6, 1, 0.4, 0.8, 0.5].map((h, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.miniBar, 
                    { 
                      height: h * 28,
                      backgroundColor: i % 2 === 0 ? theme.primary : theme.accent,
                    }
                  ]} 
                />
              ))}
            </View>
          </View>
          
          {/* Description */}
          <Text style={styles.themeDesc} numberOfLines={1}>{theme.description}</Text>
        </LinearGradient>
        
        {/* Selected indicator */}
        {selected && (
          <LinearGradient colors={['#10b981', '#059669']} style={styles.selectedBadge}>
            <Text style={styles.selectedText}>✓ Active</Text>
          </LinearGradient>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const MemoThemeCard = React.memo(ThemeCard, (prev, next) => {
  return prev.selected === next.selected && prev.theme.id === next.theme.id;
});

export default function ThemeScreen({ navigation }) {
  const { theme: currentAppTheme, applyTheme, themes: themeData, themeId } = useTheme();
  const themeArray = useMemo(() => Object.values(themeData), [themeData]);

  const [selectedTheme, setSelectedTheme] = useState(themeId || currentAppTheme.id);

  const currentTheme = useMemo(
    () => themeArray.find((t) => t.id === selectedTheme) || currentAppTheme,
    [selectedTheme, themeArray, currentAppTheme]
  );

  // Separate themes into categories
  const classicThemes = useMemo(
    () => themeArray.filter(t => CLASSIC_THEMES.includes(t.id)),
    [themeArray]
  );
  const futuristicThemes = useMemo(
    () => themeArray.filter(t => FUTURISTIC_THEMES.includes(t.id)),
    [themeArray]
  );

  const onSelect = useCallback((id) => {
    setSelectedTheme(id);
  }, []);

  const handleApplyTheme = async () => {
    await applyTheme(selectedTheme);
    navigation.goBack();
  };

  const renderThemeRow = (themes, startIndex = 0) => {
    const rows = [];
    for (let i = 0; i < themes.length; i += 2) {
      rows.push(
        <View key={i} style={styles.row}>
          <MemoThemeCard 
            theme={themes[i]} 
            selected={selectedTheme === themes[i].id} 
            onSelect={onSelect} 
          />
          {themes[i + 1] && (
            <MemoThemeCard 
              theme={themes[i + 1]} 
              selected={selectedTheme === themes[i + 1].id} 
              onSelect={onSelect} 
            />
          )}
        </View>
      );
    }
    return rows;
  };

  const isDarkTheme = currentTheme.background[0].toLowerCase().includes('0') || 
                      currentTheme.background[0].toLowerCase().includes('1') ||
                      currentTheme.background[0].toLowerCase().includes('2');

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background[0] }]}>
      {/* Futuristic Header */}
      <LinearGradient 
        colors={currentTheme.gradient.length >= 2 ? currentTheme.gradient : [...currentTheme.gradient, currentTheme.gradient[0]]} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>🎨 Themes</Text>
            <Text style={styles.subtitle}>Customize your experience</Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Theme Badge */}
        <View style={[styles.currentBadge, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.primary + '40' }]}>
          <View style={[styles.currentDot, { backgroundColor: currentTheme.primary }]} />
          <Text style={[styles.currentText, { color: currentTheme.text }]}>
            Active: <Text style={{ fontWeight: '700' }}>{currentAppTheme.name}</Text>
          </Text>
        </View>

        {/* Futuristic Themes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEmoji]}>🚀</Text>
            <View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Futuristic</Text>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>Cyberpunk & Neon vibes</Text>
            </View>
          </View>
          {renderThemeRow(futuristicThemes)}
        </View>

        {/* Classic Themes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEmoji]}>✨</Text>
            <View>
              <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Classic</Text>
              <Text style={[styles.sectionSubtitle, { color: currentTheme.textSecondary }]}>Clean & Professional</Text>
            </View>
          </View>
          {renderThemeRow(classicThemes)}
        </View>

        {/* Apply Button */}
        <Pressable
          onPress={handleApplyTheme}
          style={({ pressed }) => [
            styles.applyBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <LinearGradient 
            colors={[currentTheme.primary, currentTheme.accent || currentTheme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyGradient}
          >
            <Text style={styles.applyText}>Apply {currentTheme.name}</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: Platform.OS === 'web' ? 50 : 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, color: '#fff', fontWeight: '600' },
  headerCenter: { alignItems: 'center', flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  placeholder: { width: 40 },
  
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  
  // Current theme badge
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  currentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  currentText: { fontSize: 14 },
  
  // Sections
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionEmoji: { fontSize: 24, marginRight: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  
  row: { 
    flexDirection: 'row',
    justifyContent: 'space-between', 
    marginBottom: 12,
  },
  
  // Theme Card
  themeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  cardGradient: {
    flex: 1,
    padding: 12,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  themeName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  futuristicBadge: { fontSize: 12, marginLeft: 6 },
  
  // Preview area
  previewArea: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  miniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  miniCardAccent: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  miniCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniDot: {
    width: 20,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  miniLine: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 32,
  },
  miniBar: {
    width: 12,
    borderRadius: 3,
  },
  
  themeDesc: { 
    fontSize: 10, 
    textAlign: 'center', 
    color: 'rgba(255,255,255,0.7)',
  },
  
  selectedBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    alignItems: 'center',
  },
  selectedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  
  // Apply button
  applyBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  applyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
