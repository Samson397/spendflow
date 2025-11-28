# 💰 SpendFlow - Privacy-First Personal Finance App

> **Free personal finance tracking with complete privacy. No bank connections required.**

![SpendFlow](assets/hero.jpg)

## 🌟 Features

### 💳 **Virtual Card Management**
- Create unlimited virtual debit and credit cards
- Track balances and transactions per card
- Organize spending by category or purpose
- Custom card names and colors

### 📊 **Smart Analytics & Charts**
- Beautiful interactive charts and graphs
- Spending by category breakdowns
- Monthly trends and insights
- Export reports as PDF

### 💰 **Budget Management**
- Category-based budgets
- Visual progress tracking
- Spending alerts and notifications
- Budget vs actual comparison

### 🎯 **Savings Goals**
- Set multiple savings goals with target dates
- Track progress with visual charts
- Celebrate goal achievements
- Contribute from any account

### 🏦 **Savings Accounts**
- Create virtual savings accounts
- Easy transfers between accounts
- Track interest earnings
- Balance history

### 📅 **Direct Debit Automation**
- Track recurring payments and bills
- Import from CSV/spreadsheet
- Automatic payment processing
- Payment due date reminders

### 🔒 **Privacy & Security**
- **No bank connections** - Complete privacy
- **Manual entry only** - You control your data
- **Firebase Authentication** - Secure login
- **Cloud sync** - Access anywhere

### 🎨 **Additional Features**
- **Multi-theme support** - Light, dark, and custom themes
- **Multi-currency** - Track expenses in different currencies
- **Calendar view** - See transactions on calendar
- **Community tips** - Share money-saving advice
- **Leaderboard** - Compare savings progress
- **AI assistant** - Get financial insights
- **PWA support** - Install as mobile app

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Firebase account
- Expo CLI (for mobile development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Samson397/SpendFlow.git
cd SpendFlow
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your Firebase configuration
```

4. **Start the development server**
```bash
npm start
# or
expo start --web
```

5. **Open in browser**
Navigate to `http://localhost:8081`

## 🔧 Configuration

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password and Google)
3. Create Firestore database
4. Copy your Firebase config to `.env`

### Environment Variables

```bash
# Firebase Configuration (Client-Safe)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config

# App Configuration
APP_NAME=SpendFlow
APP_URL=https://your-domain.com
```

## 📱 Deployment

### Web Deployment (Firebase Hosting)
```bash
npm run build
firebase deploy
```

### Mobile App (Expo)
```bash
# iOS
expo build:ios

# Android  
expo build:android
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Firebase (Firestore, Functions, Auth)
- **Styling**: StyleSheet with theme system
- **Charts**: Custom chart components
- **PWA**: Service worker + manifest

### Project Structure
```
SpendFlow/
├── components/          # Reusable UI components
├── screens/            # App screens/pages
├── services/           # Business logic & API calls
├── contexts/           # React contexts (Auth, Theme, etc.)
├── utils/              # Helper functions
├── themes/             # Theme definitions
├── assets/             # Images, icons, fonts
├── functions/          # Firebase Cloud Functions
└── public/             # Static web assets
```

## 🎯 Key Principles

### Privacy First
- **No bank connections** - Users manually enter transactions
- **Local control** - Data only goes where user allows
- **Transparent** - Clear about what data is collected

### User Experience
- **Simple & intuitive** - Easy for anyone to use
- **Beautiful design** - Modern, clean interface
- **Fast & responsive** - Optimized performance

### Free Forever
- **No premium tiers** - All features available to everyone
- **No subscriptions** - Completely free to use
- **Open source** - Community driven development

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Email**: spendflowapp@gmail.com
- **Issues**: [GitHub Issues](https://github.com/Samson397/SpendFlow/issues)
- **Documentation**: [Wiki](https://github.com/Samson397/SpendFlow/wiki)

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Expo for cross-platform development
- React Native community for amazing tools
- All contributors and users

---

**Made with ❤️ for financial freedom**

*SpendFlow - Take control of your finances, privately and securely.*
