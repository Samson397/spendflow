import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Footer = ({ navigation }) => {
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [menuOpen, setMenuOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const footerSections = [
    {
      title: 'Product',
      links: [
        { name: 'Features', route: 'Features' },
        { name: 'Security & Privacy', route: 'About' },
        { name: 'Free Forever', route: 'About' },
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', route: 'About' },
        { name: 'Blog', route: 'Blog' },
        { name: 'Contact', route: 'Contact' },
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Help Center', route: 'FAQ' },
        { name: 'FAQ', route: 'FAQ' },
      ]
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', route: 'PrivacyPolicy' },
        { name: 'Terms of Service', route: 'TermsOfService' },
        { name: 'Cookie Policy', route: 'PrivacyPolicy' },
      ]
    }
  ];

  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        {/* Main Footer Content */}
        <View style={styles.footerContent}>
          {/* Brand Section */}
          <View style={styles.brandSection}>
            <Text style={styles.followText}>Follow Us for Financial Tips</Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => Linking.openURL('https://x.com/spendflowap')}
                accessibilityLabel="Follow us on X"
              >
                <Ionicons name="logo-twitter" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => Linking.openURL('https://www.tiktok.com/@spendflow')}
                accessibilityLabel="Follow us on TikTok"
              >
                <Ionicons name="musical-notes" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => Linking.openURL('https://www.youtube.com/@SpendFlowapp')}
                accessibilityLabel="Subscribe on YouTube"
              >
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61584095445533')}
                accessibilityLabel="Like us on Facebook"
              >
                <Ionicons name="logo-facebook" size={20} color="#1877F2" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Menu Section */}
          <View style={styles.menuSection}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={toggleMenu}
            >
              <Text style={styles.menuButtonText}>Menu</Text>
              <Text style={styles.menuArrow}>{menuOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            
            {menuOpen && (
              <View style={styles.dropdownMenu}>
                {footerSections.map((section, index) => (
                  <View key={index} style={styles.menuSectionGroup}>
                    <Text style={styles.menuSectionTitle}>{section.title}</Text>
                    {section.links.map((link, linkIndex) => (
                      <TouchableOpacity
                        key={linkIndex}
                        onPress={() => {
                          navigation.navigate(link.route);
                          setMenuOpen(false);
                        }}
                        style={styles.menuLink}
                      >
                        <Text style={styles.menuLinkText}>{link.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.copyright}>
            © {currentYear} SpendFlow. All rights reserved.
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (width) => {
  const isSmallScreen = width < 768;
  const isMediumScreen = width >= 768 && width < 1024;
  const isLargeScreen = width >= 1024;

  return StyleSheet.create({
    footer: {
      backgroundColor: '#1a202c',
      paddingTop: isSmallScreen ? 20 : 32,
      paddingBottom: isSmallScreen ? 12 : 20,
    },
    container: {
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
      paddingHorizontal: isSmallScreen ? 16 : 20,
    },
    footerContent: {
      flexDirection: 'row',
      gap: isSmallScreen ? 12 : 20,
      marginBottom: isSmallScreen ? 16 : 24,
      alignItems: 'flex-start',
      justifyContent: 'center',
      position: 'relative',
    },
    brandSection: {
      alignItems: 'center',
    },
    brandName: {
      fontSize: isSmallScreen ? 16 : 18,
      fontWeight: 'bold',
      color: '#ffffff',
      marginBottom: 8,
      textAlign: 'center',
    },
    followText: {
      fontSize: isSmallScreen ? 12 : 14,
      color: '#ffffff',
      marginBottom: 12,
      textAlign: 'center',
      fontWeight: '600',
    },
    socialLinks: {
      flexDirection: 'row',
      gap: isSmallScreen ? 6 : 8,
      justifyContent: 'center',
    },
    socialLink: {
      width: isSmallScreen ? 32 : 36,
      height: isSmallScreen ? 32 : 36,
      backgroundColor: '#2d3748',
      borderRadius: isSmallScreen ? 16 : 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    socialIcon: {
      fontSize: isSmallScreen ? 14 : 16,
    },
    menuSection: {
      position: 'absolute',
      right: 0,
      top: 0,
    },
    menuButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#2d3748',
      borderRadius: 8,
    },
    menuButtonText: {
      fontSize: isSmallScreen ? 14 : 16,
      color: '#ffffff',
      fontWeight: '600',
    },
    menuArrow: {
      fontSize: isSmallScreen ? 12 : 14,
      color: '#ffffff',
    },
    dropdownMenu: {
      position: 'absolute',
      top: 40,
      right: 0,
      backgroundColor: '#2d3748',
      borderRadius: 8,
      padding: 20,
      minWidth: 220,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 1000,
    },
    menuSectionGroup: {
      marginBottom: 20,
    },
    menuSectionTitle: {
      fontSize: isSmallScreen ? 14 : 16,
      fontWeight: '600',
      color: '#ffffff',
      marginBottom: 12,
    },
    menuLink: {
      marginBottom: 6,
    },
    menuLinkText: {
      fontSize: isSmallScreen ? 13 : 14,
      color: '#a0aec0',
      lineHeight: isSmallScreen ? 16 : 18,
    },
    bottomBar: {
      paddingTop: isSmallScreen ? 12 : 16,
      borderTopWidth: 1,
      borderTopColor: '#2d3748',
      alignItems: 'center',
    },
    copyright: {
      fontSize: isSmallScreen ? 16 : 18,
      color: '#718096',
      textAlign: 'center',
    },
  });
};

export default Footer;
