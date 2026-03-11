import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const OUTPUT_DIR = path.join(repoRoot, 'public', 'splash');
const LOGO_PATH = path.join(repoRoot, 'public', 'logo.svg');
const BG_COLOR = { r: 10, g: 10, b: 10, alpha: 1 };

const SIZES = [
  { width: 1125, height: 2436, label: 'iPhone X/XS/11 Pro' },
  { width: 1242, height: 2688, label: 'iPhone XS Max/11 Pro Max' },
  { width: 828,  height: 1792, label: 'iPhone XR/11' },
  { width: 1170, height: 2532, label: 'iPhone 12/13/14' },
  { width: 1284, height: 2778, label: 'iPhone 12/13/14 Pro Max' },
  { width: 1179, height: 2556, label: 'iPhone 14 Pro' },
  { width: 1290, height: 2796, label: 'iPhone 14 Pro Max/15 Pro Max' },
  { width: 1320, height: 2868, label: 'iPhone 16 Pro Max' },
  { width: 1206, height: 2622, label: 'iPhone 16 Pro' },
  { width: 750,  height: 1334, label: 'iPhone 8' },
  { width: 1242, height: 2208, label: 'iPhone 8 Plus' },
  { width: 1536, height: 2048, label: 'iPad' },
  { width: 1668, height: 2224, label: 'iPad Pro 10.5' },
  { width: 2048, height: 2732, label: 'iPad Pro 12.9' },
];

mkdirSync(OUTPUT_DIR, { recursive: true });

const logoSvg = readFileSync(LOGO_PATH);

async function generateSplash({ width, height, label }) {
  const shortestDim = Math.min(width, height);
  const logoSize = Math.round(shortestDim * 0.20);

  // Resize the SVG logo to the target size
  const resizedLogo = await sharp(logoSvg)
    .resize(logoSize, logoSize)
    .png()
    .toBuffer();

  const left = Math.round((width - logoSize) / 2);
  const top = Math.round((height - logoSize) / 2);

  const outputPath = path.join(OUTPUT_DIR, `splash-${width}x${height}.png`);

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([{ input: resizedLogo, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`✓ ${outputPath.split('/').slice(-1)[0]}  (${width}x${height}) — ${label}`);
}

console.log(`Generating ${SIZES.length} splash screens into ${OUTPUT_DIR} ...\n`);

for (const size of SIZES) {
  await generateSplash(size);
}

console.log('\nDone.');
