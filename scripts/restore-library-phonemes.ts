/** Binary recovery only: restore the original, attributed library assets from Git. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sourceCommit = '8783e74';
const manifest = JSON.parse(readFileSync('public/audio/phonemes/library-manifest.json', 'utf8'));
const files = execFileSync('git', ['ls-tree', '--name-only', sourceCommit, 'public/audio/phonemes/'], { encoding: 'utf8' })
  .trim().split(/\r?\n/).filter((file) => /^public\/audio\/phonemes\/[a-z]+\.mp3$/.test(file));
if (files.length !== 28) throw new Error(`Expected 28 original recordings, found ${files.length}`);
const recordings: Record<string, { sha256: string; sourceCommit: string }> = {};
for (const file of files) {
  // Edited/reviewed sounds such as X must not be overwritten by old originals.
  if (!manifest.recordings[file.split('/').pop()!]) continue;
  const original = execFileSync('git', ['show', `${sourceCommit}:${file}`]);
  if (!original.length) throw new Error(`Empty original: ${file}`);
  writeFileSync(file, original);
  if (!readFileSync(file).equals(original)) throw new Error(`Recovery mismatch: ${file}`);
  recordings[file.split('/').pop()!] = { sha256: createHash('sha256').update(original).digest('hex'), sourceCommit };
}
// Never overwrite the checked-in provenance manifest or later library imports.
for (const [file, recording] of Object.entries(recordings)) {
  if (manifest.recordings[file]?.sha256 !== recording.sha256) {
    throw new Error(`Pinned provenance differs: ${file}`);
  }
}
console.log(`Restored and byte-verified ${Object.keys(recordings).length} original library recordings.`);
