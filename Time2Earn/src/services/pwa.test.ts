import { generateQrMatrix, matrixToSvgPath } from '../lib/qr';

interface NodeFs {
  existsSync(p: string): boolean;
  readFileSync(p: string, encoding: string): string;
}
interface NodePath {
  resolve(...paths: string[]): string;
  join(...paths: string[]): string;
}

export function runPwaTests(): boolean {
  const assertions: Array<{ name: string; pass: boolean; expected?: unknown; actual?: unknown }> = [];

  function assertEqual(name: string, actual: unknown, expected: unknown) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    assertions.push({ name, pass, expected, actual });
    if (!pass) {
      console.error(`FAIL: ${name} -> expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  function assertTrue(name: string, condition: boolean) {
    assertions.push({ name, pass: condition });
    if (!condition) {
      console.error(`FAIL: ${name}`);
    } else {
      console.log(`PASS: ${name}`);
    }
  }

  console.log('\n--- Running Phase 15: PWA & App Shell Tests ---');

  // Node runtime environment reflection
  const envGlobal = globalThis as unknown as {
    require?: (mod: string) => unknown;
    process?: { cwd: () => string };
  };

  if (!envGlobal.require || !envGlobal.process) {
    console.log('Skipping filesystem tests in non-node environment');
    return true;
  }

  const fs = envGlobal.require('fs') as NodeFs;
  const path = envGlobal.require('path') as NodePath;
  const cwd = envGlobal.process.cwd();

  const publicDir = path.resolve(cwd, 'public');
  const indexHtmlPath = path.resolve(cwd, 'index.html');

  // 1. Web App Manifest Audit
  const manifestPath = path.join(publicDir, 'manifest.json');
  assertTrue('manifest.json exists in public directory', fs.existsSync(manifestPath));

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assertEqual('Manifest name', manifest.name, 'Time2Earn');
  assertEqual('Manifest short_name', manifest.short_name, 'Time2Earn');
  assertEqual('Manifest start_url', manifest.start_url, '/');
  assertEqual('Manifest display mode is standalone', manifest.display, 'standalone');
  assertEqual('Manifest theme_color', manifest.theme_color, '#080b11');
  assertEqual('Manifest background_color', manifest.background_color, '#080b11');
  assertEqual('Manifest orientation', manifest.orientation, 'portrait-primary');

  // Icons audit
  const icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> = manifest.icons || [];
  assertTrue('Manifest contains at least 3 icon definitions', icons.length >= 3);

  const has192 = icons.some((i) => i.sizes === '192x192' && (i.purpose === 'any' || !i.purpose));
  assertTrue('Manifest has 192x192 standard icon', has192);

  const has512 = icons.some((i) => i.sizes === '512x512' && (i.purpose === 'any' || !i.purpose));
  assertTrue('Manifest has 512x512 standard icon', has512);

  const hasMaskable = icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable');
  assertTrue('Manifest has 512x512 maskable icon for Android adaptive launcher', hasMaskable);

  // Icon files on disk audit
  assertTrue('pwa-192x192.png exists', fs.existsSync(path.join(publicDir, 'pwa-192x192.png')));
  assertTrue('pwa-512x512.png exists', fs.existsSync(path.join(publicDir, 'pwa-512x512.png')));
  assertTrue('pwa-maskable-512x512.png exists', fs.existsSync(path.join(publicDir, 'pwa-maskable-512x512.png')));
  assertTrue('apple-touch-icon.png exists', fs.existsSync(path.join(publicDir, 'apple-touch-icon.png')));

  // 2. Service Worker Security & Freshness Audit
  const swPath = path.join(publicDir, 'sw.js');
  assertTrue('sw.js exists in public directory', fs.existsSync(swPath));

  const swContent = fs.readFileSync(swPath, 'utf-8');
  assertTrue('Service worker registers cache version', swContent.includes('CACHE_NAME'));
  assertTrue('Service worker pre-caches offline.html', swContent.includes('/offline.html'));
  assertTrue('Service worker pre-caches manifest.json', swContent.includes('/manifest.json'));

  // Strict Data Integrity / Freshness Guard: NEVER cache Firestore / Firebase data
  assertTrue('Service worker has isFirebaseOrApi guard', swContent.includes('isFirebaseOrApi'));
  assertTrue('Service worker guards firestore.googleapis.com', swContent.includes('firestore.googleapis.com'));
  assertTrue('Service worker guards firebaseio.com', swContent.includes('firebaseio.com'));
  assertTrue('Service worker guards identitytoolkit.googleapis.com', swContent.includes('identitytoolkit.googleapis.com'));
  assertTrue('Service worker guards securetoken.googleapis.com', swContent.includes('securetoken.googleapis.com'));
  assertTrue('Service worker skips caching non-GET requests', swContent.includes("request.method !== 'GET'"));

  // 3. Offline Fallback Page Audit
  const offlinePath = path.join(publicDir, 'offline.html');
  assertTrue('offline.html exists in public directory', fs.existsSync(offlinePath));

  const offlineContent = fs.readFileSync(offlinePath, 'utf-8');
  assertTrue('offline.html has viewport meta tag', offlineContent.includes('name="viewport"'));
  assertTrue('offline.html has theme-color meta tag', offlineContent.includes('name="theme-color"'));
  assertTrue('offline.html contains offline explanation', offlineContent.toLowerCase().includes('offline'));
  assertTrue('offline.html has retry button', offlineContent.includes('Retry Connection'));

  // 4. Index.html PWA Tags Audit
  const indexContent = fs.readFileSync(indexHtmlPath, 'utf-8');
  assertTrue('index.html links manifest.json', indexContent.includes('rel="manifest"'));
  assertTrue('index.html links apple-touch-icon', indexContent.includes('rel="apple-touch-icon"'));
  assertTrue('index.html sets theme-color', indexContent.includes('name="theme-color" content="#080b11"'));
  assertTrue('index.html has mobile-web-app-capable tag', indexContent.includes('name="mobile-web-app-capable"'));
  assertTrue('index.html has apple-mobile-web-app-capable tag', indexContent.includes('name="apple-mobile-web-app-capable"'));

  // 5. Standalone QR Code Generator Audit
  const testUrl = 'https://time2earn.shop/player';
  const qrMatrix = generateQrMatrix(testUrl);
  assertTrue('QR matrix is generated as non-empty 2D array', Array.isArray(qrMatrix) && qrMatrix.length >= 25);
  assertEqual('QR matrix is square', qrMatrix.length, qrMatrix[0].length);

  // Finder pattern at (0, 0) should be true (core module)
  assertEqual('QR Finder pattern top-left core is true', qrMatrix[3][3], true);
  // Finder pattern at top-right
  assertEqual('QR Finder pattern top-right core is true', qrMatrix[3][qrMatrix.length - 4], true);
  // Finder pattern at bottom-left
  assertEqual('QR Finder pattern bottom-left core is true', qrMatrix[qrMatrix.length - 4][3], true);

  const svgPath = matrixToSvgPath(qrMatrix);
  assertTrue('QR matrix generates SVG path string', svgPath.length > 50);
  assertTrue('SVG path uses move and horizontal draws', svgPath.startsWith('M'));

  const allPassed = assertions.every((a) => a.pass);
  console.log(`\nPhase 15 Test Suite Completed: ${assertions.filter((a) => a.pass).length}/${assertions.length} assertions passed.\n`);
  return allPassed;
}
