/** Install only the reviewed human-library L, X and voiced-TH edits. No synthesis. */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const manifestPath = 'public/audio/phonemes/library-manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const review = JSON.parse(readFileSync('tasks/phoneme-candidates-review-pro.json', 'utf8'));
const sources = {
  l: { source: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Alveolar_lateral_approximant.ogg', sourcePage: 'https://commons.wikimedia.org/wiki/File:Alveolar_lateral_approximant.ogg', author: 'Peter Isotalo', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', sourceSha256: sha(readFileSync('tasks/phoneme-candidates/l.ogg')), processing: 'Keep isolated consonant at 0.26-0.48 seconds, +14.9dB, pad 0.15s; convert to MP3.' },
  x: { sourceCommit: '8783e74', sourceFile: 'public/audio/phonemes/x.mp3', processing: 'Keep 0.47-0.90 seconds of original library recording (/ks/); remove leading letter-name vowel; fade final 0.03s and pad 0.1s.', license: 'MIT (buzzphonics)' },
  'th-voiced': { source: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/This-prounciation-audio-nonlabial.ogg', sourcePage: 'https://commons.wikimedia.org/wiki/File:This-prounciation-audio-nonlabial.ogg', license: 'CC0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceSha256: sha(readFileSync('tasks/phoneme-candidates/this.ogg')), processing: 'Keep isolated initial consonant at 0.39-0.54 seconds of human American-English this; remove following vowel and s, +12.7dB, pad 0.15s; convert to MP3.' },
};
for (const [id, source] of Object.entries(sources)) {
  const bytes = readFileSync(`tasks/phoneme-candidates/${id}.mp3`);
  const check = review.clips[id];
  if (check.sha256 !== sha(bytes) || check.result.type !== 'sound' || check.result.matches_target !== true) throw new Error(`Unreviewed candidate: ${id}`);
  writeFileSync(`public/audio/phonemes/${id}.mp3`, bytes);
  delete manifest.recordings[`${id}.mp3`];
  manifest.additionalLibraryRecordings[`${id}.mp3`] = { sha256: sha(bytes), ...source };
}
manifest.pendingProvenance = [];
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Installed hash-matched reviewed human L, X and voiced TH recordings.');
