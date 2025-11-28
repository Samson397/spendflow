# SpendFlow Extension Troubleshooting

## Service Worker Inactive Issue

If you see "Service worker inactive" in `chrome://extensions/`, here's how to fix it:

### Quick Fix:
1. **Go to** `chrome://extensions/`
2. **Find SpendFlow extension**
3. **Click "Reload"** button
4. **Click "Inspect views: service worker"** to check if it starts
5. **Try the extension** - click the icon

### If Still Inactive:

#### Method 1: Manual Restart
1. **Disable** the extension (toggle off)
2. **Wait 5 seconds**
3. **Enable** the extension (toggle on)
4. **Check** if service worker is now active

#### Method 2: Reload Extension
1. **Remove** the extension completely
2. **Reload** by clicking "Load unpacked" again
3. **Select** the `/extension/` folder
4. **Test** the extension

#### Method 3: Check Console
1. **Right-click** extension icon → "Inspect popup"
2. **Check Console** for errors
3. **Look for** "SpendFlow Extension: Initializing..." message

### Common Causes:

#### 1. **Permissions Issue**
- Extension needs `scripting`, `storage`, `tabs`, `alarms` permissions
- Check manifest.json has all required permissions

#### 2. **Chrome Version**
- Manifest V3 requires Chrome 88+
- Update Chrome if using older version

#### 3. **File Access**
- Make sure all files are in `/extension/` folder:
  - `manifest.json`
  - `popup.html`
  - `popup.css`
  - `popup.js`
  - `background.js`
  - `simple-data-bridge.js`
  - `icons/` folder

### Debug Steps:

#### 1. Check Service Worker Console
1. Go to `chrome://extensions/`
2. Find SpendFlow extension
3. Click "Inspect views: service worker"
4. Look for console messages:
   - ✅ "SpendFlow Background Service Worker starting..."
   - ✅ "SpendFlow Extension installed: install"
   - ✅ "Context menu created"
   - ✅ "Default settings saved"

#### 2. Check Extension Console
1. Click SpendFlow extension icon
2. Right-click popup → "Inspect"
3. Look for console messages:
   - ✅ "SpendFlow Extension: Initializing..."
   - ✅ "Starting SpendFlow data extraction..."
   - ✅ "Data retrieved from SpendFlow tab: ..."

#### 3. Test Basic Functionality
1. **Right-click** on any webpage
2. **Look for** "Add expense to SpendFlow" in context menu
3. **Click extension icon** - should open popup
4. **Check** if refresh button (🔄) works

### Manual Service Worker Activation:

If service worker won't start automatically:

1. **Open DevTools** on any webpage (F12)
2. **Go to Application tab**
3. **Click Service Workers** in left sidebar
4. **Find** SpendFlow extension
5. **Click "Start"** if stopped

### Still Not Working?

#### Check Chrome Flags:
1. Go to `chrome://flags/`
2. Search for "Extensions"
3. Make sure these are enabled:
   - "Extensions on chrome:// URLs"
   - "Extension APIs"

#### Reset Extension:
1. **Backup** your `/extension/` folder
2. **Remove** extension from Chrome
3. **Restart** Chrome completely
4. **Load** extension again

#### Alternative Testing:
1. **Try in Incognito** mode (allow extension in incognito)
2. **Test in different Chrome profile**
3. **Try in Edge** (supports Chrome extensions)

### Expected Behavior:

When working correctly:
- ✅ Service worker shows "Active" in chrome://extensions/
- ✅ Extension icon clickable in toolbar
- ✅ Popup opens with SpendFlow interface
- ✅ Right-click context menu appears
- ✅ Console shows initialization messages

### Get Help:

If none of these steps work:
1. **Check Chrome version**: Must be 88+
2. **Try different browser**: Edge, Brave (Chromium-based)
3. **Check file permissions**: Make sure Chrome can read extension folder
4. **Restart computer**: Sometimes helps with permission issues

---

**Note**: Service workers in Chrome extensions can be finicky. The keepalive mechanism should prevent most inactive issues, but manual reload is sometimes needed during development.
