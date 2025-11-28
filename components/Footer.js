import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const Footer = ({ navigation }) => {
  const currentYear = new Date().getFullYear();

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
            <Text style={styles.brandName}>SpendFlow</Text>
            <Text style={styles.brandDescription}>
              Free personal finance tracking with complete privacy. 
              No bank connections required - you control your data.
            </Text>
            <View style={styles.socialLinks}>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => navigation.navigate('Contact')}
              >
                <Text style={styles.socialIcon}>📧</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => navigation.navigate('Contact')}
              >
                <Text style={styles.socialIcon}>🐦</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => navigation.navigate('Contact')}
              >
                <Text style={styles.socialIcon}>📘</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialLink}
                onPress={() => navigation.navigate('Contact')}
              >
                <Text style={styles.socialIcon}>💼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Links */}
          <View style={styles.linksContainer}>
            {footerSections.map((section, index) => (
              <View key={index} style={styles.linkSection}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.links.map((link, linkIndex) => (
                  <TouchableOpacity
                    key={linkIndex}
                    onPress={() => navigation.navigate(link.route)}
                    style={styles.footerLink}
                  >
                    <Text style={styles.footerLinkText}>{link.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <Text style={styles.copyright}>
            © {currentYear} SpendFlow. All rights reserved.
          </Text>
          <View style={styles.bottomLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.bottomLinkText}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>•</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
              <Text style={styles.bottomLinkText}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.separator}>•</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Contact')}>
              <Text style={styles.bottomLinkText}>Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#1a202c',
    paddingTop: 48,
    paddingBottom: 24,
  },
  container: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  footerContent: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 40,
    marginBottom: 40,
  },
  brandSection: {
    flex: width > 768 ? 1 : 0,
    maxWidth: width > 768 ? 300 : '100%',
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  brandDescription: {
    fontSize: 16,
    color: '#a0aec0',
    lineHeight: 24,
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialLink: {
    width: 40,
    height: 40,
    backgroundColor: '#2d3748',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    fontSize: 18,
  },
  linksContainer: {
    flex: width > 768 ? 2 : 0,
    flexDirection: width > 768 ? 'row' : 'column',
    gap: width > 768 ? 40 : 24,
  },
  linkSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  footerLink: {
    marginBottom: 12,
  },
  footerLinkText: {
    fontSize: 14,
    color: '#a0aec0',
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: width > 768 ? 'row' : 'column',
    alignItems: width > 768 ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#2d3748',
    gap: width > 768 ? 0 : 16,
  },
  copyright: {
    fontSize: 14,
    color: '#718096',
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bottomLinkText: {
    fontSize: 14,
    color: '#a0aec0',
  },
  separator: {
    fontSize: 14,
    color: '#4a5568',
  },
});

export default Footer;
