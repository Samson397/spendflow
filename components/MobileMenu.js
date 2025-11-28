import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Platform, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Animated, 
  Image 
} from 'react-native';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTheme } from '../contexts/ThemeContext';

export default function MobileMenu({ 
  visible, 
  onClose, 
  navigation, 
  currentScreen = 'Dashboard' 
}) {
  const { currency, openCurrencySettings } = useCurrency();
  const { theme } = useTheme();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Use native driver only on native platforms, not web
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: useNative,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: useNative,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 150,
        useNativeDriver: useNative,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: useNative,
      }),
    ]).start(() => onClose());
  };

  const menuItems = [
    { id: 'Dashboard', emoji: '📊', title: 'Dashboard', screen: 'Dashboard' },
    { id: 'Wallet', emoji: '💰', title: 'Wallet', screen: 'Wallet' },
    { id: 'Calendar', emoji: '📅', title: 'Calendar', screen: 'Calendar' },
    { id: 'Goals', emoji: '🎯', title: 'Goals', screen: 'Goals' },
    { id: 'Budget', emoji: '💵', title: 'Budgets', screen: 'Budget' },
    { id: 'Reports', emoji: '📈', title: 'Reports', screen: 'Reports' },
    { id: 'CommunityTips', emoji: '💡', title: 'Community Tips', screen: 'CommunityTips' },
    { id: 'Leaderboard', emoji: '🏆', title: 'Leaderboard', screen: 'Leaderboard' }
  ];

  const handleMenuItemPress = (item) => {
    onClose();
    if (item.screen !== currentScreen) {
      navigation.navigate(item.screen);
    }
  };

  const handleCurrencyPress = () => {
    onClose();
    setTimeout(() => openCurrencySettings(), 100);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Dark overlay */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>
      
      {/* Menu sliding from left */}
      <Animated.View style={[styles.menu, { transform: [{ translateX: slideAnim }], backgroundColor: theme.background[0] }]}>
        <View style={[styles.header, { backgroundColor: theme.gradient[0] }]}>
          <Text style={styles.headerTitle}>Menu</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.menuItems} showsVerticalScrollIndicator={false}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={[
                styles.menuItem, 
                currentScreen === item.id && [styles.menuItemActive, { backgroundColor: theme.primary + '15' }]
              ]} 
              onPress={() => handleMenuItemPress(item)}
            >
              {item.id === 'Wallet' ? (
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.menuItemIcon}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.menuItemEmoji}>{item.emoji}</Text>
              )}
              <Text style={[
                styles.menuItemText, 
                { color: theme.text },
                currentScreen === item.id && { color: theme.primary, fontWeight: '600' }
              ]}>
                {item.title}
              </Text>
              {currentScreen === item.id && <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.cardBg, backgroundColor: theme.background[0] }]}>
          <TouchableOpacity style={[styles.currencyButton, { backgroundColor: theme.cardBg, borderColor: theme.textSecondary + '30' }]} onPress={handleCurrencyPress}>
            <Text style={styles.currencyFlag}>{currency?.flag || '💰'}</Text>
            <View style={styles.currencyInfo}>
              <Text style={[styles.currencyCode, { color: theme.text }]}>{currency?.code || 'USD'}</Text>
              <Text style={[styles.currencyName, { color: theme.textSecondary }]}>{currency?.name || 'US Dollar'}</Text>
            </View>
            <Text style={[styles.currencyArrow, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  overlayPressable: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: Platform.OS === 'web' ? 280 : '75%',
    maxWidth: 300,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#667eea',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 20,
    color: '#ffffff',
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: '#f0f4ff',
  },
  menuItemEmoji: {
    fontSize: 24,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  menuItemIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#4a5568',
    flex: 1,
  },
  menuItemTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    backgroundColor: '#667eea',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: '#f9fafb',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a202c',
  },
  currencyName: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  currencyArrow: {
    fontSize: 20,
    color: '#a0aec0',
  },
});
