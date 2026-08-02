import assert from 'node:assert/strict';
import test from 'node:test';
import { useGameStore } from '../../src/lib/store';

test('v0 progress survives the V2 persistence migration', async () => {
  const legacy = {
    coins: 47,
    masteredWords: ['ant', 'pen', 'lip', 'net', 'pin', 'nap'],
    masteredPhonemes: ['s', 'a', 't', 'p', 'i', 'n'],
    ownedItems: ['toy-dino'],
    soundEnabled: false,
    volume: 0.65,
    worldProgress: {
      1: { gamesCompleted: ['rhyme-match'], bossCompleted: true, stars: 1 },
      2: { gamesCompleted: ['letter-intro'], bossCompleted: true, stars: 1 },
      3: { gamesCompleted: ['surf-slide'], bossCompleted: true, stars: 1 },
      4: { gamesCompleted: [], bossCompleted: false, stars: 0 },
    },
  };
  const migrate = useGameStore.persist.getOptions().migrate;
  assert.ok(migrate);
  const migrated = await migrate(legacy, 0) as typeof legacy & {
    enabledContentPackIds: string[];
    contentRunCounter: number;
    recentContentByGame: Record<string, unknown>;
  };

  assert.equal(migrated.coins, 47);
  assert.deepEqual(migrated.masteredWords, legacy.masteredWords);
  assert.deepEqual(migrated.ownedItems, ['toy-dino']);
  assert.equal(migrated.soundEnabled, false);
  assert.equal(migrated.volume, 0.65);
  assert.deepEqual(migrated.worldProgress, legacy.worldProgress);
  assert.deepEqual(migrated.enabledContentPackIds, ['continuous-bridge', 'cvc-grid', 'longer-words']);
  assert.equal(migrated.contentRunCounter, 0);
  assert.deepEqual(migrated.recentContentByGame, {});
});

test('minimal and corrupt persisted values get safe content defaults', async () => {
  const migrate = useGameStore.persist.getOptions().migrate;
  assert.ok(migrate);
  const migrated = await migrate({ enabledContentPackIds: ['missing-pack'] }, 0) as {
    enabledContentPackIds: string[];
    recentContentByGame: Record<string, unknown>;
  };
  assert.deepEqual(migrated.enabledContentPackIds, []);
  assert.deepEqual(migrated.recentContentByGame, {});
});

test('re-seen content moves to the newest end of recent history', () => {
  const original = useGameStore.getState().recentContentByGame;
  useGameStore.setState({ recentContentByGame: { test: { targetIds: ['a', 'b', 'c'] } } });
  useGameStore.getState().recordContentBatch('test', ['a']);
  assert.deepEqual(useGameStore.getState().recentContentByGame.test.targetIds, ['b', 'c', 'a']);
  useGameStore.setState({ recentContentByGame: original });
});
