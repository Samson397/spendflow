# SpendFlow Extension Icons

You need to create the following icon files in this directory:

- `icon-16.png` (16x16px) - Toolbar icon
- `icon-32.png` (32x32px) - Popup header
- `icon-48.png` (48x48px) - Extension management
- `icon-128.png` (128x128px) - Chrome Web Store

## Icon Requirements:
- Use the SpendFlow logo/branding
- Background should be transparent or the brand purple (#667eea)
- Should be recognizable at small sizes
- PNG format with proper transparency

## Quick Creation:
You can use the existing `/assets/logo.png` file and resize it to create these icons:

1. Open `/assets/logo.png` in an image editor
2. Resize to each required size
3. Save as PNG with transparency
4. Place in this `/icons/` folder

## Alternative:
Copy the existing logo file 4 times and rename:
```bash
cp ../../assets/logo.png icon-16.png
cp ../../assets/logo.png icon-32.png  
cp ../../assets/logo.png icon-48.png
cp ../../assets/logo.png icon-128.png
```

The browser will automatically resize them, though dedicated sizes look better.
