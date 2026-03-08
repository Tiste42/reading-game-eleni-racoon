/**
 * Generate simple SFX audio files using ElevenLabs Sound Effects API
 * or create minimal placeholder files.
 *
 * Run with: npx tsx scripts/generate-sfx.ts
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

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'audio', 'sfx');

const SFX_PROMPTS = [
  { id: 'correct', prompt: 'Short cheerful ding chime, bright positive feedback sound, 1 second, children game' },
  { id: 'wrong', prompt: 'Short gentle buzzer, soft wrong answer sound, not harsh, 1 second, children game' },
  { id: 'celebrate', prompt: 'Cheerful celebration fanfare with sparkles, children game victory, 2 seconds' },
  { id: 'coin', prompt: 'Coin collect sparkle sound, bright metallic ding, video game coin, 0.5 seconds' },
  { id: 'tap', prompt: 'Soft button tap click, gentle UI interaction sound, 0.3 seconds' },
];

async function generateSfx(id: string, prompt: string): Promise<boolean> {
  const outputFile = path.join(OUTPUT_DIR, `${id}.mp3`);

  if (fs.existsSync(outputFile)) {
    console.log(`  SKIP: sfx/${id}.mp3 (exists)`);
    return true;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: prompt,
        duration_seconds: prompt.includes('0.3') ? 0.5 : prompt.includes('0.5') ? 1 : prompt.includes('2') ? 2 : 1.5,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`  FAIL: sfx/${id}.mp3 - ${response.status}: ${err}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
    console.log(`  OK: sfx/${id}.mp3 (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`  ERROR: sfx/${id}.mp3`, error);
    return false;
  }
}

async function main() {
  console.log('=== SFX Generator ===\n');

  if (!ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set in .env.local');
    process.exit(1);
  }

  for (const sfx of SFX_PROMPTS) {
    await generateSfx(sfx.id, sfx.prompt);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\nDone!');
}

main().catch(console.error);
