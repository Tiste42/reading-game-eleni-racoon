import { expect, test } from '@playwright/test';
import { captureRuntimeFailures } from './helpers';

test('optional packs toggle with dependency-safe persistence', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  await page.goto('/parent');

  const continuous = page.getByRole('button', { name: 'Toggle Stretchy Sounds' });
  const cvc = page.getByRole('button', { name: 'Toggle New CVC Grid' });
  const longer = page.getByRole('button', { name: 'Toggle Longer Word Challenge' });
  await expect(continuous).toHaveAttribute('aria-pressed', 'false');

  await longer.click();
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
  expect(persisted.version).toBe(2);
  expect(persisted.state.coins).toBe(47);
  expect(persisted.state.masteredWords).toContain('nap');
});
