import { expect, test } from '@playwright/test';
import { WORLDS } from '../../src/lib/constants';
import { allPacks, captureRuntimeFailures, seedFreePlay } from './helpers';

const gameRoutes = WORLDS.flatMap((world) =>
  [...world.games, world.bossGame].map((game) => `/world/${world.id}/${game.id}`),
);

test('every existing game boots with its visible pictures intact', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One full-route smoke pass is sufficient; anchors run in every browser.');
  await seedFreePlay(page, allPacks);
  const errors = captureRuntimeFailures(page);
  const failedAssets: string[] = [];
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (url.includes('/audio/') || url.includes('/images/')) failedAssets.push(`${response.status()} ${url}`);
  });

  for (const route of gameRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toBeEmpty();
    await expect.poll(
      () => page.locator('img:visible').evaluateAll((images) =>
        images
          .filter((image) => !(image as HTMLImageElement).complete || (image as HTMLImageElement).naturalWidth === 0)
          .map((image) => (image as HTMLImageElement).src),
      ),
      { message: `${route} showed a broken image`, timeout: 5_000 },
    ).toEqual([]);
  }

  expect(failedAssets).toEqual([]);
  expect(errors).toEqual([]);
});
