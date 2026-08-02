import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEnabledPacks,
  getPostcards,
  getStories,
  getWordChains,
  getWordsForActivity,
  normalizeEnabledPackIds,
  updateEnabledPackIds,
} from '../../src/content/registry';

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
  assert.ok(getWordChains(all).some((chain) => chain.to.text === 'rat'));
  assert.ok(getStories(all).some((story) => story.pictureWord === 'lamp'));
  assert.ok(getPostcards(all).some((postcard) => postcard.correct === 'ship'));
});
