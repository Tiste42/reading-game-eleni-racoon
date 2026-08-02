import assert from 'node:assert/strict';
import test from 'node:test';
import { buildChoiceSet, getBalancedAnswerIndex, selectTargets, shuffleSeeded } from '../../src/lib/roundSelector';

const ids = Array.from({ length: 12 }, (_, index) => ({ id: `item-${index}` }));
const getId = (item: { id: string }) => item.id;

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
