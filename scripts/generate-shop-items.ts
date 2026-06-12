/**
 * Generates the wacky shop-item art via Gemini image generation.
 * Output: public/images/generated/shop/{id}.png (skips existing files).
 * Run: npx tsx scripts/generate-shop-items.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { SHOP_ITEMS, SHOP_ART_PROMPTS } from '../src/lib/shopItems';

const envPath = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'generated', 'shop');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(id: string, subject: string): Promise<boolean> {
  const outFile = path.join(OUT_DIR, `${id}.png`);
  if (fs.existsSync(outFile)) {
    console.log(`  SKIP ${id} (exists)`);
    return true;
  }
  const prompt = `A wacky, zany, delightful illustration of ${subject}. Cute flat children's book style with thick soft outlines, bright joyful colors, playful and fun. Centered single subject on a plain white background. ABSOLUTELY NO text, letters, numbers or words in the image. Instantly exciting to a 4-year-old.`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      },
    );
    if (res.status === 429) {
      console.warn(`  RATE LIMITED ${id} — waiting 60s`);
      await sleep(60000);
      return generate(id, subject);
    }
    if (!res.ok) {
      console.error(`  FAIL ${id}: ${res.status}`);
      return false;
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
    };
    const img = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
    if (!img?.inlineData?.data) {
      console.error(`  FAIL ${id}: no image in response`);
      return false;
    }
    fs.writeFileSync(outFile, Buffer.from(img.inlineData.data, 'base64'));
    console.log(`  OK ${id}`);
    return true;
  } catch (e) {
    console.error(`  ERROR ${id}:`, (e as Error).message.slice(0, 120));
    return false;
  }
}

async function main() {
  let ok = 0, fail = 0;
  for (const item of SHOP_ITEMS) {
    const subject = SHOP_ART_PROMPTS[item.id] || item.name;
    (await generate(item.id, subject)) ? ok++ : fail++;
    await sleep(12000);
  }
  console.log(`DONE ok=${ok} fail=${fail}`);
}

main().catch(console.error);
