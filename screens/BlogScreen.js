import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const BlogScreen = ({ navigation }) => {
  const featuredPost = {
    title: 'Getting Started with SpendFlow: Your Complete Guide',
    excerpt: 'Learn how to set up your SpendFlow account, create virtual cards, track expenses, and start building better financial habits today.',
    category: 'Getting Started',
    readTime: '5 min read',
    date: 'Nov 25, 2025',
    image: '🚀'
  };

  const blogPosts = [
    {
      title: 'How to Create the Perfect Budget with SpendFlow',
      excerpt: 'Step-by-step guide to setting up category budgets that actually work for your lifestyle.',
      category: 'Budgeting',
      readTime: '4 min read',
      date: 'Nov 22, 2025',
      image: '💰'
    },
    {
      title: 'Virtual Cards: Organize Your Spending Like a Pro',
      excerpt: 'Learn how to use virtual cards to separate and track different types of expenses.',
      category: 'Tips',
      readTime: '3 min read',
      date: 'Nov 20, 2025',
      image: '💳'
    },
    {
      title: 'Setting Savings Goals You\'ll Actually Achieve',
      excerpt: 'Tips for creating realistic savings goals and staying motivated until you reach them.',
      category: 'Savings',
      readTime: '5 min read',
      date: 'Nov 18, 2025',
      image: '🎯'
    },
    {
      title: 'Track Your Spending: Why Manual Entry Works Better',
      excerpt: 'Discover why manually tracking expenses leads to better financial awareness than automatic imports.',
      category: 'Mindset',
      readTime: '4 min read',
      date: 'Nov 15, 2025',
      image: '✏️'
    },
    {
      title: 'Using Charts to Understand Your Money',
      excerpt: 'How to read SpendFlow\'s charts and use data to make smarter financial decisions.',
      category: 'Analytics',
      readTime: '4 min read',
      date: 'Nov 12, 2025',
      image: '📊'
    },
    {
      title: 'Managing Direct Debits and Recurring Bills',
      excerpt: 'Never miss a payment again. Learn how to track and manage all your recurring expenses.',
      category: 'Bills',
      readTime: '3 min read',
      date: 'Nov 10, 2025',
      image: '📅'
    }
  ];

  const categories = [
    { name: 'All Posts', count: 12 },
    { name: 'Getting Started', count: 3 },
    { name: 'Budgeting', count: 3 },
    { name: 'Savings', count: 2 },
    { name: 'Tips', count: 2 },
    { name: 'Analytics', count: 2 }
  ];

  return (
    <View style={styles.container}>
      <SEO 
        title="Blog - SpendFlow | Tips & Guides for Better Money Management"
        description="Learn how to get the most out of SpendFlow with our guides on budgeting, virtual cards, savings goals, and manual expense tracking. Build better financial habits."
        url="https://spedflowapp.web.app/blog"
      />
      <StatusBar style="light" />
      
      <Header navigation={navigation} currentPage="blog" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>SpendFlow Tips & Guides</Text>
            <Text style={styles.heroSubtitle}>
              Learn how to get the most out of SpendFlow and build better financial habits
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category, index) => (
                <TouchableOpacity key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>
                    {category.name} ({category.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Featured Post */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Featured Article</Text>
            <TouchableOpacity style={styles.featuredPost}>
              <View style={styles.featuredPostImage}>
                <Text style={styles.featuredPostEmoji}>{featuredPost.image}</Text>
              </View>
              <View style={styles.featuredPostContent}>
                <View style={styles.postMeta}>
                  <Text style={styles.postCategory}>{featuredPost.category}</Text>
                  <Text style={styles.postDate}>{featuredPost.date}</Text>
                  <Text style={styles.postReadTime}>{featuredPost.readTime}</Text>
                </View>
                <Text style={styles.featuredPostTitle}>{featuredPost.title}</Text>
                <Text style={styles.featuredPostExcerpt}>{featuredPost.excerpt}</Text>
                <View style={styles.readMoreButton}>
                  <Text style={styles.readMoreText}>Read Full Article →</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Posts */}
        <View style={[styles.section, styles.postsSection]}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Recent Articles</Text>
            <View style={styles.postsGrid}>
              {blogPosts.map((post, index) => (
                <TouchableOpacity key={index} style={styles.postCard}>
                  <View style={styles.postImage}>
                    <Text style={styles.postEmoji}>{post.image}</Text>
                  </View>
                  <View style={styles.postContent}>
                    <View style={styles.postMeta}>
                      <Text style={styles.postCategory}>{post.category}</Text>
                      <Text style={styles.postDate}>{post.date}</Text>
                    </View>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postExcerpt}>{post.excerpt}</Text>
                    <View style={styles.postFooter}>
                      <Text style={styles.postReadTime}>{post.readTime}</Text>
                      <Text style={styles.readMoreLink}>Read More →</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Newsletter Section */}
        <View style={styles.newsletterSection}>
          <View style={styles.sectionContainer}>
            <Text style={styles.newsletterTitle}>Stay Updated</Text>
            <Text style={styles.newsletterSubtitle}>
              Get weekly financial tips and insights delivered to your inbox
            </Text>
            <View style={styles.newsletterForm}>
              <View style={styles.newsletterInputContainer}>
                <Text style={styles.newsletterInputPlaceholder}>Enter your email address</Text>
              </View>
              <TouchableOpacity style={styles.newsletterButton}>
                <Text style={styles.newsletterButtonText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.newsletterNote}>
              Join 10,000+ subscribers. Unsubscribe anytime.
            </Text>
          </View>
        </View>

        {/* Topics Section */}
        <View style={styles.section}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Popular Topics</Text>
            <View style={styles.topicsGrid}>
              <TouchableOpacity style={styles.topicCard}>
                <Text style={styles.topicIcon}>🚀</Text>
                <Text style={styles.topicTitle}>Getting Started</Text>
                <Text style={styles.topicCount}>3 articles</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.topicCard}>
                <Text style={styles.topicIcon}>💰</Text>
                <Text style={styles.topicTitle}>Budgeting</Text>
                <Text style={styles.topicCount}>3 articles</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.topicCard}>
                <Text style={styles.topicIcon}>🎯</Text>
                <Text style={styles.topicTitle}>Savings Goals</Text>
                <Text style={styles.topicCount}>2 articles</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.topicCard}>
                <Text style={styles.topicIcon}>📊</Text>
                <Text style={styles.topicTitle}>Using Analytics</Text>
                <Text style={styles.topicCount}>2 articles</Text>
              </TouchableOpacity>
            </View>
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
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: width > 768 ? 42 : 32,
    fontWeight: 'bold',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: width > 768 ? 50 : 38,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 26,
  },
  categoriesSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoriesContainer: {
    gap: 12,
    paddingHorizontal: 4,
  },
  categoryTag: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryTagText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  section: {
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  postsSection: {
    backgroundColor: '#f8f9fa',
  },
  sectionContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: width > 768 ? 32 : 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 32,
    textAlign: 'center',
  },
  featuredPost: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    flexDirection: width > 768 ? 'row' : 'column',
  },
  featuredPostImage: {
    backgroundColor: '#667eea',
    width: width > 768 ? 200 : '100%',
    height: width > 768 ? 200 : 150,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredPostEmoji: {
    fontSize: 60,
  },
  featuredPostContent: {
    padding: 32,
    flex: 1,
  },
  postMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  postCategory: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  postDate: {
    fontSize: 12,
    color: '#718096',
  },
  postReadTime: {
    fontSize: 12,
    color: '#718096',
  },
  featuredPostTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 12,
    lineHeight: 32,
  },
  featuredPostExcerpt: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    marginBottom: 20,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'center',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    width: width > 768 ? 350 : width - 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  postImage: {
    backgroundColor: '#f1f5f9',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postEmoji: {
    fontSize: 40,
  },
  postContent: {
    padding: 20,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 8,
    lineHeight: 24,
  },
  postExcerpt: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 16,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readMoreLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  newsletterSection: {
    backgroundColor: '#667eea',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  newsletterTitle: {
    fontSize: width > 768 ? 32 : 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  newsletterSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  newsletterForm: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 12,
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 16,
  },
  newsletterInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  newsletterInputPlaceholder: {
    color: '#a0aec0',
    fontSize: 16,
  },
  newsletterButton: {
    backgroundColor: '#1a202c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  newsletterButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  newsletterNote: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  topicCard: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: width > 768 ? 200 : (width - 60) / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  topicIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 4,
    textAlign: 'center',
  },
  topicCount: {
    fontSize: 12,
    color: '#718096',
  },
});

export default BlogScreen;
