import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Header = ({ navigation, currentPage = 'home' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const showDesktopNav = width >= 1024;
  const styles = useMemo(() => createStyles(width), [width]);

  const navItems = [
    { name: 'Home', route: 'Landing', key: 'home' },
    { name: 'Features', route: 'Features', key: 'features' },
    { name: 'About', route: 'About', key: 'about' },
    { name: 'FAQ', route: 'FAQ', key: 'faq' },
    { name: 'Blog', route: 'Blog', key: 'blog' },
    { name: 'Contact', route: 'Contact', key: 'contact' },
  ];

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={[styles.header, { paddingTop: insets.top }]}
    >
      <View style={styles.container}>
        {/* Logo */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Landing')}
          style={styles.logo}
        >
          <Text style={styles.logoText}>SpendFlow</Text>
        </TouchableOpacity>

        {/* Desktop Navigation */}
        {showDesktopNav && (
          <View style={styles.nav}>
            {navItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => navigation.navigate(item.route)}
                style={[
                  styles.navItem,
                  currentPage === item.key && styles.navItemActive
                ]}
              >
                <Text style={[
                  styles.navText,
                  currentPage === item.key && styles.navTextActive
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CTA Buttons */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignIn')}
            style={styles.signInBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign In to your account"
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.signUpBtn}
            accessibilityRole="button"
            accessibilityLabel="Get Started - Create new account"
          >
            <Text style={styles.signUpText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* Mobile Menu Button */}
        {!showDesktopNav && (
          <TouchableOpacity
            onPress={() => setMenuOpen(!menuOpen)}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mobile Menu */}
      {menuOpen && !showDesktopNav && (
        <View style={styles.mobileMenu}>
          {navItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => {
                navigation.navigate(item.route);
                setMenuOpen(false);
              }}
              style={styles.mobileNavItem}
            >
              <Text style={styles.mobileNavText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </LinearGradient>
  );
};

const createStyles = (width) => StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'web' ? 0 : 40,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flexDirection: width >= 1024 ? 'row' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: width >= 1024 ? 32 : 16,
    paddingVertical: 12,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    flexShrink: 0,
    marginRight: width >= 1024 ? 20 : 0,
  },
  logoText: {
    fontSize: width >= 1024 ? 24 : 20,
    fontWeight: 'bold',
    color: '#ffffff',
    whiteSpace: 'nowrap',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flex: 1,
    justifyContent: 'center',
  },
  navItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  navItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  ctaContainer: {
    flexDirection: width >= 640 ? 'row' : 'row',
    alignItems: 'center',
    gap: width >= 640 ? 12 : 8,
  },
  signInBtn: {
    paddingVertical: 6,
    paddingHorizontal: width >= 640 ? 16 : 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  signInText: {
    color: '#ffffff',
    fontSize: width >= 640 ? 16 : 14,
    fontWeight: '500',
  },
  signUpBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: width >= 640 ? 8 : 6,
    paddingHorizontal: width >= 640 ? 20 : 12,
    borderRadius: width >= 640 ? 25 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  signUpText: {
    color: '#667eea',
    fontSize: width >= 640 ? 16 : 14,
    fontWeight: '600',
  },
  menuButton: {
    padding: 12,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  menuIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  mobileMenu: {
    backgroundColor: 'rgba(102, 126, 234, 0.95)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: '100%',
    gap: 8,
  },
  mobileNavItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mobileNavText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default Header;

