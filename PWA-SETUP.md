# SpendFlow PWA Setup Guide

## Overview
SpendFlow is configured as a Progressive Web App (PWA) with full home screen installation support for iOS, Android, and Desktop.

## Features
- ✅ Custom app icon (SpendFlow logo)
- ✅ Custom app name: "SpendFlow"
- ✅ Standalone display mode (no browser UI)
- ✅ Offline support via Service Worker
- ✅ Custom domain: https://spendflow.uk
- ✅ Theme color: #667eea (brand purple)
- ✅ App shortcuts for quick actions

## Installation Instructions

### iOS (iPhone/iPad)
1. Open Safari and navigate to https://spendflow.uk
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. The SpendFlow app icon will appear on your home screen

### Android (Chrome)
1. Open Chrome and navigate to https://spendflow.uk
2. Tap the menu (3 dots) in the top right
3. Tap "Install app" or "Add to Home Screen"
4. Tap "Install" when prompted
5. The SpendFlow app will be installed

### Desktop (Chrome/Edge)
1. Navigate to https://spendflow.uk
2. Look for the install icon (⊕) in the address bar
3. Click the icon and select "Install"
4. SpendFlow will open as a desktop app

## Development

### Building for Production
```bash
npm run build:web
```
This command:
1. Exports the Expo web build
2. Injects custom HTML template with PWA meta tags
3. Copies manifest.json and service-worker.js to dist/

### Deploying to Firebase
```bash
npm run deploy
```
This command builds and deploys in one step.

Or manually:
```bash
firebase deploy --only hosting
```

## File Structure
```
SpendFlow/
├── web/
│   ├── index.html          # Custom HTML template with PWA meta tags
│   └── manifest.json       # PWA manifest (source)
├── public/
│   ├── manifest.json       # PWA manifest (configured for build)
│   └── service-worker.js   # Service worker for offline support
├── scripts/
│   ├── inject-html.js      # Injects custom HTML into build
│   └── copy-public.js      # Copies PWA files to dist
└── dist/                   # Build output (deployed to Firebase)
    ├── index.html          # Final HTML with PWA tags
    ├── manifest.json       # PWA manifest
    ├── service-worker.js   # Service worker
    └── assets/             # App assets (logo, icons, etc.)
```

## PWA Configuration

### Manifest (manifest.json)
- **Name**: SpendFlow - Smart Finance Management
- **Short Name**: SpendFlow
- **Start URL**: https://spendflow.uk/?source=pwa
- **Scope**: https://spendflow.uk/
- **Display**: standalone
- **Theme Color**: #667eea
- **Background Color**: #667eea
- **Icons**: Multiple sizes (48px to 512px)

### Service Worker (service-worker.js)
- Caches essential files for offline access
- Implements cache-first strategy
- Auto-updates when new version is deployed

### Apple Touch Icons
All sizes configured for optimal display on iOS devices:
- 57x57, 72x72, 76x76, 114x114, 120x120, 144x144, 152x152, 180x180

## Troubleshooting

### Icon not showing on iOS
1. Clear Safari cache
2. Delete the app from home screen
3. Reinstall from Safari
4. Make sure you're using Safari (not Chrome on iOS)

### App not installing
1. Check that you're on HTTPS (https://spendflow.uk)
2. Verify manifest.json is accessible
3. Check browser console for errors
4. Try in incognito/private mode

### Changes not appearing
1. Clear browser cache
2. Uninstall and reinstall the PWA
3. Check Firebase Hosting cache headers
4. Wait a few minutes for CDN propagation

## Testing

### Local Testing
```bash
npm run build:web
cd dist
python3 -m http.server 8000
```
Then visit http://localhost:8000

### Production Testing
Visit https://spendflow.uk and test:
- [ ] Logo appears correctly
- [ ] App name is "SpendFlow"
- [ ] Install prompt appears
- [ ] Standalone mode works (no browser UI)
- [ ] Offline mode works (after first visit)
- [ ] Theme color matches brand (#667eea)

## Future Enhancements
- [ ] Add iOS splash screens for different device sizes
- [ ] Implement push notifications
- [ ] Add app shortcuts for common actions
- [ ] Create app store listings (iOS/Android)
- [ ] Add share target for receipts/transactions

## Support
For issues or questions, check:
- Firebase Console: https://console.firebase.google.com/project/spedflowapp
- PWA Checklist: https://web.dev/pwa-checklist/
