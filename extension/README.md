# SpendFlow Browser Extension

A Chrome/Firefox extension for quickly tracking expenses and checking your SpendFlow stats from any website.

## Features

### 🚀 **Quick Expense Tracking**
- Add expenses instantly from any website
- Auto-fill amount from selected text
- Smart category selection
- Card selection with balance display

### 📊 **Quick Stats**
- View monthly spending at a glance
- Check total balance across all accounts
- See recent transaction summary

### 🔄 **Smart Sync**
- Automatic sync with your SpendFlow account
- Offline support with pending sync
- Real-time badge showing unsynced expenses

### 🎯 **Context Integration**
- Right-click any price to add as expense
- Extract amounts from selected text
- Auto-fill description from page context

## Installation

### Chrome/Edge (Developer Mode)
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `/extension/` folder
5. The SpendFlow extension will appear in your toolbar

### Firefox (Developer Mode)
1. Open Firefox and go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file in `/extension/`

## Usage

### First Time Setup
1. **Sign in to SpendFlow**: Visit https://spendflow.uk and sign in
2. **Click Extension**: Click the SpendFlow icon in your browser toolbar
3. **Grant Permissions**: Allow the extension to access SpendFlow data

### Adding Expenses
1. **Click Extension Icon**: Opens the quick-add popup
2. **Fill Details**: Amount, category, description, card
3. **Submit**: Expense is added and synced to your account
4. **Success**: See confirmation and add another or view in app

### Context Menu (Right-Click)
1. **Select Price**: Highlight any price on a webpage (e.g., "$15.99")
2. **Right-Click**: Choose "Add expense to SpendFlow"
3. **Auto-Fill**: Amount and description are pre-filled
4. **Complete**: Just select category and card, then submit

### Quick Stats
- **Monthly Spending**: See how much you've spent this month
- **Total Balance**: View combined balance across all accounts
- **Badge Counter**: Shows number of unsynced expenses

## Permissions Explained

- **Storage**: Save your preferences and cache data locally
- **Active Tab**: Read selected text for auto-filling amounts
- **Context Menus**: Add right-click "Add to SpendFlow" option
- **Host Permissions**: Sync data with SpendFlow website

## Privacy & Security

- ✅ **No Data Collection**: Extension only accesses your SpendFlow data
- ✅ **Local Storage**: Sensitive data cached locally, not sent elsewhere
- ✅ **Secure Sync**: Uses same authentication as SpendFlow website
- ✅ **Open Source**: Full code available for review

## Troubleshooting

### "Sign In Required" Message
- Make sure you're signed in to https://spendflow.uk
- Refresh the extension popup
- Check that cookies are enabled

### Expenses Not Syncing
- Check internet connection
- Ensure you're signed in to SpendFlow
- Badge shows number of pending syncs
- Manual sync happens every 5 minutes

### Extension Not Working
- Reload the extension in `chrome://extensions/`
- Check browser console for errors
- Ensure SpendFlow website is accessible

## Development

### File Structure
```
extension/
├── manifest.json       # Extension configuration
├── popup.html         # Main popup interface
├── popup.css          # Popup styling
├── popup.js           # Popup logic & API calls
├── background.js      # Service worker & sync
├── icons/            # Extension icons
└── README.md         # This file
```

### Key Technologies
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background sync and context menus
- **Chrome Storage API**: Local caching and preferences
- **Firebase Integration**: Sync with SpendFlow backend

### Future Enhancements
- [ ] Budget alerts and warnings
- [ ] Spending insights and trends
- [ ] Receipt scanning via camera
- [ ] Keyboard shortcuts
- [ ] Dark mode support
- [ ] Multi-currency support

## Support

For issues or feature requests:
1. Check the troubleshooting section above
2. Visit https://spendflow.uk/support
3. Contact support through the main SpendFlow app

---

**Made with ❤️ for SpendFlow users**
