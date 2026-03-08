/**
 * Generate world-specific background music via ElevenLabs Music API.
 * Run with: npx tsx scripts/generate-music.ts
 */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  }
}

const API_KEY = process.env.ELEVENLABS_API_KEY!;
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'audio', 'music');

const WORLD_MUSIC = [
  {
    id: 'world-1',
    file: 'world-1.mp3',
    prompt: 'Happy Mexican fiesta children game music, acoustic guitar, maracas, gentle trumpet, playful and warm, loopable background music for educational game, instrumental only',
  },
  {
    id: 'world-2',
    file: 'world-2.mp3',
    prompt: 'Gentle French cafe children game music, soft accordion, light piano, whimsical and charming, warm garden atmosphere, loopable background for educational game, instrumental only',
  },
  {
    id: 'world-3',
    file: 'world-3.mp3',
    prompt: 'Bright Spanish coastal children game music, gentle flamenco guitar, light percussion, cheerful Mediterranean seaside feel, loopable background for educational game, instrumental only',
  },
  {
    id: 'world-4',
    file: 'world-4.mp3',
    prompt: 'Whimsical English castle children game music, gentle harp, light strings, magical and adventurous medieval feel, loopable background for educational game, instrumental only',
  },
  {
    id: 'world-5',
    file: 'world-5.mp3',
    prompt: 'Warm Moroccan market children game music, gentle oud, soft percussion, mysterious but friendly and playful, loopable background for educational game, instrumental only',
  },
  {
    id: 'world-6',
    file: 'world-6.mp3',
    prompt: 'Relaxed Florida nature children game music, gentle ukulele, soft steel drums, tropical birds ambiance, calm and happy, loopable background for educational game, instrumental only',
  },
  {
    id: 'menu',
    file: 'menu.mp3',
    prompt: 'Fun reggae children game menu music, bouncy reggae rhythm, bright ukulele strumming, cheerful steel drums, playful and groovy island vibes, upbeat adventure travel theme for kids, loopable background for educational game home screen, instrumental only',
  },
];

async function generateMusic(entry: typeof WORLD_MUSIC[0]): Promise<boolean> {
  const outputFile = path.join(OUTPUT_DIR, entry.file);

  if (fs.existsSync(outputFile)) {
    console.log(`  SKIP: ${entry.file} (exists)`);
    return true;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    console.log(`  Generating ${entry.file}...`);
    const response = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify({
        prompt: entry.prompt,
        music_length_ms: 30000, // 30 seconds — enough for a good loop
        force_instrumental: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`  FAIL: ${entry.file} - ${response.status}: ${err}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
    console.log(`  OK: ${entry.file} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (error) {
    console.error(`  ERROR: ${entry.file}`, error);
    return false;
  }
}

async function main() {
  console.log('=== World Music Generator ===\n');

  if (!API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set in .env.local');
    process.exit(1);
  }

  let success = 0;
  let fail = 0;

  for (const entry of WORLD_MUSIC) {
    const ok = await generateMusic(entry);
    if (ok) success++; else fail++;
    // Music generation can be slow, no need for extra rate limiting
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Success: ${success}, Failed: ${fail}`);
  console.log('Done!');
}

main().catch(console.error);
