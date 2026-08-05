import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEnabledPacks,
  getInitialSoundGroups,
  getLetterExamples,
  getPostcards,
  getStories,
  getWordChains,
  getWordsForActivity,
  normalizeEnabledPackIds,
  updateEnabledPackIds,
} from '../../src/content/registry';
import { getPracticedPhonemes } from '../../src/content/progression';
import { buildRhymeCandidates, buildSoundPictureCandidates } from '../../src/content/earlyRoundBuilders';
import { getRhymeFamilies } from '../../src/content/registry';
import { hasChildIdentifiablePicture } from '../../src/content/pictureQuality';
import { canSharePictureChoices } from '../../src/content/pictureConflicts';

test('core stays active while optional packs can be removed', () => {
  assert.deepEqual(getEnabledPacks([]).map((pack) => pack.id), ['core']);
  assert.ok(getWordsForActivity([], 'blend-to-picture').every((word) => word.id.startsWith('core:')));
});

test('enabling a harder pack includes its prerequisite packs', () => {
  assert.deepEqual(
    updateEnabledPackIds([], 'longer-words', true),
    ['continuous-bridge', 'cvc-grid', 'longer-words'],
  );
});

test('disabling a prerequisite removes dependent packs', () => {
  const all = normalizeEnabledPackIds(['continuous-bridge', 'cvc-grid', 'longer-words']);
  assert.deepEqual(updateEnabledPackIds(all, 'continuous-bridge', false), []);
  assert.deepEqual(updateEnabledPackIds(all, 'cvc-grid', false), ['continuous-bridge']);
});

test('optional later-sound packs never leak into World 2 or World 3 pools', () => {
  const coreWords = new Set(getWordsForActivity([], 'picture-to-build').map((word) => word.text));
  const expandedWords = new Set(
    getWordsForActivity(['continuous-bridge', 'cvc-grid', 'longer-words'], 'picture-to-build').map((word) => word.text),
  );
  assert.equal(coreWords.has('map'), false);
  assert.deepEqual(expandedWords, coreWords);
  assert.equal(expandedWords.has('dog'), false);
  assert.equal(expandedWords.has('ship'), false);
  for (const word of expandedWords) {
    const entry = getWordsForActivity([], 'picture-to-build').find((candidate) => candidate.text === word);
    assert.ok(entry?.units.every((unit) => ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l'].includes(unit.phonemeId)));
  }
});

test('enabled packs expand only progression-safe later-world activities', () => {
  const all = ['continuous-bridge', 'cvc-grid', 'longer-words'];
  assert.ok(getWordChains(all).some((chain) => chain.id === 'core:pin-pen'));
  assert.ok(getWordChains(all).some((chain) => chain.id === 'cvc:bug-mug'));
  assert.ok(getStories(all).some((story) => story.id === 'longer:story-ship' && story.correct === 'ship'));
  assert.ok(getPostcards(all).some((postcard) => postcard.correct === 'ship'));
});

test('Alphabet Adventure covers all 26 letters with concrete examples', () => {
  const examples = getLetterExamples(['alphabet-adventure']);
  assert.equal(examples.length, 26);
  assert.deepEqual(examples.map((example) => example.letter).sort(), 'abcdefghijklmnopqrstuvwxyz'.split(''));
  assert.equal(examples.find((example) => example.letter === 'x')?.word, 'fox');
});

test('new World 3 words stay locked until every sound has been taught', () => {
  const enabled = ['alphabet-adventure'] as const;
  const coreOnly = getPracticedPhonemes(enabled, ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l']);
  const coreWords = getWordsForActivity(enabled, 'blend-to-picture', coreOnly).map((word) => word.text);
  assert.equal(coreWords.includes('dog'), false);
  assert.equal(coreWords.includes('fox'), false);

  const allTaught = getPracticedPhonemes(enabled, 'abcdefghijklmnopqrstuvwxyz'.split(''));
  const expandedWords = getWordsForActivity(enabled, 'blend-to-picture', allTaught).map((word) => word.text);
  assert.equal(expandedWords.includes('dog'), true);
  assert.equal(expandedWords.includes('fox'), true);
  assert.ok(expandedWords.length >= 25);
  assert.ok(expandedWords.every(hasChildIdentifiablePicture));
});

test('early round builders provide broad valid rotating pools', () => {
  const groups = getInitialSoundGroups(['alphabet-adventure']);
  const soundRounds = buildSoundPictureCandidates(groups, 2, 2, 2);
  assert.ok(soundRounds.length >= 20);
  assert.ok(soundRounds.every((round) => round.targetWords.length >= 2));
  assert.ok(soundRounds.every((round) => new Set([...round.targetWords, ...round.distractorWords]).size === round.targetWords.length + round.distractorWords.length));
  assert.ok(soundRounds.every((round) => {
    const choices = [...round.targetWords, ...round.distractorWords];
    return choices.every((word, index) => choices.slice(index + 1).every((other) => canSharePictureChoices(word, other)));
  }));
  const cRound = soundRounds.find((round) => round.targetLetter === 'c');
  assert.ok(cRound);
  assert.equal(cRound.distractorWords.includes('kite'), false);

  const rhymeRounds = buildRhymeCandidates(getRhymeFamilies(['alphabet-adventure']));
  assert.ok(rhymeRounds.length >= 18);
  assert.ok(rhymeRounds.every((round) => round.match !== round.target && round.distractors.length === 2));
  assert.ok(rhymeRounds.every((round) => {
    const choices = [round.target, round.match, ...round.distractors];
    return choices.every(hasChildIdentifiablePicture) &&
      choices.every((word, index) => choices.slice(index + 1).every((other) => canSharePictureChoices(word, other)));
  }));
});
