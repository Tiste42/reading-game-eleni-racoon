import { expect, test } from '@playwright/test';
import { WORLDS } from '../../src/lib/constants';
import { allPacks, seedFreePlay } from './helpers';

const gameRoutes = WORLDS.flatMap((world) =>
  [...world.games, world.bossGame].map((game) => ({
    name: `World ${world.id}: ${game.name}`,
    route: `/world/${world.id}/${game.id}`,
  })),
);

const gameplayButtonSelector = [
  'button:visible',
  ':not([disabled])',
  ':not([aria-label="Back"])',
  ':not([aria-label="Settings"])',
  ':not([aria-label="Home"])',
  ':not([aria-label^="Turn on music"])',
  ':not([aria-label^="Turn off music"])',
  ':not([aria-label="Hear the directions again"])',
].join('');

test('every game keeps a primary touch action available when narration cannot play', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One full mobile interaction pass is sufficient.');
  test.setTimeout(180_000);

  await seedFreePlay(page, allPacks, 'game-wide-silent-audio');
  await page.route('**/audio/**', (route) => route.abort());
  await page.addInitScript(() => {
    if (window.speechSynthesis) window.speechSynthesis.speak = () => undefined;
  });
  await page.setViewportSize({ width: 390, height: 844 });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const failures: string[] = [];

  for (const game of gameRoutes) {
    try {
      await page.goto(game.route, { waitUntil: 'domcontentloaded' });
      const primaryActions = page.locator(gameplayButtonSelector);
      await expect(primaryActions.first(), `${game.name} has no usable touch action`).toBeEnabled({ timeout: 3_000 });
      // Some blending controls intentionally bob with the character. Force the
      // pointer dispatch after proving the control is enabled so animation
      // stability does not masquerade as an input lock.
      await primaryActions.first().click({ force: true, timeout: 3_000 });
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
      failures.push(`${game.name} (${game.route}): ${message}`);
    }
  }

  expect(failures).toEqual([]);
  expect(pageErrors).toEqual([]);
});
