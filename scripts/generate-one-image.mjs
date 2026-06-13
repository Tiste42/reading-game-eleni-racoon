// One-off image generator. Usage: node scripts/generate-one-image.mjs <outPath> "<subject>"
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
}
const KEY = process.env.GEMINI_API_KEY;
const [outPath, subject] = process.argv.slice(2);

const prompt = `A wacky, cute, delightful children's-book illustration of ${subject}. Flat style with thick soft outlines, bright joyful colors, friendly and fun. Centered single subject on a plain white background. ABSOLUTELY NO text, letters, numbers or words in the image.`;

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  },
);
if (!res.ok) { console.error('FAIL', res.status, await res.text()); process.exit(1); }
const data = await res.json();
const img = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.mimeType?.startsWith('image/'));
if (!img) { console.error('No image in response'); process.exit(1); }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, Buffer.from(img.inlineData.data, 'base64'));
console.log('OK ->', outPath);
