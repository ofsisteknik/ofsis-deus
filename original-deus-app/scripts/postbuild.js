const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('Error: "dist" directory not found. Please run "npm run build:web" first.');
  process.exit(1);
}

// 1. Create .nojekyll file to prevent GitHub Pages from ignoring directories starting with underscore (e.g. _expo)
try {
  fs.writeFileSync(path.join(distDir, '.nojekyll'), '');
  console.log('✓ Successfully created .nojekyll file in dist folder.');
} catch (err) {
  console.error('Failed to create .nojekyll file:', err.message);
}

// 2. Copy index.html to 404.html to support client-side routing on refreshes and deep links
try {
  const indexHtml = path.join(distDir, 'index.html');
  const fallbackHtml = path.join(distDir, '404.html');
  if (fs.existsSync(indexHtml)) {
    fs.copyFileSync(indexHtml, fallbackHtml);
    console.log('✓ Successfully copied index.html to 404.html for SPA router support.');
  } else {
    console.warn('Warning: index.html not found, skipping 404.html copy.');
  }
} catch (err) {
  console.error('Failed to copy index.html to 404.html:', err.message);
}

// 3. Create empty earthquakes.json placeholder (GitHub Actions will keep this updated)
try {
  const earthquakesPath = path.join(distDir, 'earthquakes.json');
  if (!fs.existsSync(earthquakesPath)) {
    fs.writeFileSync(earthquakesPath, '[]');
    console.log('✓ Created placeholder earthquakes.json (will be populated by GitHub Actions).');
  } else {
    console.log('✓ earthquakes.json already exists, keeping existing data.');
  }
} catch (err) {
  console.error('Failed to create earthquakes.json placeholder:', err.message);
}

console.log('=== Post-build steps completed successfully! Ready for GitHub Pages deployment. ===');
