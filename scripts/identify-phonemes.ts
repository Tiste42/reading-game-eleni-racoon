/** Ask Gemini to listen to each phoneme file and report what it actually says. */
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'node:crypto';

const envPath = path.join(process.cwd(), '.env.local');
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const [key, ...val] = line.split('=');
  if (key && val.length) process.env[key.trim()] = val.join('=').trim();
}
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const candidates = process.argv.includes('--candidates');
const blind = process.argv.includes('--blind');
const pro = process.argv.includes('--pro');
const model = pro ? 'gemini-3.1-pro-preview' : 'gemini-3.8-flash';
const DIR = candidates ? path.join(process.cwd(), 'tasks', 'phoneme-candidates') : path.join(process.cwd(), 'public', 'audio', 'phonemes');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function identify(file: string, target: string): Promise<string> {
  const b64 = fs.readFileSync(file).toString('base64');
  const vowelTargets: Record<string, string> = { a: '/æ/ in apple/cat', e: '/ɛ/ in egg/bed', i: '/ɪ/ in insect/pig' };
  const targetHint = target === 'q' ? 'This is an initial-sound cue for QU in queen: /kw/, often demonstrated as a brief "kwuh" in phonics. It must NOT say the alphabet name "cue" /kju/. Report any release vowel honestly in the transcription, but distinguish it from a letter-name error.' : vowelTargets[target] ? `It should be the short vowel ${vowelTargets[target]}, NOT a letter name.` : target === 'o'
    ? 'It should be the American short-o vowel in top/pot, not the long-o letter name.'
    : target === 'u'
      ? 'It should be the short-u vowel in cup/mug.'
      : target.startsWith('th-voiced')
        ? 'It should be only the isolated voiced th phoneme /ð/ in this/that: no following vowel, schwa, or whole word, and not the unvoiced /θ/ in thin.'
      : `It should be the English phoneme written ${target}.`;
  const prompt = blind
    ? 'Transcribe exactly the audible speech sounds in IPA. No target or filename is provided; do not infer one. Is this an isolated sound/sequence, letter name, word, phrase or silence? Include any added vowels. Reply only JSON: {"hear":"<IPA>","type":"sound|letter-name|word|phrase|silence","note":"<12 words>"}'
    : `Listen critically to this short audio clip from a children's phonics app. ${targetHint} Report what is actually audible, not what the filename suggests. A letter name, spoken word, phrase, or (except the QU cue described above) conspicuous added vowel after a consonant fails. Short vowels must not be alphabet names. For q the intended sound is /kw/, x is /ks/, y is /j/. Transcribe EXACTLY what you hear. Reply ONLY compact JSON: {"hear":"<IPA transcription>","type":"sound|letter-name|word|phrase|silence","matches_target":true|false,"note":"<12 words>"}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { temperature: 0, responseMimeType: 'application/json', maxOutputTokens: 2500, thinkingConfig: { thinkingLevel: 'low' } },
        contents: [{ parts: [
          { inline_data: { mime_type: 'audio/mp3', data: b64 } },
          { text: prompt },
        ] }],
      }),
    },
  );
  if (!res.ok) throw new Error(`Audio review failed: HTTP ${res.status}`);
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return (data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '').replace(/\n/g, ' ').trim();
}

async function main() {
  // World 3 letters first, then the rest
  const requested = process.argv.slice(2).filter((value) => !['--candidates', '--blind', '--pro'].includes(value)).map((value) => value.toLowerCase());
  if (requested.some((value) => !/^[a-z]+(?:-voiced)?$/.test(value))) throw new Error('Only phoneme IDs are permitted.');
  const order = requested.length > 0
    ? requested
    : [...'abcdefghijklmnopqrstuvwxyz', 'sh', 'ch', 'th', 'th-voiced'];
  const reportPath = path.join(process.cwd(), 'tasks', `phoneme-${candidates ? 'candidates' : 'listening'}-review${blind ? '-blind' : ''}${pro ? '-pro' : ''}.json`);
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : { method: 'Gemini 2.5 Flash automated audio analysis; not physical-device or human listening proof', clips: {} };
  for (const ph of order) {
    const f = path.join(DIR, `${ph}.mp3`);
    if (!fs.existsSync(f)) { console.log(`${ph}: MISSING`); continue; }
    const result = await identify(f, ph);
    console.log(`${ph}.mp3 -> ${result}`);
    report.clips[ph] = { model, sha256: createHash('sha256').update(fs.readFileSync(f)).digest('hex'), reviewedAt: new Date().toISOString(), result: JSON.parse(result.replace(/^```json\s*|\s*```$/g, '')) };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    await sleep(1300);
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
