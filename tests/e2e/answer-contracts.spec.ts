import { expect, test } from '@playwright/test';
import { captureRuntimeFailures, expectNoOverflow, seedFreePlay } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFreePlay(page);
});

test('Market Builder does not pronounce its pictured answer before completion', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  const wordRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/words/')) wordRequests.push(request.url());
  });
  await page.goto('/world/3/market-builder');
  const picture = page.getByTestId('market-target-picture').getByRole('img');
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const target = await picture.getAttribute('alt');
  expect(target).toBeTruthy();
  await page.waitForTimeout(900);
  expect(wordRequests.some((url) => url.includes(`/audio/words/${target}.mp3`))).toBe(false);
  expect(await expectNoOverflow(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('Plaza Puzzle uses one picture with text-only decoding choices', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  await page.goto('/world/3/plaza-puzzle');
  const picture = page.getByTestId('plaza-target-picture').getByRole('img');
  await expect(picture).toBeVisible();
  await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const target = await picture.getAttribute('alt');
  expect(target).toBeTruthy();
  const matchingText = page.getByRole('button', { name: target || '' });
  await expect(matchingText).toBeVisible();
  await matchingText.click();
  expect(errors).toEqual([]);
});

test('World 3 boss shows one written target and unlabeled picture choices', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  await page.goto('/world/3/boss-3');
  const target = (await page.locator('.text-6xl.font-bold').first().textContent())?.trim();
  expect(target).toBeTruthy();
  const choice = page.getByRole('button', { name: target || '' });
  await expect(choice).toBeVisible();
  await expect(choice).not.toContainText(target || 'missing');
  await choice.click();
  expect(errors).toEqual([]);
});

test('Potion Lab shows the destination picture before asking for a unique swap', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  const errors = captureRuntimeFailures(page);
  await page.goto('/world/4/potion-lab');
  const targetPicture = page.getByTestId('potion-target-picture').getByRole('img');
  const startingWord = await targetPicture.getAttribute('alt');
  expect(startingWord).toBeTruthy();
  for (const letter of startingWord || '') {
    await page.getByRole('button', { name: letter, exact: true }).filter({ visible: true }).first().click();
  }
  await expect.poll(() => targetPicture.getAttribute('alt'), { timeout: 15_000 }).not.toBe(startingWord);
  await expect(targetPicture).toBeVisible();
  expect(errors).toEqual([]);
});

test('later boss sentence rounds ask a real question without a picture answer cue', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  const errors = captureRuntimeFailures(page);
  await page.goto('/world/5/boss-5');
  await expect(page.getByTestId('boss-question')).toBeVisible();
  await expect(page.getByTestId('boss-question')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
]) {
  test(`upgraded games fit the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of [
      '/world/2/sound-safari',
      '/world/2/letter-match',
      '/world/3/surf-slide',
      '/world/3/market-builder',
      '/world/3/sailboat-race',
      '/world/3/sound-telescope',
      '/world/3/plaza-puzzle',
      '/world/4/potion-lab',
      '/world/6/story-stroll',
      '/world/6/postcard-writer',
    ]) {
      await page.goto(route);
      await expect(page.locator('body')).not.toBeEmpty();
      expect(await expectNoOverflow(page), `${route} overflowed`).toBe(true);
    }
  });
}
