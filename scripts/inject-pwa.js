// Post-export: inject PWA manifest + iOS meta tags into dist/index.html
// Also copy public/ files into dist/

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
  console.error('dist/ not found. Run `npx expo export --platform web` first.');
  process.exit(1);
}

// Copy public/* to dist/
console.log('Copying public/ -> dist/');
const files = fs.readdirSync(PUBLIC);
for (const f of files) {
  const src = path.join(PUBLIC, f);
  const dst = path.join(DIST, f);
  fs.copyFileSync(src, dst);
  console.log(`  [OK] ${f}`);
}

// Inject PWA tags into index.html
const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

const pwaTags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#1B6B4A" />
    <meta name="description" content="AI가 추천하는 오늘의 코디" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="NextLook" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="application-name" content="NextLook" />`;

// Replace existing favicon link
html = html.replace(/<link rel="icon"[^>]*\/>/g, '');

// Insert PWA tags before </head>
html = html.replace('</head>', `${pwaTags}\n  </head>`);

fs.writeFileSync(indexPath, html);
console.log('\n[OK] Injected PWA tags into dist/index.html');
console.log('\nDone!');
