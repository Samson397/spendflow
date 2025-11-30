import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const BlogArticleScreen = ({ navigation, route }) => {
  const post = route?.params?.post;

  if (!post) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.missingContainer}>
          <Text style={styles.missingTitle}>Article not found</Text>
          <Text style={styles.missingSubtitle}>Please go back to the blog and select another article.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Blog')}>
            <Text style={styles.backButtonText}>Return to Blog</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const paragraphs = post.content.split('\n\n');

  return (
    <View style={styles.container}>
      <SEO 
        title={`${post.title} - SpendFlow Blog`}
        description={post.excerpt || 'SpendFlow blog article'}
        url={`https://spendflow.uk/blog/${post.slug || ''}`}
      />
      <StatusBar style="light" />

      <Header navigation={navigation} currentPage="blog" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroContainer}>
            <Text style={styles.postCategory}>{post.category}</Text>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{post.date}</Text>
              <Text style={styles.metaSeparator}>•</Text>
              <Text style={styles.metaText}>{post.readTime}</Text>
            </View>
          </View>
        </View>

        <View style={styles.articleSection}>
          <View style={styles.articleContainer}>
            {paragraphs.map((paragraph, index) => (
              <Text key={index} style={styles.paragraph}>
                {paragraph.trim()}
              </Text>
            ))}
          </View>
        </View>

        <Footer navigation={navigation} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  heroContainer: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  postCategory: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  postTitle: {
    fontSize: width > 768 ? 40 : 28,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: width > 768 ? 48 : 36,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#4a5568',
  },
  metaSeparator: {
    fontSize: 14,
    color: '#a0aec0',
  },
  articleSection: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  articleContainer: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#2d3748',
    marginBottom: 16,
  },
  missingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a202c',
  },
  missingSubtitle: {
    fontSize: 16,
    color: '#4a5568',
    marginBottom: 24,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#667eea',
    borderRadius: 24,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default BlogArticleScreen;
