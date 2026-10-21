// Runs after `cap add android` / `cap sync`. Makes the generated android/ project match this app:
//   camera permission, full-screen-safe theme, FUO app icon and launch screen.
// Safe to run more than once.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const proj = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(proj, 'android', 'app', 'src', 'main', 'res');
const manifestPath = join(proj, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!existsSync(manifestPath)) {
  console.error('android/ not found. Run:  npm run android:add');
  process.exit(1);
}

/* 1. Manifest: camera permission (face scan + QR scan) */
let m = await readFile(manifestPath, 'utf8');
if (!m.includes('android.permission.CAMERA')) {
  m = m.replace(
    /<application/,
    '<uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n    <uses-feature android:name="android.hardware.camera.front" android:required="false" />\n    <application',
  );
  await writeFile(manifestPath, m);
  console.log('manifest: added CAMERA permission');
}

/* 2. Theme: keep the app below the status bar on Android 15+ (no forced edge-to-edge) */
const stylesPath = join(res, 'values', 'styles.xml');
if (existsSync(stylesPath)) {
  let s = await readFile(stylesPath, 'utf8');
  if (!s.includes('windowOptOutEdgeToEdgeEnforcement')) {
    s = s.replace(
      /(<style name="AppTheme\.NoActionBar"[^>]*>)/,
      '$1\n        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>\n        <item name="android:statusBarColor">#06240f</item>\n        <item name="android:navigationBarColor">#06240f</item>',
    );
    await writeFile(stylesPath, s);
    console.log('styles: edge-to-edge opt-out + brand bar colours');
  }
}

/* 3. Icons and launch screen, generated from the PNGs in www/ with ImageMagick */
function magick(args) {
  for (const bin of ['magick', 'convert']) {
    try { execFileSync(bin, args, { stdio: 'pipe' }); return; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  throw new Error('ImageMagick (magick/convert) is not installed');
}
const www = join(proj, 'www');
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const adaptive = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
for (const d of Object.keys(legacy)) {
  const dir = join(res, `mipmap-${d}`);
  await mkdir(dir, { recursive: true });
  magick([join(www, 'icon-512.png'), '-resize', `${legacy[d]}x${legacy[d]}`, join(dir, 'ic_launcher.png')]);
  magick([join(www, 'icon-512.png'), '-resize', `${legacy[d]}x${legacy[d]}`, join(dir, 'ic_launcher_round.png')]);
  magick([join(www, 'icon-maskable-512.png'), '-resize', `${adaptive[d]}x${adaptive[d]}`, join(dir, 'ic_launcher_foreground.png')]);
}
const bgXml = join(res, 'values', 'ic_launcher_background.xml');
await writeFile(bgXml, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#06240F</color>\n</resources>\n');
console.log('icons: generated from icon-512.png and icon-maskable-512.png');

for (const e of await readdir(res)) {
  if (!e.startsWith('drawable')) continue;
  const f = join(res, e, 'splash.png');
  if (!existsSync(f)) continue;
  magick(['-size', '1080x1920', 'xc:#06240f', '(', join(www, 'logo.png'), '-resize', '360x360', ')',
    '-gravity', 'center', '-composite', f]);
}
console.log('launch screen: crest on green');
