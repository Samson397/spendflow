# 🚀 Deployment Guide - SpendFlow

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- Firebase project with Firestore, Auth, Storage, and Functions enabled
- (Optional) DeepSeek API key for AI features

---

## Environment Setup

### 1. Local Development

Create `.env.local` in the project root (not tracked in git):

```bash
# Firebase Configuration (from Firebase Console > Project Settings)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
EXPO_PUBLIC_FIREBASE_VAPID_KEY=your_web_push_vapid_key

# AI Service (optional)
EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key

# Development
NODE_ENV=development
```

### 2. Production Deployment

Set environment variables in your hosting platform:

#### Firebase Hosting
```bash
firebase functions:config:set \
  firebase.api_key="your_prod_api_key" \
  firebase.auth_domain="your_project.firebaseapp.com" \
  firebase.project_id="your_project_id" \
  firebase.storage_bucket="your_project.firebasestorage.app" \
  firebase.messaging_sender_id="your_messaging_sender_id" \
  firebase.app_id="your_firebase_app_id" \
  firebase.measurement_id="your_measurement_id" \
  firebase.vapid_key="your_web_push_vapid_key"
```

#### Expo Cloud Build
Set in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your_prod_api_key",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "your_project.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "your_project_id",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "your_project.firebasestorage.app",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "your_messaging_sender_id",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "your_firebase_app_id",
        "EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID": "your_measurement_id",
        "EXPO_PUBLIC_FIREBASE_VAPID_KEY": "your_web_push_vapid_key",
        "EXPO_PUBLIC_DEEPSEEK_API_KEY": "your_deepseek_api_key"
      }
    }
  }
}
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Configure Firebase

```bash
# Initialize Firebase (if not already done)
firebase init

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions
```

### 3. Set Up Service Workers

Service workers automatically receive Firebase config via environment variables at build time. No manual configuration needed.

---

## Development

### Start Dev Server

```bash
# Using npx expo (recommended)
npx expo start --web

# Or using installed expo-cli
expo start --web
```

### Run Tests

```bash
npm test
```

### Build for Web

```bash
npm run build:web
```

---

## Production Deployment

### Deploy to Firebase Hosting

```bash
# Build the web app
npm run build:web

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Deploy to Expo

```bash
# Using EAS (Expo Application Services)
eas build --platform ios --auto-submit
eas build --platform android --auto-submit

# Or submit manually
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## Security Checklist

Before deploying to production:

- [ ] All Firebase credentials are in environment variables (not in source code)
- [ ] `.env.local` is in `.gitignore` and never committed
- [ ] DeepSeek API key (if used) is in environment variables only
- [ ] Service workers are receiving injected config at build time
- [ ] Firebase security rules are properly configured
- [ ] HTTPS is enforced on all domains
- [ ] CORS is properly configured for API calls
- [ ] Rate limiting is enabled on Firebase Functions
- [ ] Audit logs are enabled in Firebase Console

---

## Troubleshooting

### Issue: "Firebase configuration is missing"

**Solution**: Ensure all `EXPO_PUBLIC_FIREBASE_*` environment variables are set in `.env.local` (dev) or hosting environment (production).

### Issue: "AI features not working"

**Solution**: Set `EXPO_PUBLIC_DEEPSEEK_API_KEY` in environment variables. AI features are disabled by default when the key is missing.

### Issue: "Service worker not receiving config"

**Solution**: Rebuild the app. Service workers receive config at build time via environment variables.

### Issue: "Push notifications not working"

**Solution**: 
1. Verify `EXPO_PUBLIC_FIREBASE_VAPID_KEY` is set
2. Check that service workers are properly registered
3. Verify Firebase Cloud Messaging is enabled in Firebase Console

### Issue: "Node.js version incompatibility"

**Solution**: Use Node.js 18+ (LTS recommended). If using Node 23+, set:
```bash
export NODE_OPTIONS=--openssl-legacy-provider
```

---

## Monitoring & Maintenance

### Monitor Firebase

- Firebase Console: https://console.firebase.google.com
- Check real-time database usage
- Monitor Cloud Functions logs
- Review security rules for issues

### Monitor Errors

- Check browser console for client-side errors
- Review Firebase Functions logs for server-side errors
- Set up error tracking with Sentry or similar

### Update Dependencies

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Audit for vulnerabilities
npm audit
npm audit fix
```

---

## Support

For issues or questions:
- Email: spendflowapp@gmail.com
- GitHub Issues: https://github.com/Samson397/SpendFlow/issues
- Documentation: https://github.com/Samson397/SpendFlow/wiki

---

**Last Updated**: November 30, 2025  
**Status**: ✅ Production Ready
