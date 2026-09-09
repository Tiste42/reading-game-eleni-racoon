/** Record sound identity separately from stricter pure-consonant/release-vowel quality. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const primary = read('tasks/phoneme-listening-review.json').clips;
const adjudicated = read('tasks/phoneme-listening-review-pro.json').clips;
const replacements = read('tasks/phoneme-candidates-review-pro.json').clips;
const expected: Record<string, string> = {
  a: 'æ', b: 'b', c: 'k', d: 'd', e: 'ɛ', f: 'f', g: 'ɡ', h: 'h', i: 'ɪ', j: 'dʒ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'ɑ', p: 'p', q: 'kw', r: 'ɹ', s: 's', t: 't', u: 'ʌ', v: 'v', w: 'w', x: 'ks', y: 'j', z: 'z', sh: 'ʃ', ch: 'tʃ', th: 'θ', 'th-voiced': 'ð',
};
const clips = Object.entries(expected).map(([id, ipa]) => {
  const evidence = ['l', 'x', 'th-voiced'].includes(id) ? replacements[id] : id === 'e' ? adjudicated[id] : primary[id];
  const sha256 = createHash('sha256').update(readFileSync(`public/audio/phonemes/${id}.mp3`)).digest('hex');
  if (sha256 !== evidence.sha256) throw new Error(`Review is stale: ${id}`);
  const heard = evidence.result.hear.replace(/[\s/\[\]ːʰ]/g, '').replace(/g/g, 'ɡ');
  const tail = heard.slice(ipa.length);
  // Human phonics demonstrations sometimes release a consonant with a short
  // neutral vowel. Preserve that quality warning; never call it a pure-sound pass.
  const soundIdentityMatches = evidence.result.type === 'sound' && heard.startsWith(ipa) && ['', 'ə', 'ʌ'].includes(tail);
  if (!soundIdentityMatches) throw new Error(`Wrong sound, name or phrase: ${id}: ${heard}`);
  return { id, sha256, expected: ipa, soundIdentityMatches, hasReleaseVowel: tail !== '', evidence };
});
writeFileSync('tasks/phoneme-release-review.json', JSON.stringify({
  scope: 'Correct phonics sound versus alphabet name, wrong phoneme, word or phrase. Not a claim of perfectly pure consonants or physical-device listening.',
  reviewMethod: 'Google audio analysis, with stronger-model review for disputed identity and source-verified human replacements. Raw disagreements are retained in sibling review files.',
  releaseVowelPolicy: 'Existing human stop/glide cues with brief neutral releases are identified separately. They are not alphabet names; further pure-blending refinement remains a quality limitation.',
  clips,
}, null, 2) + '\n');
console.log(`${clips.length} final file identities verified; ${clips.filter((clip) => clip.hasReleaseVowel).length} library release-vowel observations retained.`);
