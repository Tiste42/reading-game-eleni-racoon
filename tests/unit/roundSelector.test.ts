import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAssessmentChoiceSet, buildChoiceSet, getBalancedAnswerIndex, selectTargets, shuffleSeeded } from '../../src/lib/roundSelector';
import { canSharePictureChoices } from '../../src/content/pictureConflicts';
import { canShareSoundChoices } from '../../src/content/phonemeConflicts';
import { isReadyForWordChallenge, readingContrastScore, selectLearningTargets } from '../../src/lib/learningChallenge';
import { selectSoundPictureTargets } from '../../src/content/earlyRoundBuilders';

test('picture variants cannot crowd out different sounds in the same run', () => {
  const candidates = ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'].flatMap((targetLetter) =>
    [0, 1, 2].map((variant) => ({ id: `${targetLetter}:${variant}`, targetLetter, targetWords: [], distractorWords: [] })),
  );
  const first = selectSoundPictureTargets(candidates, { count: 4, seed: 'sounds-1' });
  const second = selectSoundPictureTargets(candidates, { count: 4, seed: 'sounds-2', recentIds: first.map((item) => item.id) });
  assert.equal(new Set(first.map((item) => item.targetLetter)).size, 4);
  assert.equal(new Set([...first, ...second].map((item) => item.targetLetter)).size, 8);
  const third = selectSoundPictureTargets(candidates, { count: 4, seed: 'sounds-3', recentIds: [...first, ...second].map((item) => item.id) });
  assert.equal(third.some((item) => first.some((previous) => previous.id === item.id)), false);
  assert.equal(third.some((item) => second.some((previous) => previous.targetLetter === item.targetLetter)), false);
});

const ids = Array.from({ length: 12 }, (_, index) => ({ id: `item-${index}` }));
const getId = (item: { id: string }) => item.id;

test('last one to five untaught letters cannot be lost in shuffled review', () => {
  for (let remaining = 1; remaining <= 5; remaining += 1) {
    for (let run = 0; run < 100; run += 1) {
      const newIds = new Set(ids.slice(0, remaining).map(getId));
      const selected = selectLearningTargets(ids, {
        count: 6, seed: `coverage-${run}`, getId,
        recentIds: ids.map(getId), isNew: (item) => newIds.has(item.id), needsPractice: () => false,
      });
      assert.equal(selected.length, 6);
      assert.equal(new Set(selected.map(getId)).size, 6);
      assert.ok([...newIds].every((id) => selected.some((item) => item.id === id)));
    }
  }
});

test('a full alphabet is covered in five successful six-round sessions', () => {
  const letters = [...'abcdefghijklmnopqrstuvwxyz'].map((id) => ({ id }));
  const taught = new Set<string>();
  let recentIds: string[] = [];
  for (let run = 0; run < 5; run += 1) {
    const selected = selectLearningTargets(letters, {
      count: 6, seed: `alphabet-${run}`, getId, recentIds,
      isNew: (item) => !taught.has(item.id), needsPractice: () => false,
    });
    selected.forEach((item) => taught.add(item.id));
    recentIds = [...recentIds, ...selected.map(getId)].slice(-24);
  }
  assert.equal(taught.size, 26);
});

test('uncertain review is limited to two slots when varied practice is available', () => {
  const weak = new Set(ids.slice(0, 4).map(getId));
  const selected = selectLearningTargets(ids, {
    count: 6, seed: 'review-limit', getId, isNew: () => false, needsPractice: (item) => weak.has(item.id),
  });
  assert.equal(selected.filter((item) => weak.has(item.id)).length, 2);
  assert.equal(selected.length, 6);
  const small = selectLearningTargets(ids.slice(0, 2), {
    count: 6, seed: 'small', getId, isNew: () => false, needsPractice: () => true,
  });
  assert.equal(small.length, 2);
  assert.equal(new Set(small.map(getId)).size, 2);
});

test('reading challenge requires repeated accurate answers and backs off with errors', () => {
  assert.equal(isReadyForWordChallenge(), false);
  assert.equal(isReadyForWordChallenge({ correct: 1, wrong: 0 }), false);
  assert.equal(isReadyForWordChallenge({ correct: 3, wrong: 0 }), true);
  assert.equal(isReadyForWordChallenge({ correct: 3, wrong: 1 }), false);
  assert.equal(isReadyForWordChallenge({ correct: 4, wrong: 1 }), true);
  assert.equal(readingContrastScore('cat', 'cut'), 2);
  assert.equal(readingContrastScore('cat', 'bat'), 1);
  assert.equal(readingContrastScore('cat', 'dog'), 0);
  assert.equal(readingContrastScore('cat', 'coat'), 0);
});

test('earned contrast still obeys safety, variety and balanced answer positions', () => {
  const words = ['cat', 'cut', 'bat', 'dog', 'sun'].map((id) => ({ id }));
  const otherChoices = new Set<string>();
  for (let round = 0; round < 90; round += 1) {
    const answerIndex = getBalancedAnswerIndex(round, 3, 'contrast');
    const choices = buildChoiceSet(words[0], words, {
      count: 3, seed: `contrast-${round}`, answerIndex, getId,
      canUseDistractor: (_, distractor) => distractor.id !== 'cut',
      distractorScore: (answer, distractor) => readingContrastScore(answer.id, distractor.id),
    });
    assert.equal(choices[answerIndex].id, 'cat');
    assert.equal(choices.some((choice) => choice.id === 'cut'), false);
    assert.ok(choices.some((choice) => choice.id === 'bat'));
    assert.equal(new Set(choices.map(getId)).size, 3);
    choices.filter((choice) => !['cat', 'bat'].includes(choice.id)).forEach((choice) => otherChoices.add(choice.id));
  }
  assert.deepEqual([...otherChoices].sort(), ['dog', 'sun']);
});

test('seeded shuffle is repeatable and does not mutate input', () => {
  const original = [...ids];
  const first = shuffleSeeded(ids, 'same-seed');
  const second = shuffleSeeded(ids, 'same-seed');
  assert.deepEqual(first, second);
  assert.deepEqual(ids, original);
  assert.notDeepEqual(first, ids);
});

test('target selection exhausts fresh content before recent targets', () => {
  const recentIds = ids.slice(0, 6).map(getId);
  const selected = selectTargets(ids, { count: 6, seed: 'fresh-first', recentIds, getId });
  assert.equal(selected.length, 6);
  assert.ok(selected.every((item) => !recentIds.includes(item.id)));
});

test('an exhausted pool relaxes oldest-first without repeating the last batch', () => {
  const first = selectTargets(ids, { count: 6, seed: 'first', getId });
  const second = selectTargets(ids, {
    count: 6,
    seed: 'second',
    recentIds: first.map(getId),
    getId,
  });
  const third = selectTargets(ids, {
    count: 6,
    seed: 'third',
    recentIds: [...first, ...second].map(getId),
    getId,
  });
  assert.deepEqual(new Set(third.map(getId)), new Set(first.map(getId)));
  assert.equal(third.some((item) => second.some((recent) => recent.id === item.id)), false);
});

test('choice generation always has one answer, unique options, and authored position', () => {
  const answer = ids[0];
  const positionCounts = [0, 0, 0];
  for (let run = 0; run < 10_000; run += 1) {
    const answerIndex = getBalancedAnswerIndex(run, 3, `run-${Math.floor(run / 9)}`);
    const choices = buildChoiceSet(answer, ids, {
      count: 3,
      seed: `run-${run}`,
      answerIndex,
      getId,
    });
    assert.equal(choices.length, 3);
    assert.equal(new Set(choices.map(getId)).size, 3);
    assert.equal(choices.filter((item) => item.id === answer.id).length, 1);
    assert.equal(choices[answerIndex].id, answer.id);
    positionCounts[answerIndex] += 1;
  }
  assert.deepEqual(positionCounts, [3334, 3333, 3333]);
});

test('answer positions are balanced without repeating a fixed left-to-right cycle', () => {
  const positions = Array.from({ length: 9 }, (_, round) =>
    getBalancedAnswerIndex(round, 3, 'eleni-session'),
  );
  for (let cycle = 0; cycle < 3; cycle += 1) {
    assert.deepEqual([...positions.slice(cycle * 3, cycle * 3 + 3)].sort(), [0, 1, 2]);
  }
  assert.notDeepEqual(positions.slice(0, 3), [0, 1, 2]);
  assert.deepEqual(
    positions,
    Array.from({ length: 9 }, (_, round) => getBalancedAnswerIndex(round, 3, 'eleni-session')),
  );
});

test('picture choices exclude look-alike answers without shrinking the round', () => {
  const words = ['cap', 'hat', 'dog', 'sun', 'fish'].map((id) => ({ id }));
  const choices = buildChoiceSet(words[0], words, {
    count: 3,
    seed: 'safe-pictures',
    answerIndex: 1,
    getId,
    canUseDistractor: (answer, distractor) => canSharePictureChoices(answer.id, distractor.id),
  });
  assert.equal(choices.length, 3);
  assert.equal(choices[1].id, 'cap');
  assert.equal(choices.some((choice) => choice.id === 'hat'), false);
});

test('known ambiguous picture pairs never appear together', () => {
  const unsafePairs = [
    ['dog', 'pup'], ['dog', 'pet'], ['dog', 'pug'], ['dog', 'sit'], ['dog', 'wet'],
    ['bin', 'tin'], ['bin', 'can'], ['tin', 'can'], ['cot', 'bed'], ['jog', 'run'],
    ['hot', 'pot'], ['hot', 'log'], ['pot', 'log'], ['man', 'cap'],
  ] as const;

  for (const [left, right] of unsafePairs) {
    assert.equal(canSharePictureChoices(left, right), false, `${left}/${right} should be excluded`);
  }
});

test('a large boss pool still balances the answer across exactly three choices', () => {
  const largePool = Array.from({ length: 53 }, (_, index) => ({ id: `word-${index}` }));
  const positions = [0, 0, 0];
  for (let round = 0; round < 300; round += 1) {
    const choices = buildAssessmentChoiceSet(largePool[0], largePool, {
      round,
      seed: 'boss-three-choices',
      getId,
    });
    assert.equal(choices.length, 3);
    positions[choices.findIndex((choice) => choice.id === largePool[0].id)] += 1;
  }
  assert.deepEqual(positions, [100, 100, 100]);
});

test('equivalent c and k sounds never compete as separate correct answers', () => {
  const choices = buildChoiceSet({ id: 'c' }, [{ id: 'c' }, { id: 'k' }, { id: 'e' }, { id: 'm' }], {
    count: 3,
    seed: 'phoneme-equivalence',
    answerIndex: 0,
    getId,
    canUseDistractor: (answer, distractor) => canShareSoundChoices(answer.id, distractor.id),
  });
  assert.equal(choices.some((choice) => choice.id === 'k'), false);
  assert.equal(choices.length, 3);
});
