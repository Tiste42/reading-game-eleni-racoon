/** Ask Gemini to listen to each phoneme file and report what it actually says. */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
}
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const DIR = path.join(process.cwd(), 'public', 'audio', 'phonemes');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function identify(file: string): Promise<string> {
  const b64 = fs.readFileSync(file).toString('base64');
  const prompt = `Listen to this short audio clip from a children's phonics app. Transcribe EXACTLY what you hear as precisely as possible. Is it: (a) a pure consonant/vowel SOUND like "lll", "sss", "p", "eh", or (b) a letter NAME like "el", "pee", "ess", or (c) silence/noise? Reply ONLY compact JSON: {"hear":"<phonetic transcription>","type":"sound|letter-name|silence","note":"<5 words>"}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: 'audio/mpeg', data: b64 } },
          { text: prompt },
        ] }],
      }),
    },
  );
  if (!res.ok) return `FAIL ${res.status}`;
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return (data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '').replace(/\n/g, ' ').trim();
}

async function main() {
  // World 3 letters first, then the rest
  const order = ['l', 'i', 'p', 'e', 's', 'a', 't', 'n', 'b', 'd', 'k', 'c', 'g', 'm', 'r', 'f', 'h'];
  for (const ph of order) {
    const f = path.join(DIR, `${ph}.mp3`);
    if (!fs.existsSync(f)) { console.log(`${ph}: MISSING`); continue; }
    const result = await identify(f);
    console.log(`${ph}.mp3 -> ${result}`);
    await sleep(1300);
  }
}
main().catch(console.error);
