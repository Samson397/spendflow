const fs = require('fs');
const path = require('path');

// Copy public files to dist
const publicDir = path.join(__dirname, '../public');
const distDir = path.join(__dirname, '../dist');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Files to copy
const filesToCopy = ['manifest.json', 'service-worker.js'];

filesToCopy.forEach(file => {
  const src = path.join(publicDir, file);
  const dest = path.join(distDir, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} to dist/`);
  } else {
    console.warn(`⚠ ${file} not found in public/`);
  }
});

console.log('✓ Public files copied successfully');
