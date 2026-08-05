import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { getInitialSoundGroups, getPostcards, getRhymeFamilies, getStories, getWordsForActivity } from '../src/content/registry';

const outputDir = path.join(process.cwd(), 'test-results');
const mode = process.argv.includes('--postcard')
  ? 'postcard'
  : process.argv.includes('--story')
    ? 'story'
    : process.argv.includes('--blend')
      ? 'blend'
      : process.argv.includes('--initial')
        ? 'initial'
        : 'rhyme';
const outputFile = path.join(outputDir, `${mode}-picture-audit.png`);
const keyFile = path.join(outputDir, `${mode}-picture-audit-key.json`);

const enabledPacks = ['alphabet-adventure', 'continuous-bridge', 'cvc-grid', 'longer-words'];
const pictureWords = mode === 'postcard'
  ? getPostcards(enabledPacks).map((entry) => entry.correct)
  : mode === 'story'
    ? getStories(enabledPacks).flatMap((entry) => entry.options)
    : mode === 'blend'
      ? getWordsForActivity(['alphabet-adventure'], 'blend-to-picture').map((entry) => entry.text)
      : mode === 'initial'
        ? getInitialSoundGroups(['alphabet-adventure']).flatMap((group) => group.words.map((entry) => entry.text))
        : getRhymeFamilies(['alphabet-adventure']).flatMap((family) => family.words);
const words = [...new Set(pictureWords)].sort();

const columns = 4;
const cellWidth = 260;
const cellHeight = 280;
const imageSize = 220;
const rows = Math.ceil(words.length / columns);

fs.mkdirSync(outputDir, { recursive: true });

async function main() {
const tiles = await Promise.all(words.map(async (word, index) => {
  const source = path.join(process.cwd(), 'public', 'images', 'generated', 'items', `${word}.png`);
  if (!fs.existsSync(source)) throw new Error(`Missing audit image for ${word}`);

  const picture = await sharp(source)
    .resize(imageSize, imageSize, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();

  const badge = Buffer.from(`
    <svg width="${cellWidth}" height="${cellHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="${cellWidth - 2}" height="${cellHeight - 2}" rx="24" fill="none" stroke="#d1d5db" stroke-width="2"/>
      <circle cx="${cellWidth / 2}" cy="250" r="20" fill="#312e81"/>
      <text x="${cellWidth / 2}" y="258" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="white">${index + 1}</text>
    </svg>
  `);

  return sharp({
    create: { width: cellWidth, height: cellHeight, channels: 4, background: '#ffffff' },
  })
    .composite([
      { input: picture, left: (cellWidth - imageSize) / 2, top: 10 },
      { input: badge, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}));

await sharp({
  create: {
    width: columns * cellWidth,
    height: rows * cellHeight,
    channels: 4,
    background: '#f8fafc',
  },
})
  .composite(tiles.map((input, index) => ({
    input,
    left: (index % columns) * cellWidth,
    top: Math.floor(index / columns) * cellHeight,
  })))
  .png()
  .toFile(outputFile);

fs.writeFileSync(keyFile, `${JSON.stringify(
  words.map((word, index) => ({ number: index + 1, word })),
  null,
  2,
)}\n`);

console.log(`Picture audit: ${outputFile}`);
console.log(`Blind key: ${keyFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
