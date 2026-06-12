/**
 * Audio candidate test harness.
 * Generates several recipes for isolated stop-consonant phonemes + narration,
 * then uses Gemini audio understanding to judge which recipe is cleanest
 * (no schwa, correct sound) before committing to full regeneration.
 *
 * Run: npx tsx scripts/test-audio-candidates.ts
 * Output: tasks/audio-test/*.mp3 + judgement table on stdout
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

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

// IPA for isolated stop sounds
const IPA: Record<string, string> = {
  t: 't', p: 'p', b: 'b', d: 'd', g: 'ɡ', k: 'k', c: 'k', ch: 'tʃ', j: 'dʒ',
};

interface Candidate {
  file: string;
  phoneme: string;
  recipe: string;
  gen?: () => Promise<void>;
}

async function tts(text: string, model: string, outFile: string, extra: Record<string, unknown> = {}): Promise<boolean> {
  const body: Record<string, unknown> = {
    text,
    model_id: model,
    ...extra,
  };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': XI_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`  TTS FAIL ${path.basename(outFile)}: ${res.status} ${(await res.text()).slice(0, 150)}`);
    return false;
  }
  fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
  return true;
}

function trimSchwa(inFile: string, outFile: string, keepMs: number) {
  // Remove leading silence, keep only the consonant burst, fade out fast
  const keep = keepMs / 1000;
  const fadeStart = Math.max(0, keep - 0.04);
  execSync(
    `ffmpeg -y -loglevel error -i "${inFile}" -af "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:${keep},afade=t=out:st=${fadeStart}:d=0.04" "${outFile}"`,
  );
}

async function judge(file: string, phoneme: string): Promise<string> {
  const b64 = fs.readFileSync(file).toString('base64');
  const prompt = `You are a speech-language pathologist evaluating phonics audio for a children's reading app. This clip should be the ISOLATED English phoneme /${phoneme}/ (the SOUND, not the letter name) for teaching a 4-year-old to blend sounds into words. A clean stop sound must be clipped with NO vowel after it — "t" not "tuh". Reply with ONLY compact JSON: {"heard":"<what you hear phonetically>","has_schwa":true|false,"sounds_like_letter_name":true|false,"verdict":"good"|"usable"|"bad","note":"<10 words max>"}`;
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
  if (!res.ok) return `JUDGE-FAIL ${res.status}`;
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return (data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || 'no-text').trim();
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const testPhonemes = ['t', 'p', 'b', 'd', 'k', 'ch'];
  const candidates: Candidate[] = [];

  for (const ph of testPhonemes) {
    // Recipe A: SSML IPA phoneme tag on flash_v2 (English model that supports phoneme tags)
    const fA = path.join(OUT, `${ph}-A-ipa-flash.mp3`);
    candidates.push({
      file: fA, phoneme: ph, recipe: 'A: flash_v2 + IPA tag',
      gen: async () => {
        await tts(
          `<phoneme alphabet="ipa" ph="${IPA[ph]}">${ph}</phoneme>`,
          'eleven_flash_v2', fA,
          { enable_ssml_parsing: true, voice_settings: { stability: 0.9, similarity_boost: 0.8 } },
        );
      },
    });

    // Recipe B: existing "tuh"-style file trimmed hard with ffmpeg (90ms)
    const existing = path.join(process.cwd(), 'public', 'audio', 'phonemes', `${ph}.mp3`);
    if (fs.existsSync(existing)) {
      const fB = path.join(OUT, `${ph}-B-trim90.mp3`);
      candidates.push({
        file: fB, phoneme: ph, recipe: 'B: existing trimmed 90ms',
        gen: async () => trimSchwa(existing, fB, 90),
      });
      const fC = path.join(OUT, `${ph}-C-trim140.mp3`);
      candidates.push({
        file: fC, phoneme: ph, recipe: 'C: existing trimmed 140ms',
        gen: async () => trimSchwa(existing, fC, 140),
      });
    }

    // Recipe D: IPA tag generated then trimmed (belt and suspenders)
    const fD = path.join(OUT, `${ph}-D-ipa-trim.mp3`);
    candidates.push({
      file: fD, phoneme: ph, recipe: 'D: IPA tag + trim 140ms',
      gen: async () => {
        if (fs.existsSync(fA)) trimSchwa(fA, fD, 140);
      },
    });
  }

  // Baseline sanity check: existing continuous sound 's' should be judged good
  const sFile = path.join(process.cwd(), 'public', 'audio', 'phonemes', 's.mp3');
  if (fs.existsSync(sFile)) {
    candidates.push({ file: sFile, phoneme: 's', recipe: 'BASELINE: existing s' });
  }
  // Baseline: existing 't' (the reported-bad one) — judge should flag schwa
  const tFile = path.join(process.cwd(), 'public', 'audio', 'phonemes', 't.mp3');
  if (fs.existsSync(tFile)) {
    candidates.push({ file: tFile, phoneme: 't', recipe: 'BASELINE: existing t (tuh)' });
  }

  console.log('--- Generating candidates ---');
  for (const c of candidates) {
    if (c.gen) {
      try { await c.gen(); } catch (e) { console.error(`  gen error ${c.recipe}/${c.phoneme}:`, (e as Error).message.slice(0, 120)); }
      await sleep(400);
    }
  }

  console.log('\n--- Judging with Gemini ---');
  const results: Array<{ phoneme: string; recipe: string; judgement: string }> = [];
  for (const c of candidates) {
    if (!fs.existsSync(c.file)) { results.push({ phoneme: c.phoneme, recipe: c.recipe, judgement: 'FILE MISSING' }); continue; }
    const j = await judge(c.file, c.phoneme);
    results.push({ phoneme: c.phoneme, recipe: c.recipe, judgement: j });
    console.log(`[${c.phoneme}] ${c.recipe}\n  ${j.replace(/\n/g, ' ')}`);
    await sleep(1500);
  }

  fs.writeFileSync(path.join(OUT, 'judgements.json'), JSON.stringify(results, null, 2));
  console.log('\nSaved tasks/audio-test/judgements.json');
}

main().catch(console.error);
