import { expect, test } from '@playwright/test';
import { WORLDS } from '../../src/lib/constants';
import { allPacks, seedFreePlay, expectNoOverflow, captureRuntimeFailures } from './helpers';

test('adventure trail and controls fit every world at phone width', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Full route layout sweep once; tablet anchors below.');
  test.setTimeout(180_000);
  await seedFreePlay(page);
  await page.setViewportSize({ width: 375, height: 812 });
  const errors = captureRuntimeFailures(page);
  for (const world of WORLDS) {
    for (const game of [...world.games, world.bossGame]) {
      await page.goto(`/world/${world.id}/${game.id}`, { waitUntil: 'domcontentloaded' });
      const trail = page.getByRole('progressbar', { name: 'Adventure progress' });
      await expect(trail).toBeVisible();
      expect((await trail.boundingBox())!.width, game.id).toBeGreaterThan(220);
      await expect(trail).toHaveAttribute('aria-valuenow', '0');
      await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport();
      expect(await expectNoOverflow(page), game.id).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('trail advances after solving, not selecting a wrong word; reload preserves rewards', async ({ page }, testInfo) => {
  if (testInfo.project.name === 'chromium') await page.setViewportSize({ width: 375, height: 812 });
  await seedFreePlay(page, allPacks, 'adventure-save', true);
  await page.goto('/');
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('eleni-sound-safari')!);
    saved.state.coins = 37;
    saved.state.passportStamps = ['test-stamp'];
    localStorage.setItem('eleni-sound-safari', JSON.stringify(saved));
  });
  await page.goto('/world/3/plaza-puzzle');
  const trail = page.getByRole('progressbar', { name: 'Adventure progress' });
  const target = page.getByTestId('plaza-target-picture').getByRole('img');
  await expect(target).toBeVisible();
  const word = (await target.getAttribute('alt'))!;
  const answer = page.getByRole('button', { name: word, exact: true });
  const wrong = page.locator('button').filter({ has: page.locator('span.lowercase') }).filter({ hasNotText: new RegExp(`^${word}$`) }).first();
  await wrong.click();
  await expect(trail).toHaveAttribute('aria-valuenow', '0');
  expect(await answer.getAttribute('class')).not.toContain('ring-green-400');
  await answer.click();
  await expect(trail).toHaveAttribute('aria-valuenow', '1', { timeout: 20_000 });
  await expect(target).not.toHaveAttribute('alt', word);
  const mosaic = await page.getByTestId('plaza-mosaic').boundingBox();
  expect(mosaic!.x).toBeGreaterThanOrEqual(0);
  expect(mosaic!.x + mosaic!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: testInfo.outputPath('adventure-trail.png'), fullPage: true });
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('eleni-sound-safari')!).state);
  expect(saved.coins).toBe(37);
  expect(saved.passportStamps).toEqual(['test-stamp']);
  expect(saved.soundStats[word].correct).toBe(1);
});

test('the final solved round fills the whole trail', async ({ page }) => {
  test.setTimeout(90_000);
  await seedFreePlay(page);
  await page.goto('/world/3/plaza-puzzle');
  const trail = page.getByRole('progressbar', { name: 'Adventure progress' });
  await expect(trail).toBeVisible();
  const total = Number(await trail.getAttribute('aria-valuemax'));
  let previousWord = '';
  for (let round = 0; round < total; round += 1) {
    await expect(trail).toHaveAttribute('aria-valuenow', String(round));
    const target = page.getByTestId('plaza-target-picture').getByRole('img');
    await expect(target).toBeVisible();
    if (previousWord) await expect(target).not.toHaveAttribute('alt', previousWord);
    const word = (await target.getAttribute('alt'))!;
    previousWord = word;
    await page.getByRole('button', { name: word, exact: true }).click();
    await expect(trail).toHaveAttribute('aria-valuenow', String(round + 1), { timeout: 20_000 });
  }
  await expect(page.getByText(`${total} / ${total} complete`, { exact: true })).toBeVisible();
});
