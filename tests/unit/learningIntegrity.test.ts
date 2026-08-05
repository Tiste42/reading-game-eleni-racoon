import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import {
  AUTOMATIC_ANSWER_REVEALS_ENABLED,
  HEART_WORDS,
  REQUIRED_DIGRAPHS,
  buildPrintAudioCards,
  canAutomaticallyRevealAnswer,
} from '../../src/content/learningIntegrity';
import { getStories } from '../../src/content/registry';
import { hasChildIdentifiablePicture } from '../../src/content/pictureQuality';

const root = process.cwd();
const source = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('wrong attempts can never enable an automatic answer reveal', () => {
  assert.equal(AUTOMATIC_ANSWER_REVEALS_ENABLED, false);
  for (const attempts of [0, 1, 2, 3, 10, 1_000]) {
    assert.equal(canAutomaticallyRevealAnswer(attempts, 2), false);
  }
});

test('both th sounds are required before connected reading', () => {
  assert.deepEqual(REQUIRED_DIGRAPHS, ['sh', 'ch', 'th', 'th-voiced']);
  const discovery = source('src/components/game/DigraphDiscovery.tsx');
  assert.ok(discovery.includes("phonemeId: 'th'"));
  assert.ok(discovery.includes("phonemeId: 'th-voiced'"));
  assert.ok(discovery.includes("entry.phonemeId === 'th'"));
  assert.ok(discovery.includes("entry.phonemeId === 'th-voiced'"));
});

test('heart words have one accurate, selectable irregular chunk', () => {
  for (const entry of HEART_WORDS) {
    assert.equal(entry.parts.join(''), entry.word);
    assert.ok(entry.heartIndex >= 0 && entry.heartIndex < entry.parts.length);
  }

  assert.deepEqual(HEART_WORDS.find((entry) => entry.word === 'the'), {
    word: 'the', parts: ['th', 'e'], heartIndex: 1,
  });
  assert.deepEqual(HEART_WORDS.find((entry) => entry.word === 'she'), {
    word: 'she', parts: ['sh', 'e'], heartIndex: 1,
  });
  assert.deepEqual(HEART_WORDS.find((entry) => entry.word === 'was'), {
    word: 'was', parts: ['w', 'as'], heartIndex: 1,
  });
});

test('treasure memory pairs print with audio, never identical printed cards', () => {
  const cards = buildPrintAudioCards(['the', 'said', 'was']);
  assert.equal(cards.length, 6);
  for (const word of ['the', 'said', 'was']) {
    const pair = cards.filter((card) => card.word === word);
    assert.deepEqual(pair.map((card) => card.kind).sort(), ['audio', 'print']);
  }
});

test('connected-reading answers are single, child-identifiable picture words', () => {
  const stories = getStories(['continuous-bridge', 'cvc-grid', 'longer-words']);
  assert.ok(stories.length >= 10);
  for (const story of stories) {
    assert.equal(story.options.filter((option) => option === story.correct).length, 1);
    assert.ok(story.options.every((option) => !option.includes(' ')));
    assert.ok(story.options.every(hasChildIdentifiablePicture));
  }
});

test('direct-answer helpers and duplicate read-gate narration stay removed', () => {
  const syllables = source('src/components/game/SyllableClap.tsx');
  assert.equal(syllables.includes('Hear the beats'), false);
  assert.equal(syllables.includes('speakSyllables'), false);

  for (const file of ['StoryStroll.tsx', 'ComicCreator.tsx', 'BeachDetective.tsx']) {
    const contents = source(`src/components/game/${file}`);
    assert.equal(contents.includes('setPhase(\'answer\');\n    speak(current.question)'), false, file);
  }

  const manatee = source('src/components/game/ManateeRescue.tsx');
  assert.equal(manatee.includes('spokenLine'), false);
  assert.equal(manatee.includes('Remove the net'), false);
  assert.equal(manatee.includes('Move the log'), false);

  for (const file of ['MarketBuilder.tsx', 'PotionLab.tsx']) {
    assert.equal(source(`src/components/game/${file}`).includes('showHint'), false, file);
  }

  assert.ok(source('src/components/game/PotionLab.tsx').includes('chain.distractorUnits.every'));
  assert.ok(source('src/components/game/RuinDecoder.tsx').includes('WORLD_5_DECODER_ROUNDS'));
  assert.equal(source('src/components/game/RhymeBeach.tsx').includes('repeat: Infinity'), false);
});
