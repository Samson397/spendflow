# Test SpendFlow Extension

## Quick Installation Test

### 1. Install Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle top right)
4. Click "Load unpacked"
5. Select the `/extension/` folder
6. Extension should appear with SpendFlow icon

### 2. Test Basic Functionality
1. **Click Extension Icon** in toolbar
2. **Should See**: Loading → Demo user interface
3. **Check Stats**: Monthly spent: £456.78, Balance: £2140.75
4. **Check Cards**: Should show Monzo, Starling, Halifax options

### 3. Test Adding Expense
1. **Fill Form**:
   - Amount: 15.99
   - Category: Food & Dining
   - Description: Coffee and pastry
   - Card: Select any card
2. **Click "Add Expense"**
3. **Should See**: Success message with expense details
4. **Click "Add Another"**: Should return to form

### 4. Test Context Menu
1. **Go to any website** (e.g., Amazon, eBay)
2. **Find a price** (e.g., "$25.99", "£15.00")
3. **Select the price text**
4. **Right-click** → Should see "Add expense to SpendFlow"
5. **Click it** → Extension popup should open with amount pre-filled

### 5. Check Console
1. **Right-click extension icon** → "Inspect popup"
2. **Check Console** for any errors
3. **Should see**: "SpendFlow Extension: Initializing..." and "User data refreshed successfully"

## Expected Behavior

### ✅ Working Correctly:
- Extension loads without errors
- Demo user automatically created
- Stats display properly
- Cards populate in dropdown
- Form submission works
- Success/error messages show
- Context menu appears on right-click

### ❌ Common Issues:
- **Permissions Error**: Make sure "scripting" permission is in manifest
- **Storage Error**: Check if chrome.storage is available
- **Context Menu Missing**: Reload extension in chrome://extensions/
- **Popup Not Loading**: Check console for JavaScript errors

## Troubleshooting

### If Extension Won't Load:
1. Check manifest.json syntax
2. Ensure all files exist in /extension/ folder
3. Check Chrome version (needs Manifest V3 support)

### If Popup Shows Errors:
1. Open developer tools on popup
2. Check console for specific error messages
3. Verify all permissions in manifest.json

### If Context Menu Missing:
1. Reload extension
2. Check background.js is loading
3. Try right-clicking on different websites

## Demo Data

The extension uses mock data for testing:
- **User**: demo@spendflow.uk
- **Cards**: Monzo (£1250.50), Starling (£890.25), Halifax Credit (£0/£2000)
- **Stats**: £456.78 spent this month, £2140.75 total balance

In production, this would sync with real SpendFlow Firebase data.

## Next Steps

Once basic functionality is confirmed:
1. Test in different browsers (Firefox, Edge)
2. Integrate with real Firebase API
3. Add more robust error handling
4. Prepare for Chrome Web Store submission
