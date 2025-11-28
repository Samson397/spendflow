import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const Header = ({ navigation, currentPage = 'home' }) => {
  const [menuOpen, setMenuOpen] = useState(false);

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
      style={styles.header}
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
        {width > 768 && (
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
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.signUpBtn}
          >
            <Text style={styles.signUpText}>Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* Mobile Menu Button */}
        {width <= 768 && (
          <TouchableOpacity
            onPress={() => setMenuOpen(!menuOpen)}
            style={styles.menuButton}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Mobile Menu */}
      {menuOpen && width <= 768 && (
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

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  logo: {
    flexShrink: 0,
    marginRight: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    whiteSpace: 'nowrap',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  signUpBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signUpText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    color: '#ffffff',
    fontSize: 24,
  },
  mobileMenu: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  mobileNavItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileNavText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Header;
