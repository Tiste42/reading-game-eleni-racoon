/** A/B test narration expressiveness: existing multilingual_v2 vs eleven_v3. */
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
}
const XI_KEY = process.env.ELEVENLABS_API_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JQLMoxrGsJub4hRarykA';
const OUT = path.join(process.cwd(), 'tasks', 'audio-test');
fs.mkdirSync(OUT, { recursive: true });

const LINES = [
  { id: 'great-job', text: 'Great job! You are so smart!', v3: '[excited] Great job! You are so smart!' },
  { id: 'world-1-intro', text: "Welcome to the Sound Fiesta in Mexico! Let's listen for sounds and have fun!", v3: "[cheerfully] Welcome to the Sound Fiesta in Mexico! [excited] Let's listen for sounds and have fun!" },
];

async function tts(text: string, model: string, outFile: string, settings: Record<string, unknown>) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': XI_KEY },
    body: JSON.stringify({ text, model_id: model, voice_settings: settings }),
  });
  if (!res.ok) { console.error(`FAIL ${model}: ${res.status} ${(await res.text()).slice(0, 200)}`); return false; }
  fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function compare(fileA: string, fileB: string, lineText: string): Promise<string> {
  const a = fs.readFileSync(fileA).toString('base64');
  const b = fs.readFileSync(fileB).toString('base64');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Clip A:' }, { inline_data: { mime_type: 'audio/mpeg', data: a } },
          { text: 'Clip B:' }, { inline_data: { mime_type: 'audio/mpeg', data: b } },
          { text: `Both clips are a friendly raccoon character in a reading game for a 4-year-old saying: "${lineText}". Which sounds warmer, more natural, more alive and less robotic/flat for a preschooler? Consider energy, intonation variety, artifacts. Reply ONLY JSON: {"winner":"A"|"B","a_score":1-10,"b_score":1-10,"reason":"<15 words>","artifacts":"none|A|B|both"}` },
        ] }],
      }),
    },
  );
  if (!res.ok) return `JUDGE-FAIL ${res.status}`;
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return (data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').trim();
}

async function main() {
  for (const line of LINES) {
    const existing = path.join(process.cwd(), 'public', 'audio', 'narration', `${line.id}.mp3`);
    const fV3 = path.join(OUT, `narr-${line.id}-v3.mp3`);
    const fV2warm = path.join(OUT, `narr-${line.id}-v2warm.mp3`);

    await tts(line.v3, 'eleven_v3', fV3, { stability: 0.5, similarity_boost: 0.8 });
    // also a warmer v2: lower stability, higher style
    await tts(line.text, 'eleven_multilingual_v2', fV2warm, { stability: 0.4, similarity_boost: 0.8, style: 0.6 });

    if (fs.existsSync(existing) && fs.existsSync(fV3)) {
      console.log(`[${line.id}] existing(A) vs v3(B):`);
      console.log('  ' + (await compare(existing, fV3, line.text)).replace(/\n/g, ' '));
    }
    if (fs.existsSync(fV2warm) && fs.existsSync(fV3)) {
      console.log(`[${line.id}] v2warm(A) vs v3(B):`);
      console.log('  ' + (await compare(fV2warm, fV3, line.text)).replace(/\n/g, ' '));
    }
  }
}
main().catch(console.error);
