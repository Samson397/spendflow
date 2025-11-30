import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import SEO from '../components/SEO';
import Header from '../components/Header';
import Footer from '../components/Footer';

const { width } = Dimensions.get('window');

const articleContent = {
  'getting-started': `Getting Started with SpendFlow: Your Complete Guide

Welcome to SpendFlow! This guide will help you set up your account and start tracking your finances privately.

Step 1: Create Your Account
• Download SpendFlow or visit spendflow.uk
• Sign up with your email - no personal info required
• Your data stays private, no bank connections needed

Step 2: Create Your First Virtual Card
• Tap "Add Card" on the dashboard
• Choose "Debit" or "Credit" 
• Set a name like "Groceries" or "Entertainment"
• Add your starting balance

Step 3: Track Your First Expense
• Tap the "+" button
• Select your card
• Enter the amount and description
• Choose a category (Food, Transport, etc.)

Step 4: Set Up a Budget
• Go to "Budgets" tab
• Tap "Create Budget"
• Choose category and monthly limit
• SpendFlow will track your progress

Step 5: Create a Savings Goal
• Visit "Goals" section
• Set your target amount and deadline
• Track progress as you save

That's it! You're now tracking expenses privately with SpendFlow. No bank connections, no data sharing - just you in control of your financial data.

Next: Try creating multiple virtual cards for different spending categories!`,

  'perfect-budget': `How to Create the Perfect Budget with SpendFlow

Budgeting with SpendFlow is simple because you control every entry. Here's how to create budgets that actually work:

The SpendFlow Budgeting Method:

1. Track First, Budget Second
• Spend 2 weeks tracking all expenses manually
• See where your money actually goes
• Don't judge, just observe your patterns

2. Create Category-Based Budgets
• Go to Budgets tab → "Create Budget"
• Start with these essential categories:
  - Housing (rent, utilities)
  - Food (groceries, dining out)
  - Transportation (gas, public transport)
  - Entertainment (movies, subscriptions)

3. Use the 50/30/20 Rule
• 50% for needs (housing, food, utilities)
• 30% for wants (entertainment, dining out)
• 20% for savings and debt payments

4. Set Realistic Limits
• Look at your 2-week tracking data
• Set budgets 10% lower than current spending
• Gradually reduce over time

5. Monitor Weekly
• Check budget progress every Sunday
• SpendFlow shows you exactly where you stand
• Adjust spending for the remaining month

6. Use Multiple Virtual Cards
• Create separate cards for each budget category
• "Groceries Card" with $400/month limit
• "Entertainment Card" with $200/month limit
• This makes budgets feel more real

Pro Tips:
• Start with just 3-4 budget categories
• Review and adjust monthly
• Celebrate when you stay under budget
• Don't abandon the budget if you go over - just restart

Remember: Manual entry makes you more aware of every purchase. This awareness is your superpower for staying on budget!`,

  'virtual-cards': `Virtual Cards: Organize Your Spending Like a Pro

SpendFlow's virtual cards are your secret weapon for organized spending. Here's how to use them effectively:

Why Virtual Cards Work:
• Each card represents a spending category
• You see exactly how much you've spent per category
• No mixing of different expense types
• Perfect for budgeting and tracking

Setting Up Your Card System:

1. Essential Cards Everyone Needs:
• "Daily Expenses" - groceries, gas, basics
• "Bills & Utilities" - rent, phone, internet
• "Entertainment" - movies, dining out, hobbies
• "Emergency Fund" - unexpected expenses only

2. Advanced Card Strategies:
• "Vacation Fund" - save for trips
• "Gift Budget" - birthdays, holidays
• "Health & Fitness" - gym, supplements, medical
• "Professional" - work clothes, courses, networking

3. Seasonal Cards:
• "Holiday Shopping" (November-December)
• "Back to School" (August-September)
• "Summer Activities" (June-August)

Best Practices:

Set Card Limits:
• Give each card a monthly spending limit
• When it's empty, you're done spending in that category
• Forces you to prioritize purchases

Color Code Your Cards:
• Red for bills (serious stuff)
• Green for savings goals
• Blue for entertainment
• Yellow for daily expenses

Weekly Card Review:
• Check each card's balance every Sunday
• See which categories you're overspending
• Adjust your behavior for the coming week

Transfer Between Cards:
• Move money from underspent categories
• Cover overspending in important areas
• Keep your overall budget on track

Real Example Setup:
• Groceries Card: $400/month
• Entertainment Card: $200/month  
• Gas Card: $150/month
• Emergency Card: $500 (don't touch unless emergency)

The Psychology Behind It:
When you manually enter each expense and choose which card to charge, you become more mindful. You'll think "Do I really need this?" before spending.

This system turns budgeting from a chore into a game. Each card is like a separate wallet - when it's empty, you wait until next month or transfer from another card.

Try it for one month and see how much more aware you become of your spending patterns!`,

  'savings-goals': `Setting Savings Goals You'll Actually Achieve

Most people fail at saving because they set unrealistic goals. Here's how to create savings goals you'll actually reach:

The SpendFlow Savings Method:

1. Start Stupidly Small
• Don't aim for $10,000 if you've never saved $100
• Start with $50, then $100, then $500
• Build the habit before increasing the amount

2. Make It Specific and Visual
• Not "save money" but "save $1,200 for vacation to Italy"
• Set a clear deadline: "by June 2025"
• SpendFlow shows your progress visually

3. Use the Pay Yourself First Method
• Set up a "Savings" virtual card
• Transfer money there FIRST when you get paid
• Spend what's left, not save what's left

4. Break Big Goals Into Small Chunks
• Want $1,200 for vacation? That's $100/month for 12 months
• Or $25/week for 48 weeks
• Small amounts feel achievable

5. Create Multiple Savings Goals
In SpendFlow, set up different goals:
• Emergency Fund: $1,000 (highest priority)
• Vacation Fund: $1,200 by June
• New Laptop: $800 by December
• Christmas Gifts: $500 by November

6. Use the 1% Rule
• Save 1% more each month
• Month 1: Save $50
• Month 2: Save $50.50
• Month 3: Save $51.01
• Gradual increases feel painless

Psychological Tricks That Work:

The $5 Challenge:
• Every time you get a $5 bill, save it
• Or save $5 every time you skip coffee/lunch out
• You'll be surprised how fast it adds up

Round-Up Method:
• When you spend $23.67, enter $24 in SpendFlow
• Put the $0.33 difference in savings
• Painless micro-savings

Visual Progress:
• SpendFlow shows your progress bar
• Seeing 67% complete motivates you to reach 100%
• Celebrate milestones (25%, 50%, 75%)

Common Mistakes to Avoid:
• Setting goals too high too fast
• Not having a specific purpose for the money
• Saving for "someday" instead of specific dates
• Giving up after one bad month

The 30-Day Challenge:
1. Pick one small savings goal ($100-$300)
2. Set a 30-day deadline
3. Save a little bit every day
4. Track progress in SpendFlow daily
5. Celebrate when you hit the goal

Remember: The goal isn't to save the most money possible. The goal is to build the saving habit. Start small, be consistent, and gradually increase your targets.

Once you successfully save for your first goal, you'll have the confidence to tackle bigger ones!`,

  'manual-tracking': `Track Your Spending: Why Manual Entry Works Better

Everyone wants automatic expense tracking, but manual entry is actually superior. Here's why:

The Psychology of Manual Entry:

1. Mindful Spending
• When you have to manually enter each purchase, you think twice
• "Do I really want to log another coffee purchase?"
• This awareness naturally reduces impulse buying

2. No Surprises
• You know exactly what you spent because you entered it
• No mysterious charges or forgotten subscriptions
• Complete control over your financial data

3. Better Memory
• Writing things down (even digitally) improves memory
• You'll remember your spending patterns better
• Makes you more conscious of money habits

Why Automatic Tracking Fails:

Bank Connection Problems:
• Transactions often have unclear descriptions
• "AMZN MKTP" - was that books or groceries?
• Gas stations show as "SHELL 12345" - no context
• You still have to categorize everything manually

Privacy Concerns:
• Banks sell your spending data to advertisers
• Third-party apps store your financial information
• Data breaches expose your entire financial life
• With SpendFlow, your data never leaves your device

Delayed Awareness:
• Automatic tracking shows you what you spent yesterday
• Manual entry makes you think before you spend
• Prevention vs. reaction

The SpendFlow Manual Method:

1. Enter Expenses Immediately
• Right after making a purchase, open SpendFlow
• Takes 10 seconds: amount, category, description
• Make it a habit like checking your phone

2. Use Voice Notes
• If you can't enter immediately, voice memo the amount
• "Groceries $47.83"
• Enter it properly when you get home

3. Keep Receipts for One Day
• Put receipts in your pocket/purse
• Enter them all at once each evening
• Throw away receipts after entering

4. Weekly Review Sessions
• Every Sunday, review the week's spending
• Look for patterns and surprises
• Plan adjustments for the coming week

Making Manual Entry Easy:

Quick Categories:
• Set up shortcuts for common expenses
• "Food," "Gas," "Coffee," "Entertainment"
• Don't overthink categories

Use Templates:
• Save common transactions
• "Grocery store - $50 - Food"
• One tap to enter similar purchases

Location Reminders:
• When you arrive at the grocery store, enter the expense
• Use your phone's location to remind you

The 21-Day Challenge:
• Commit to manual entry for 21 days
• Track everything, no matter how small
• Notice how your spending awareness changes
• Most people reduce spending by 15-20% automatically

Real User Results:
"I used to spend $200/month on random stuff. After manual tracking for one month, I'm down to $120 without even trying. Just being aware made the difference." - Sarah, SpendFlow user

"Automatic tracking never worked for me because I'd ignore it. Manual entry forces me to face every purchase. I've saved $300/month just from increased awareness." - Mike, SpendFlow user

The Bottom Line:
Manual entry isn't a bug, it's a feature. The "inconvenience" is actually the point - it makes you more mindful about money.

Try it for one month. You'll be amazed at how much more aware and in control you feel about your finances.`,

  'charts-insights': `Using Charts to Understand Your Money

SpendFlow's charts turn your spending data into actionable insights. Here's how to read and use them effectively:

Understanding Your Dashboard Charts:

1. Spending by Category (Pie Chart)
• Shows where your money actually goes
• Look for surprises: "I spent HOW much on coffee?"
• Identify your biggest expense categories
• Use this to set realistic budgets

2. Monthly Spending Trends (Line Chart)
• See if you're spending more or less over time
• Identify seasonal patterns (holidays, summer activities)
• Spot gradual increases that need attention
• Track improvement over months

3. Budget vs. Actual (Bar Chart)
• Green bars: under budget (good!)
• Red bars: over budget (needs attention)
• Yellow bars: close to limit (be careful)
• Use this for weekly budget check-ins

Reading the Data Like a Pro:

Look for Patterns:
• Do you overspend on weekends?
• Are certain months consistently higher?
• Which categories are hardest to control?
• When do you make your biggest purchases?

The 80/20 Rule:
• Usually 20% of your categories account for 80% of spending
• Focus on controlling these big categories first
• Small categories don't matter as much

Seasonal Insights:
• December: Holiday spending spike
• August: Back-to-school expenses
• Summer: Vacation and activity costs
• Plan for these predictable increases

Using Charts to Improve Your Finances:

1. The Monthly Review Process
• First Sunday of each month, review last month's charts
• Ask: "What surprised me?"
• Identify one category to focus on improving
• Set a specific goal for the coming month

2. The Category Deep Dive
• Pick your highest spending category
• Look at individual transactions
• Ask: "Which of these could I have avoided?"
• Find patterns: time of day, mood, location

3. The Trend Analysis
• Compare this month to last month
• Are you improving or getting worse?
• What caused the biggest changes?
• Celebrate improvements, plan fixes for problems

4. Budget Adjustment Strategy
• If you're consistently over budget, increase the budget slightly
• If you're always under budget, lower it and save the difference
• Budgets should be challenging but achievable

Advanced Chart Techniques:

The Envelope Method Visualization:
• Create separate virtual cards for each major category
• Watch each card's balance like a fuel gauge
• When it hits zero, you're done spending in that category

The Savings Rate Calculator:
• Income minus expenses = savings
• Track this percentage monthly
• Aim to increase it gradually over time

The Guilt-Free Spending Chart:
• After covering needs and savings, the rest is guilt-free
• See exactly how much you can spend on wants
• Enjoy spending within this limit

Common Chart Mistakes:

1. Analysis Paralysis
• Don't spend hours analyzing every detail
• Look for big patterns, not tiny variations
• Take action on insights, don't just study them

2. Perfectionism
• Your charts don't need to be perfect
• Rough categories are better than no tracking
• Progress, not perfection

3. Ignoring Positive Trends
• Celebrate when charts show improvement
• Acknowledge successful budget months
• Use positive momentum to tackle harder categories

The Weekly Chart Check:
• Every Sunday, spend 5 minutes with your charts
• Ask three questions:
  1. Where did I overspend this week?
  2. What category needs attention next week?
  3. What am I doing well that I should continue?

Remember: Charts are tools, not judgments. They show you reality so you can make informed decisions about your money. The goal isn't perfect charts - it's better financial awareness and control.

Use your SpendFlow charts as a mirror for your spending habits, then make small adjustments based on what you see.`,

  'direct-debits': `Managing Direct Debits and Recurring Bills

Never miss a payment again with SpendFlow's direct debit tracking. Here's how to stay on top of all your recurring expenses:

Setting Up Your Direct Debit System:

1. List All Recurring Payments
• Rent/mortgage
• Utilities (electric, gas, water, internet)
• Insurance (car, health, home)
• Subscriptions (Netflix, Spotify, gym)
• Loan payments
• Phone bill

2. Create a "Bills" Virtual Card
• Set up a dedicated card for all recurring payments
• Load it with your total monthly bill amount
• Never use this card for other purchases
• Treat it like a separate bank account

3. Use SpendFlow's Direct Debit Feature
• Go to "Direct Debits" tab
• Add each recurring payment with:
  - Amount
  - Due date
  - Frequency (monthly, quarterly, yearly)
  - Account it comes from

The Bill Management Strategy:

1. The First-of-Month Method
• On the 1st of each month, load your Bills card
• Calculate total monthly bills: $1,847
• Transfer this amount immediately
• Rest of your money is for other expenses

2. Weekly Bill Check
• Every Sunday, review upcoming bills for the week
• SpendFlow shows you what's due in the next 7 days
• Ensure your Bills card has enough balance
• Transfer more money if needed

3. The Bill Calendar
• Use SpendFlow's calendar view
• See all bills laid out for the month
• Plan around large bill weeks
• Avoid big purchases right before bill-heavy periods

Avoiding Bill Stress:

1. The Bill Buffer
• Keep an extra $200-300 in your Bills card
• Covers unexpected bill increases
• Prevents overdraft fees
• Gives you peace of mind

2. Annual Bill Planning
• Some bills come yearly (insurance, subscriptions)
• Divide annual amount by 12
• Save this amount monthly in your Bills card
• When the annual bill hits, you're ready

3. Bill Increase Preparation
• Utilities fluctuate seasonally
• Summer: higher electric (AC)
• Winter: higher gas (heating)
• Plan for 20% seasonal increases

Smart Bill Optimization:

1. The Bill Audit (Do This Quarterly)
• Review all recurring payments
• Ask: "Do I still use this subscription?"
• Cancel unused services immediately
• Negotiate better rates on essential services

2. Bundle Opportunities
• Internet + phone + TV bundles
• Insurance multi-policy discounts
• Annual payment discounts (vs. monthly)
• Can save 10-20% on total bills

3. Automatic vs. Manual Payments
• Set up autopay for fixed bills (rent, insurance)
• Keep manual payment for variable bills (utilities)
• This way you review variable costs monthly
• Catch unusual increases quickly

Using SpendFlow's Bill Features:

1. Payment Reminders
• Set alerts 3 days before each bill is due
• Never miss a payment deadline
• Avoid late fees and credit score damage

2. Bill History Tracking
• See how your bills change over time
• Identify seasonal patterns
• Spot gradual increases that need attention
• Track successful negotiations

3. Budget Integration
• Bills are part of your overall budget
• Fixed bills are easy to budget for
• Variable bills need buffer room
• Track bills vs. other spending categories

The Emergency Bill Plan:

What if you can't pay a bill?
1. Contact the company immediately
2. Explain your situation honestly
3. Ask for a payment plan or extension
4. Many companies prefer this to non-payment
5. Update your SpendFlow tracking with the new plan

Bill Stress Prevention:
• Never ignore bills hoping they'll go away
• Open all bills immediately when they arrive
• Question any unusual increases
• Keep 3 months of bills as emergency fund

The Monthly Bill Review:
• Last Sunday of each month
• Review all bills paid that month
• Look for any increases or changes
• Plan for next month's bill schedule
• Celebrate staying on top of everything

Pro Tips:
• Pay bills on the same day each month
• Use SpendFlow's notes to track confirmation numbers
• Screenshot payment confirmations
• Keep a simple spreadsheet backup of all bills

Remember: Bills are the foundation of your budget. Get these right first, then worry about optimizing other spending. SpendFlow makes it easy to stay organized and never miss a payment.

A good bill management system removes stress and frees up mental energy for other financial goals.`
    };

const BlogScreen = ({ navigation }) => {
  const featuredPost = useMemo(() => ({
    title: 'Getting Started with SpendFlow: Your Complete Guide',
    excerpt: 'Learn how to set up your SpendFlow account, create virtual cards, track expenses, and start building better financial habits today.',
    category: 'Getting Started',
    readTime: '5 min read',
    date: 'Nov 25, 2024',
    image: '🚀',
    slug: 'getting-started',
    content: articleContent['getting-started']
  }), []);

  const blogPosts = useMemo(() => ([
    {
      title: 'How to Create the Perfect Budget with SpendFlow',
      excerpt: 'Step-by-step guide to setting up category budgets that actually work for your lifestyle.',
      category: 'Budgeting',
      readTime: '4 min read',
      date: 'Nov 22, 2024',
      image: '💰',
      slug: 'perfect-budget',
      content: articleContent['perfect-budget']
    },
    {
      title: 'Virtual Cards: Organize Your Spending Like a Pro',
      excerpt: 'Learn how to use virtual cards to separate and track different types of expenses.',
      category: 'Tips',
      readTime: '3 min read',
      date: 'Nov 20, 2024',
      image: '💳',
      slug: 'virtual-cards',
      content: articleContent['virtual-cards']
    },
    {
      title: 'Setting Savings Goals You\'ll Actually Achieve',
      excerpt: 'Tips for creating realistic savings goals and staying motivated until you reach them.',
      category: 'Savings',
      readTime: '5 min read',
      date: 'Nov 18, 2024',
      image: '🎯',
      slug: 'savings-goals',
      content: articleContent['savings-goals']
    },
    {
      title: 'Track Your Spending: Why Manual Entry Works Better',
      excerpt: 'Discover why manually tracking expenses leads to better financial awareness than automatic imports.',
      category: 'Mindset',
      readTime: '4 min read',
      date: 'Nov 15, 2024',
      image: '✏️',
      slug: 'manual-tracking',
      content: articleContent['manual-tracking']
    },
    {
      title: 'Using Charts to Understand Your Money',
      excerpt: 'How to read SpendFlow\'s charts and use data to make smarter financial decisions.',
      category: 'Analytics',
      readTime: '4 min read',
      date: 'Nov 12, 2024',
      image: '📊',
      slug: 'charts-insights',
      content: articleContent['charts-insights']
    },
    {
      title: 'Managing Direct Debits and Recurring Bills',
      excerpt: 'Never miss a payment again. Learn how to track and manage all your recurring expenses.',
      category: 'Bills',
      readTime: '3 min read',
      date: 'Nov 10, 2024',
      image: '📅',
      slug: 'direct-debits',
      content: articleContent['direct-debits']
    }
  ]), []);

  const handleReadPost = (post) => {
    navigation.navigate('BlogArticle', { post });
  };

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
        url="https://spendflow.uk/blog"
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
            <TouchableOpacity style={styles.featuredPost} onPress={() => handleReadPost(featuredPost)}>
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
                <TouchableOpacity key={index} style={styles.postCard} onPress={() => handleReadPost(post)}>
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
              Want SpendFlow tips and updates? Contact us directly!
            </Text>
            <TouchableOpacity 
              style={styles.newsletterButton}
              onPress={() => navigation.navigate('Contact')}
            >
              <Text style={styles.newsletterButtonText}>Get in Touch</Text>
            </TouchableOpacity>
            <Text style={styles.newsletterNote}>
              We'll keep you updated on new features and guides.
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
