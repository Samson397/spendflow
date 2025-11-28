const fs = require('fs');
const path = require('path');

// Read the custom HTML template
const templatePath = path.join(__dirname, '../web/index.html');
const distHtmlPath = path.join(__dirname, '../dist/index.html');

if (!fs.existsSync(templatePath)) {
  console.error('❌ Custom HTML template not found at:', templatePath);
  process.exit(1);
}

if (!fs.existsSync(distHtmlPath)) {
  console.error('❌ Dist index.html not found. Run expo export first.');
  process.exit(1);
}

// Read both files
const customHtml = fs.readFileSync(templatePath, 'utf8');
const distHtml = fs.readFileSync(distHtmlPath, 'utf8');

// Extract the script tag from dist HTML (the bundled JS)
const scriptMatch = distHtml.match(/<script[^>]*src="[^"]*"[^>]*><\/script>/);
if (!scriptMatch) {
  console.error('❌ Could not find script tag in dist HTML');
  process.exit(1);
}

const scriptTag = scriptMatch[0];

// Inject the script tag into custom HTML before </body>
const finalHtml = customHtml.replace('</body>', `  ${scriptTag}\n</body>`);

// Write the final HTML
fs.writeFileSync(distHtmlPath, finalHtml, 'utf8');

console.log('✓ Custom HTML template injected successfully');
console.log('✓ Script tag:', scriptTag);
