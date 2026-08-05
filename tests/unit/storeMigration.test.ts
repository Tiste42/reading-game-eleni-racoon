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
    taughtPhonemes: string[];
  };

  assert.equal(migrated.coins, 47);
  assert.deepEqual(migrated.masteredWords, legacy.masteredWords);
  assert.deepEqual(migrated.ownedItems, ['toy-dino']);
  assert.equal(migrated.soundEnabled, false);
  assert.equal(migrated.volume, 0.65);
  assert.deepEqual(migrated.worldProgress, legacy.worldProgress);
  assert.deepEqual(migrated.enabledContentPackIds, ['alphabet-adventure', 'continuous-bridge', 'cvc-grid', 'longer-words']);
  assert.deepEqual(migrated.taughtPhonemes, 'abcdefghijklmnopqrstuvwxyz'.split(''));
  assert.equal(migrated.contentRunCounter, 0);
  assert.deepEqual(migrated.recentContentByGame, {});
});

test('minimal and corrupt persisted values get safe content defaults', async () => {
  const migrate = useGameStore.persist.getOptions().migrate;
  assert.ok(migrate);
  const migrated = await migrate({ enabledContentPackIds: ['missing-pack'] }, 0) as {
    enabledContentPackIds: string[];
    recentContentByGame: Record<string, unknown>;
    taughtPhonemes: string[];
  };
  assert.deepEqual(migrated.enabledContentPackIds, ['alphabet-adventure']);
  assert.deepEqual(migrated.taughtPhonemes, ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l']);
  assert.deepEqual(migrated.recentContentByGame, {});
});

test('v3 later-world saves recover the prerequisites their completed games imply', async () => {
  const migrate = useGameStore.persist.getOptions().migrate;
  assert.ok(migrate);
  const worldProgress = Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((world) => [world, {
      gamesCompleted: world === 5 ? ['digraph-discovery', 'heart-word-map', 'treasure-memory'] : [],
      bossCompleted: false,
      stars: world === 5 ? 3 : 0,
    }]),
  );
  const migrated = await migrate({
    worldProgress,
    taughtPhonemes: ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l'],
    masteredWords: ['the'],
    enabledContentPackIds: ['alphabet-adventure'],
  }, 3) as { taughtPhonemes: string[]; masteredWords: string[] };

  assert.ok('abcdefghijklmnopqrstuvwxyz'.split('').every((sound) => migrated.taughtPhonemes.includes(sound)));
  assert.ok(['sh', 'ch', 'th'].every((sound) => migrated.taughtPhonemes.includes(sound)));
  assert.ok(['the', 'was', 'said', 'is', 'to', 'he', 'she'].every((word) => migrated.masteredWords.includes(word)));
});

test('re-seen content moves to the newest end of recent history', () => {
  const original = useGameStore.getState().recentContentByGame;
  useGameStore.setState({ recentContentByGame: { test: { targetIds: ['a', 'b', 'c'] } } });
  useGameStore.getState().recordContentBatch('test', ['a']);
  assert.deepEqual(useGameStore.getState().recentContentByGame.test.targetIds, ['b', 'c', 'a']);
  useGameStore.setState({ recentContentByGame: original });
});
