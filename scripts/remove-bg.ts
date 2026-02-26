import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const ELENI_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'eleni');

async function removeBlackBg(filePath: string) {
  const filename = path.basename(filePath);
  console.log(`Processing: ${filename}`);

  const image = sharp(filePath);
  const { width, height } = await image.metadata();
  if (!width || !height) return;

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  const channels = info.channels;

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    const brightness = r + g + b;
    if (brightness < 80) {
      pixels[i + 3] = 0;
    } else if (brightness < 140) {
      const alpha = Math.min(255, Math.round(((brightness - 80) / 60) * 255));
      pixels[i + 3] = Math.min(pixels[i + 3], alpha);
    }
  }

  const outPath = filePath;
  await sharp(pixels, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(outPath + '.tmp');

  fs.renameSync(outPath + '.tmp', outPath);
  const newSize = fs.statSync(outPath).size;
  console.log(`  Done: ${filename} (${Math.round(newSize / 1024)}KB)`);
}

async function main() {
  console.log('=== Removing black backgrounds from Eleni images ===\n');

  if (!fs.existsSync(ELENI_DIR)) {
    console.error('No eleni directory found');
    process.exit(1);
  }

  const files = fs.readdirSync(ELENI_DIR).filter(f => f.endsWith('.png'));
  console.log(`Found ${files.length} images\n`);

  for (const file of files) {
    try {
      await removeBlackBg(path.join(ELENI_DIR, file));
    } catch (err) {
      console.error(`  FAILED: ${file}`, err);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
