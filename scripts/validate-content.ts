import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import { CONTENT_NARRATION_PHRASES, CONTENT_PACKS } from '../src/content/registry';
import { hasChildIdentifiablePicture } from '../src/content/pictureQuality';
import { canSharePictureChoices } from '../src/content/pictureConflicts';
import { REQUIRED_DIGRAPHS, REQUIRED_HEART_WORDS } from '../src/content/learningIntegrity';
import { ALPHABET_PHONEMES } from '../src/content/progression';
import { WORLD_4_DOOR_ROUNDS, WORLD_4_FAMILY_ROUNDS, WORLD_4_PICTURE_ROUNDS, isWorld4PictureRoundSafe, isWorld4RoundDecodable } from '../src/content/world4Content';
import { BEACH_COMPREHENSION_ROUNDS, CONNECTED_COMPREHENSION_ROUNDS, MANATEE_COMPREHENSION_ROUNDS, WORLD_5_BOSS_SENTENCES, WORLD_6_BOSS_SENTENCES, analyzeChildReadableText } from '../src/content/connectedText';
import { WORLD_1_BOSS_CHALLENGES } from '../src/content/bossContent';
import { WORLD_5_DECODER_ROUNDS } from '../src/content/world5Content';
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
const MUSIC_TRACKS = ['menu', 'world-1', 'world-2', 'world-3', 'world-4', 'world-5', 'world-6'];
const REQUIRED_AUDIBLE_RUNTIME_AUDIO = [
  ...MUSIC_TRACKS.map((track) => `/audio/music/${track}.mp3`),
  ...MUSIC_TRACKS.map((track) => `/audio/music/apple/${track}.mp3`),
  ...['correct', 'wrong', 'celebrate', 'coin', 'tap'].map((effect) => `/audio/sfx/${effect}.mp3`),
];

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
  for (const phoneme of REQUIRED_DIGRAPHS) {
    referencedAudio.add(`/audio/phonemes/${phoneme}.mp3`);
  }
  REQUIRED_AUDIBLE_RUNTIME_AUDIO.forEach((audioPath) => referencedAudio.add(audioPath));
  const letterExamples = new Map<string, string>();
  const connectedTextPhonemes = new Set([...ALPHABET_PHONEMES, ...REQUIRED_DIGRAPHS]);
  const connectedTextHeartWords = new Set<string>(REQUIRED_HEART_WORDS);

  const registerPicture = (owner: string, word: string) => {
    if (!hasChildIdentifiablePicture(word)) {
      fail(`${owner}: ${word} has not passed the child-identifiability audit`);
    }
    referencedImages.add(`/images/generated/items/${word}.png`);
  };

  const validatePictureSet = (owner: string, correct: string, options: string[]) => {
    validateOptions(owner, correct, options);
    options.forEach((word) => registerPicture(owner, word));
    for (let left = 0; left < options.length; left++) {
      for (let right = left + 1; right < options.length; right++) {
        if (!canSharePictureChoices(options[left], options[right])) {
          fail(`${owner}: visually confusable choices ${options[left]}/${options[right]}`);
        }
      }
    }
  };

  const validateChildText = (owner: string, text: string) => {
    const unknown = analyzeChildReadableText(text, connectedTextPhonemes, connectedTextHeartWords);
    if (unknown.length) fail(`${owner}: child-readable text uses untaught words: ${[...new Set(unknown)].join(', ')}`);
  };

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
        if (!hasChildIdentifiablePicture(entry.text)) {
          fail(`${entry.id}: picture has not passed the child-identifiability audit`);
        }
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
        if (!hasChildIdentifiablePicture(entry.text)) {
          fail(`${group.id}: ${entry.text} has not passed the child-identifiability audit`);
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
      if (!hasChildIdentifiablePicture(example.word)) {
        fail(`${example.id}: ${example.word} has not passed the child-identifiability audit`);
      }
      referencedImages.add(`/images/generated/items/${example.word}.png`);
      referencedAudio.add(`/audio/words/${example.word}.mp3`);
      referencedAudio.add(`/audio/phonemes/${example.phonemeId}.mp3`);
    }

    for (const family of pack.rhymeFamilies) {
      if (family.words.length < 2) fail(`${family.id}: needs at least two rhyming words`);
      if (new Set(family.words).size !== family.words.length) fail(`${family.id}: duplicate rhyme word`);
      for (const word of family.words) {
        if (!hasChildIdentifiablePicture(word)) {
          fail(`${family.id}: ${word} has not passed the child-identifiability audit`);
        }
        referencedImages.add(`/images/generated/items/${word}.png`);
        referencedAudio.add(`/audio/words/${word}.mp3`);
      }
    }

    for (const syllable of pack.syllableWords) {
      registerPicture(`syllable:${syllable.word}`, syllable.word);
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
      registerPicture(chain.id, from.text);
      registerPicture(chain.id, to.text);
    }

    for (const story of pack.stories) {
      if (story.cue !== 'self-read-sentence') fail(`${story.id}: sentence cue can reveal the answer`);
      validateChildText(story.id, story.text);
      validatePictureSet(story.id, story.correct, story.options);
      if (story.options.some((option) => option.trim().includes(' '))) {
        fail(`${story.id}: comprehension choices must be picture words, not copyable phrases`);
      }
      registerPicture(story.id, story.pictureWord);
      referencedAudio.add(narrationPath(story.question));
      for (const option of story.options) {
        referencedAudio.add(`/audio/words/${option.toLowerCase()}.mp3`);
      }
    }
    for (const postcard of pack.postcards) {
      if (postcard.cue !== 'picture-only') fail(`${postcard.id}: postcard choices must stay text-only`);
      validateOptions(postcard.id, postcard.correct, postcard.options);
      validateChildText(postcard.id, postcard.template.replace('___', postcard.correct));
      for (const option of postcard.options) {
        validateChildText(`${postcard.id}:option`, option);
      }
      registerPicture(postcard.id, postcard.correct);
      referencedAudio.add(narrationPath(postcard.spoken));
      for (const option of postcard.options) {
        referencedAudio.add(`/audio/words/${option.toLowerCase()}.mp3`);
      }
    }
  }

  for (const letter of ALPHABET) {
    if (!letterExamples.has(letter)) fail(`missing World 2 letter example: ${letter}`);
  }

  for (const round of WORLD_4_PICTURE_ROUNDS) {
    const words = [round.word, ...round.distractors];
    if (!isWorld4PictureRoundSafe(round)) fail(`world4-picture:${round.word}: unsafe picture set`);
    if (!isWorld4RoundDecodable(round, new Set(ALPHABET_PHONEMES))) fail(`world4-picture:${round.word}: undecodable word`);
    validatePictureSet(`world4-picture:${round.word}`, round.word, words);
  }
  for (const round of WORLD_4_FAMILY_ROUNDS) {
    if (!isWorld4RoundDecodable(round, new Set(ALPHABET_PHONEMES))) fail(`world4-family:${round.member}: undecodable word`);
  }
  for (const round of WORLD_4_DOOR_ROUNDS) {
    if (!isWorld4RoundDecodable(round, new Set(ALPHABET_PHONEMES))) fail(`world4-door:${round.target}: undecodable word`);
    registerPicture(`world4-door:${round.target}`, round.target);
  }

  for (const [index, round] of CONNECTED_COMPREHENSION_ROUNDS.entries()) {
    validateChildText(`connected:${index}`, round.sentence);
    validatePictureSet(`connected:${index}`, round.correct, round.options);
  }
  for (const [index, round] of MANATEE_COMPREHENSION_ROUNDS.entries()) {
    validateChildText(`manatee:${index}`, round.sentence);
    validatePictureSet(`manatee:${index}`, round.correct, round.options);
  }
  for (const [index, round] of BEACH_COMPREHENSION_ROUNDS.entries()) {
    validateChildText(`beach:${index}`, round.sentence);
    validateOptions(`beach:${index}`, round.correct, round.options.map((option) => option.label));
  }
  for (const [world, rounds] of [[5, WORLD_5_BOSS_SENTENCES], [6, WORLD_6_BOSS_SENTENCES]] as const) {
    for (const [index, round] of rounds.entries()) {
      validateChildText(`boss-${world}:${index}`, round.prompt);
      validatePictureSet(`boss-${world}:${index}`, round.correct, round.options);
    }
  }
  for (const [index, round] of WORLD_1_BOSS_CHALLENGES.entries()) {
    if (round.options.every((option) => /^\d+$/.test(option))) continue;
    validatePictureSet(`boss-1:${index}`, round.correct, round.options);
  }
  for (const [index, round] of WORLD_5_DECODER_ROUNDS.entries()) {
    const owner = `world5-decoder:${index}`;
    if (round.units.join('') !== round.word) fail(`${owner}: units do not spell ${round.word}`);
    if (round.units.some((unit) => !connectedTextPhonemes.has(unit))) {
      fail(`${owner}: uses an untaught grapheme unit`);
    }
    validatePictureSet(owner, round.word, [round.word, ...round.distractors]);
    referencedAudio.add(`/audio/words/${round.word}.mp3`);
    for (const unit of round.units) referencedAudio.add(`/audio/phonemes/${unit}.mp3`);
  }

  for (const badText of ['The boat is on the sea.', 'She does have it.']) {
    if (analyzeChildReadableText(badText, connectedTextPhonemes, connectedTextHeartWords).length === 0) {
      fail(`reading contract negative control did not reject: ${badText}`);
    }
  }

  for (const narration of CONTENT_NARRATION_PHRASES) {
    referencedAudio.add(narrationPath(narration));
  }

  for (const [iconPath, expectedSize] of [
    ['/icons/icon-192.png', 192],
    ['/icons/icon-512.png', 512],
    ['/icons/apple-touch-icon.png', 180],
  ] as const) {
    const appIcon = diskPath(iconPath);
    if (!fs.existsSync(appIcon) || fs.statSync(appIcon).size < 1_000) {
      fail(`missing app icon: ${iconPath}`);
      continue;
    }
    const metadata = await sharp(appIcon).metadata();
    if (metadata.width !== expectedSize || metadata.height !== expectedSize) {
      fail(`${iconPath}: expected ${expectedSize}x${expectedSize}, got ${metadata.width}x${metadata.height}`);
    }
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

  // A valid MP3 can still contain near-silence. Guard the always-on music and
  // feedback channels that make an audio regression most obvious to a child.
  for (const audioPath of REQUIRED_AUDIBLE_RUNTIME_AUDIO) {
    const file = diskPath(audioPath);
    if (!fs.existsSync(file)) continue;
    const volume = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], {
      encoding: 'utf8',
    });
    const match = volume.stderr.match(/max_volume:\s*(-?\d+(?:\.\d+)?) dB/);
    const maxVolume = match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
    if (volume.status !== 0 || !Number.isFinite(maxVolume) || maxVolume < -45) {
      fail(`silent or inaudible runtime audio: ${audioPath}`);
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
