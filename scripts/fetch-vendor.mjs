// Downloads the third-party libraries and face-recognition models into www/ so the APK works fully offline.
// Run automatically by the GitHub workflow. Locally:  npm run vendor
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'www');
const CDN = 'https://cdn.jsdelivr.net';
const MODELS = `${CDN}/gh/justadudewhohacks/face-api.js@master/weights`;

const files = [
  [`${CDN}/npm/jsqr@1.4.0/dist/jsQR.js`, 'vendor/jsQR.js'],
  [`${CDN}/npm/face-api.js@0.22.2/dist/face-api.min.js`, 'vendor/face-api.min.js'],
  [`${CDN}/npm/xlsx@0.18.5/dist/xlsx.full.min.js`, 'vendor/xlsx.full.min.js'],
  ...[
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
  ].map((n) => [`${MODELS}/${n}`, `models/${n}`]),
];

for (const [url, rel] of files) {
  const dest = join(root, rel);
  await mkdir(dirname(dest), { recursive: true });
  let attempt = 0;
  for (;;) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 200) throw new Error(`suspiciously small (${buf.length} bytes)`);
      await writeFile(dest, buf);
      console.log(`ok   ${rel}  (${(buf.length / 1024).toFixed(0)} KB)`);
      break;
    } catch (e) {
      if (++attempt >= 3) {
        console.error(`FAIL ${rel}: ${e.message}\n     ${url}`);
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}
for (const rel of files.map((f) => f[1])) await stat(join(root, rel)); // every file must exist
console.log('All vendor files downloaded.');
