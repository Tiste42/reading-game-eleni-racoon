import { expect, test } from '@playwright/test';
import { captureRuntimeFailures } from './helpers';

test('optional packs toggle with dependency-safe persistence', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  await page.goto('/parent');

  const alphabet = page.getByRole('button', { name: 'Toggle Alphabet Adventure' });
  const continuous = page.getByRole('button', { name: 'Toggle Stretchy Sounds' });
  const cvc = page.getByRole('button', { name: 'Toggle New CVC Grid' });
  const longer = page.getByRole('button', { name: 'Toggle Longer Word Challenge' });
  await expect(alphabet).toHaveAttribute('aria-pressed', 'true');
  await expect(continuous).toHaveAttribute('aria-pressed', 'false');

  await longer.click();
  await expect(longer).toHaveAttribute('aria-pressed', 'true');
  await expect(continuous).toHaveAttribute('aria-pressed', 'true');
  await expect(cvc).toHaveAttribute('aria-pressed', 'true');
  await expect(longer).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(longer).toHaveAttribute('aria-pressed', 'true');

  await continuous.click();
  await expect(continuous).toHaveAttribute('aria-pressed', 'false');
  await expect(cvc).toHaveAttribute('aria-pressed', 'false');
  await expect(longer).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('a disabled alphabet pack can be restored from the later-world prerequisite', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One persisted prerequisite check is sufficient.');
  await page.addInitScript(() => {
    const worldProgress = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((world) => [world, { gamesCompleted: [], bossCompleted: false, stars: 0 }]),
    );
    localStorage.setItem('eleni-sound-safari', JSON.stringify({
      version: 4,
      state: {
        worldProgress,
        freePlay: true,
        enabledContentPackIds: [],
        taughtPhonemes: ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l'],
        masteredWords: [],
      },
    }));
  });

  await page.goto('/world/5/digraph-discovery');
  const restore = page.getByRole('button', { name: 'Turn on Alphabet Adventure' });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(page).toHaveURL(/\/world\/2\/letter-intro$/);
  const enabled = await page.evaluate(() => JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}').state.enabledContentPackIds);
  expect(enabled).toContain('alphabet-adventure');
});

test('legacy progress migrates without losing child data', async ({ page }) => {
  await page.addInitScript(() => {
    const worldProgress = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((world) => [world, {
        gamesCompleted: world === 3 ? ['surf-slide'] : [],
        bossCompleted: world === 3,
        stars: world === 3 ? 1 : 0,
      }]),
    );
    localStorage.setItem('eleni-sound-safari', JSON.stringify({
      version: 0,
      state: {
        worldProgress,
        coins: 47,
        masteredWords: ['ant', 'pen', 'lip', 'net', 'pin', 'nap'],
        masteredPhonemes: ['s', 'a', 't', 'p', 'i', 'n'],
        ownedItems: ['toy-dino'],
        soundStats: {},
        sessionHistory: [],
        companions: [], costumes: [], passportStamps: [], streakCount: 0,
        currentWorld: 3, soundEnabled: false, musicEnabled: false,
        volume: 0.65, musicVolume: 0.08, freePlay: true,
      },
    }));
  });

  await page.goto('/parent');
  await expect(page.getByText('47').first()).toBeVisible();
  await expect(page.getByText('ant')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Toggle Longer Word Challenge' })).toHaveAttribute('aria-pressed', 'true');
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}'));
  expect(persisted.version).toBe(5);
  expect(persisted.state.coins).toBe(47);
  expect(persisted.state.masteredWords).toContain('nap');
  expect(persisted.state.enabledContentPackIds).toContain('alphabet-adventure');
  expect(persisted.state.taughtPhonemes).toHaveLength(26);
});

test('Letter Intro rotates to a fresh alphabet batch on the next visit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One persistence rotation check is sufficient.');
  await page.addInitScript(() => {
    if (localStorage.getItem('eleni-sound-safari')) return;
    const worldProgress = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((world) => [world, { gamesCompleted: [], bossCompleted: false, stars: 0 }]),
    );
    localStorage.setItem('eleni-sound-safari', JSON.stringify({
      version: 4,
      state: {
        worldProgress,
        freePlay: true,
        enabledContentPackIds: ['alphabet-adventure'],
        taughtPhonemes: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        contentSeed: 'rotation-test',
        contentRunCounter: 0,
        recentContentByGame: {},
      },
    }));
  });

  await page.goto('/world/2/letter-intro');
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}');
    return saved.state?.recentContentByGame?.['letter-intro']?.targetIds?.length || 0;
  })).toBe(6);
  const first = await page.evaluate(() => JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}').state.recentContentByGame['letter-intro'].targetIds);

  await page.goto('/parent');
  await page.goto('/world/2/letter-intro');
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}');
    return saved.state?.recentContentByGame?.['letter-intro']?.targetIds?.length || 0;
  })).toBe(12);
  const second = await page.evaluate(() => JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}').state.recentContentByGame['letter-intro'].targetIds.slice(-6));
  expect(second.some((id: string) => first.includes(id))).toBe(false);
});
