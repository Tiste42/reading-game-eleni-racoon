/**
 * Trim transparent padding from the generated Eleni character PNGs so the
 * raccoon fills the frame and renders at a consistent, large size in-game.
 * Backs up originals to public/images/generated/eleni/_untrimmed/ once.
 *
 * Run: npx tsx scripts/trim-eleni.ts
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'eleni');
const BACKUP = path.join(DIR, '_untrimmed');
fs.mkdirSync(BACKUP, { recursive: true });

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png'));
  for (const f of files) {
    const src = path.join(DIR, f);
    const backup = path.join(BACKUP, f);
    if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);

    const input = fs.readFileSync(backup); // always trim from the pristine original
    const meta = await sharp(input).metadata();
    const trimmed = await sharp(input)
      .trim({ threshold: 12 })
      .toBuffer();
    const tmeta = await sharp(trimmed).metadata();

    // Re-pad to a square canvas so object-contain keeps the character centered
    const side = Math.max(tmeta.width || 0, tmeta.height || 0);
    const pad = Math.round(side * 0.06); // small breathing room
    const square = side + pad * 2;
    const out = await sharp(trimmed)
      .extend({
        top: Math.round((square - (tmeta.height || 0)) / 2),
        bottom: square - (tmeta.height || 0) - Math.round((square - (tmeta.height || 0)) / 2),
        left: Math.round((square - (tmeta.width || 0)) / 2),
        right: square - (tmeta.width || 0) - Math.round((square - (tmeta.width || 0)) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    fs.writeFileSync(src, out);
    console.log(`${f}: ${meta.width}x${meta.height} -> trimmed ${tmeta.width}x${tmeta.height} -> square ${square}`);
  }
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
