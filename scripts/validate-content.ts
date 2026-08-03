import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import { CONTENT_PACKS } from '../src/content/registry';
import { ITEM_ART } from '../src/lib/itemArt';

const root = process.cwd();
const errors: string[] = [];
const seenPackIds = new Set<string>();
const seenWordIds = new Set<string>();
const allPackIds = new Set(CONTENT_PACKS.map((pack) => pack.id));
const allWords = new Map(CONTENT_PACKS.flatMap((pack) => pack.words).map((word) => [word.id, word]));
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const WORLD_2_PHONEMES = new Set(ALPHABET);
const WORLD_3_ACTIVITIES = new Set(['blend-to-picture', 'picture-to-build']);

function fail(message: string) {
  errors.push(message);
}

function diskPath(publicPath: string) {
  return path.join(root, 'public', ...publicPath.replace(/^\//, '').split('/'));
}

function narrationPath(text: string) {
  const slug = text.toLowerCase().trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-');
  return `/audio/narration/inst-${slug}.mp3`;
}

function validateOptions(owner: string, correct: string, options: string[]) {
  if (new Set(options).size !== options.length) fail(`${owner}: duplicate answer options`);
  if (options.filter((option) => option === correct).length !== 1) {
    fail(`${owner}: expected exactly one correct option`);
  }
}

async function main() {
  const referencedImages = new Set<string>();
  const referencedAudio = new Set<string>();
  const letterExamples = new Map<string, string>();

  for (const pack of CONTENT_PACKS) {
    if (seenPackIds.has(pack.id)) fail(`duplicate pack id: ${pack.id}`);
    seenPackIds.add(pack.id);
    for (const requiredId of pack.requiredPackIds) {
      if (!allPackIds.has(requiredId)) fail(`${pack.id}: unknown required pack ${requiredId}`);
    }

    const allowedPhonemes = new Set([...pack.prerequisitePhonemes, ...pack.introducedPhonemes]);
    for (const entry of pack.words) {
      if (seenWordIds.has(entry.id)) fail(`duplicate word id: ${entry.id}`);
      seenWordIds.add(entry.id);
      if (!entry.id.startsWith(`${pack.id}:`) && pack.id !== 'core') {
        fail(`${entry.id}: word id must be namespaced to ${pack.id}`);
      }
      if (entry.activities.some((activity) => activity !== 'initial-sound' && activity !== 'letter-match')) {
        if (entry.units.map((unit) => unit.text).join('') !== entry.text) {
          fail(`${entry.id}: grapheme units do not spell ${entry.text}`);
        }
      }
      if (pack.optional) {
        for (const unit of entry.units) {
          if (!allowedPhonemes.has(unit.phonemeId)) {
            fail(`${entry.id}: phoneme ${unit.phonemeId} is not taught by or prerequisite to ${pack.id}`);
          }
        }
      }
      if (entry.activities.some((activity) => WORLD_3_ACTIVITIES.has(activity))) {
        if (entry.units.length !== 3) fail(`${entry.id}: World 3 blending words must have exactly three grapheme units`);
        for (const unit of entry.units) {
          if (!WORLD_2_PHONEMES.has(unit.phonemeId)) {
            fail(`${entry.id}: ${unit.phonemeId} is not taught before World 3`);
          }
        }
      }
      referencedImages.add(entry.picturePath);
      referencedAudio.add(entry.audioPath);
      for (const unit of entry.units) referencedAudio.add(`/audio/phonemes/${unit.phonemeId}.mp3`);
    }

    for (const group of pack.initialSoundGroups) {
      if (!WORLD_2_PHONEMES.has(group.phonemeId)) {
        fail(`${group.id}: ${group.phonemeId} is not taught before World 2 practice`);
      }
      if (group.wordIds.length < 1) fail(`${group.id}: needs at least one picture word`);
      for (const wordId of group.wordIds) {
        const entry = allWords.get(wordId);
        if (!entry) {
          fail(`${group.id}: unknown word ${wordId}`);
          continue;
        }
        if (entry.units[0]?.phonemeId !== group.phonemeId) {
          fail(`${group.id}: ${entry.text} does not start with ${group.phonemeId}`);
        }
      }
    }

    for (const example of pack.letterExamples) {
      if (letterExamples.has(example.letter)) fail(`${example.id}: duplicate example for ${example.letter}`);
      letterExamples.set(example.letter, example.word);
      if (!WORLD_2_PHONEMES.has(example.phonemeId)) fail(`${example.id}: unknown alphabet phoneme ${example.phonemeId}`);
      if (example.soundPosition === 'start' && !example.word.toLowerCase().startsWith(example.letter)) {
        fail(`${example.id}: ${example.word} must start with ${example.letter}`);
      }
      if (example.soundPosition === 'end' && !example.word.toLowerCase().endsWith(example.letter)) {
        fail(`${example.id}: ${example.word} must end with ${example.letter}`);
      }
      referencedImages.add(`/images/generated/items/${example.word}.png`);
      referencedAudio.add(`/audio/words/${example.word}.mp3`);
      referencedAudio.add(`/audio/phonemes/${example.phonemeId}.mp3`);
    }

    for (const family of pack.rhymeFamilies) {
      if (family.words.length < 2) fail(`${family.id}: needs at least two rhyming words`);
      if (new Set(family.words).size !== family.words.length) fail(`${family.id}: duplicate rhyme word`);
      for (const word of family.words) {
        referencedImages.add(`/images/generated/items/${word}.png`);
        referencedAudio.add(`/audio/words/${word}.mp3`);
      }
    }

    for (const syllable of pack.syllableWords) {
      referencedImages.add(`/images/generated/items/${syllable.word}.png`);
      referencedAudio.add(`/audio/words/${syllable.word}.mp3`);
      referencedAudio.add(`/audio/narration/syll-${syllable.word}.mp3`);
      referencedAudio.add(narrationPath(`${syllable.word} has ${syllable.syllables} ${syllable.syllables === 1 ? 'beat' : 'beats'}`));
    }

    for (const chain of pack.wordChains) {
      const from = allWords.get(chain.fromWordId);
      const to = allWords.get(chain.toWordId);
      if (!from || !to) {
        fail(`${chain.id}: missing from/to word`);
        continue;
      }
      if (from.units.length !== to.units.length) fail(`${chain.id}: word lengths differ`);
      const differences = from.units
        .map((unit, index) => unit.text === to.units[index]?.text ? -1 : index)
        .filter((index) => index >= 0);
      if (differences.length !== 1 || differences[0] !== chain.changedUnitIndex) {
        fail(`${chain.id}: must change exactly the authored unit`);
      }
      const answer = to.units[chain.changedUnitIndex];
      if (chain.distractorUnits.some((unit) => unit.text === answer.text && unit.phonemeId === answer.phonemeId)) {
        fail(`${chain.id}: answer duplicated as distractor`);
      }
    }

    for (const story of pack.stories) {
      if (story.cue !== 'self-read-sentence') fail(`${story.id}: sentence cue can reveal the answer`);
      validateOptions(story.id, story.correct, story.options);
      referencedImages.add(`/images/generated/items/${story.pictureWord}.png`);
      referencedAudio.add(narrationPath(story.question));
      for (const option of story.options) {
        referencedAudio.add(option.trim().includes(' ')
          ? narrationPath(option)
          : `/audio/words/${option.toLowerCase()}.mp3`);
      }
    }
    for (const postcard of pack.postcards) {
      if (postcard.cue !== 'picture-only') fail(`${postcard.id}: postcard choices must stay text-only`);
      validateOptions(postcard.id, postcard.correct, postcard.options);
      referencedImages.add(`/images/generated/items/${postcard.correct}.png`);
      referencedAudio.add(narrationPath(postcard.spoken));
    }
  }

  for (const letter of ALPHABET) {
    if (!letterExamples.has(letter)) fail(`missing World 2 letter example: ${letter}`);
  }

  for (const imagePath of referencedImages) {
    const word = path.basename(imagePath, '.png');
    if (!ITEM_ART.has(word)) fail(`picture is not registered in ITEM_ART: ${imagePath}`);
    const file = diskPath(imagePath);
    if (!fs.existsSync(file) || fs.statSync(file).size < 1_000) {
      fail(`missing or empty picture: ${imagePath}`);
      continue;
    }
    try {
      const metadata = await sharp(file).metadata();
      if (!metadata.width || !metadata.height) fail(`unreadable picture: ${imagePath}`);
    } catch {
      fail(`invalid picture: ${imagePath}`);
    }
  }

  for (const audioPath of referencedAudio) {
    const file = diskPath(audioPath);
    if (!fs.existsSync(file) || fs.statSync(file).size < 500) {
      fail(`missing or empty audio: ${audioPath}`);
      continue;
    }
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {
      encoding: 'utf8',
    });
    if (probe.status !== 0 || !Number.isFinite(Number(probe.stdout.trim()))) {
      fail(`invalid audio: ${audioPath}`);
    }
  }

  if (errors.length > 0) {
    console.error(`Content validation failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Content validation passed: ${CONTENT_PACKS.length} packs, ${seenWordIds.size} word records, ${referencedImages.size} pictures, ${referencedAudio.size} audio files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
