/**
 * Regenerate stop-consonant phonemes without schwa.
 *
 * For each stop sound, builds candidates:
 *   A1/A2: eleven_flash_v2 with IPA phoneme tag (two takes)
 *   B:     existing file hard-trimmed to 90ms (cuts the schwa tail)
 *   C:     IPA take trimmed to 100ms
 * Each candidate is judged 3x by Gemini audio understanding (schwa? clean? correct sound?).
 * The highest-scoring candidate is installed into public/audio/phonemes/.
 * Originals are backed up to public/audio/phonemes/_originals/.
 *
 * Run: npx tsx scripts/fix-phonemes.ts
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

const PHONEME_DIR = path.join(process.cwd(), 'public', 'audio', 'phonemes');
const BACKUP_DIR = path.join(PHONEME_DIR, '_originals');
const WORK = path.join(process.cwd(), 'tasks', 'phoneme-work');
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });

const STOPS: Record<string, string> = {
  t: 't', p: 'p', b: 'b', d: 'd', g: 'ɡ', k: 'k', c: 'k', j: 'dʒ', ch: 'tʃ',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function tts(text: string, outFile: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': XI_KEY },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2',
        enable_ssml_parsing: true,
        voice_settings: { stability: 0.9, similarity_boost: 0.8 },
      }),
    });
    if (res.ok) {
      fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
      return true;
    }
    if (res.status === 429) { await sleep(15000); continue; }
    console.error(`  TTS FAIL ${path.basename(outFile)}: ${res.status}`);
    return false;
  }
  return false;
}

function trim(inFile: string, outFile: string, keepMs: number): boolean {
  try {
    const keep = keepMs / 1000;
    const fadeStart = Math.max(0, keep - 0.04);
    execSync(
      `ffmpeg -y -loglevel error -i "${inFile}" -af "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:${keep},afade=t=out:st=${fadeStart}:d=0.04" "${outFile}"`,
    );
    return fs.existsSync(outFile) && fs.statSync(outFile).size > 200;
  } catch { return false; }
}

interface Vote { has_schwa?: boolean; verdict?: string; correct_sound?: boolean }

async function judgeOnce(file: string, ph: string): Promise<Vote | null> {
  const b64 = fs.readFileSync(file).toString('base64');
  const prompt = `You are a speech-language pathologist. This clip should be the ISOLATED English phoneme /${ph}/ (the sound, not the letter name) for teaching a 4-year-old phonics blending. A clean stop sound is clipped with NO vowel after it ("t" not "tuh"). Reply ONLY compact JSON: {"correct_sound":true|false,"has_schwa":true|false,"verdict":"good"|"usable"|"bad"}`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [
          { inline_data: { mime_type: 'audio/mpeg', data: b64 } },
          { text: prompt },
        ] }] }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    const m = text.match(/\{[^}]+\}/);
    if (!m) return null;
    return JSON.parse(m[0]) as Vote;
  } catch { return null; }
}

async function score(file: string, ph: string): Promise<number> {
  let total = 0;
  for (let i = 0; i < 3; i++) {
    const v = await judgeOnce(file, ph);
    if (v) {
      if (v.verdict === 'good') total += 2;
      else if (v.verdict === 'usable') total += 1;
      if (v.has_schwa) total -= 2;
      if (v.correct_sound === false) total -= 3;
    }
    await sleep(1200);
  }
  return total;
}

async function main() {
  const report: Record<string, { winner: string; scores: Record<string, number> }> = {};

  for (const [ph, ipa] of Object.entries(STOPS)) {
    console.log(`\n=== /${ph}/ ===`);
    const existing = path.join(PHONEME_DIR, `${ph}.mp3`);
    const candidates: Record<string, string> = {};

    // A1/A2: IPA takes
    for (const take of ['A1', 'A2']) {
      const f = path.join(WORK, `${ph}-${take}.mp3`);
      if (await tts(`<phoneme alphabet="ipa" ph="${ipa}">${ph}</phoneme>`, f)) candidates[take] = f;
      await sleep(400);
    }
    // B: existing trimmed 90ms
    if (fs.existsSync(existing)) {
      const f = path.join(WORK, `${ph}-B.mp3`);
      if (trim(existing, f, 90)) candidates.B = f;
    }
    // C: first IPA take trimmed 100ms
    if (candidates.A1) {
      const f = path.join(WORK, `${ph}-C.mp3`);
      if (trim(candidates.A1, f, 100)) candidates.C = f;
    }
    // E: existing untouched (it might already be fine)
    if (fs.existsSync(existing)) candidates.E = existing;

    const scores: Record<string, number> = {};
    for (const [name, file] of Object.entries(candidates)) {
      scores[name] = await score(file, ph);
      console.log(`  ${name}: ${scores[name]}`);
    }

    // Pick winner; prefer A-takes on ties (true isolated generation)
    const order = ['A1', 'A2', 'C', 'B', 'E'];
    let winner = 'E';
    let best = -Infinity;
    for (const name of order) {
      if (scores[name] !== undefined && scores[name] > best) { best = scores[name]; winner = name; }
    }
    report[ph] = { winner, scores };
    console.log(`  WINNER: ${winner} (${best})`);

    if (winner !== 'E') {
      // Backup original once, then install winner
      const backup = path.join(BACKUP_DIR, `${ph}.mp3`);
      if (fs.existsSync(existing) && !fs.existsSync(backup)) fs.copyFileSync(existing, backup);
      fs.copyFileSync(candidates[winner], existing);
      console.log(`  INSTALLED ${winner} -> phonemes/${ph}.mp3`);
    } else {
      console.log('  KEPT existing file');
    }
  }

  fs.writeFileSync(path.join(WORK, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n=== DONE ===');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
