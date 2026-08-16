import { expect, test } from '@playwright/test';
import { captureRuntimeFailures, expectNoOverflow, seedFreePlay } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedFreePlay(page);
});

test('Rhyme Beach keeps spellings hidden until after the child chooses', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  await page.goto('/world/1/rhyme-match');
  const target = page.getByTestId('rhyme-target');
  const choices = page.getByTestId('rhyme-choice');
  await expect(target).toBeVisible();
  await expect(choices).toHaveCount(3);
  expect((await target.textContent()) || '').not.toMatch(/[a-z]/i);
  for (const choice of await choices.all()) {
    expect((await choice.textContent()) || '').not.toMatch(/[a-z]/i);
  }
  expect(errors).toEqual([]);
});

test('Rhyme Beach keeps every choice and never reveals after repeated misses', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  await page.goto('/world/1/rhyme-match');
  const target = page.getByTestId('rhyme-target').getByRole('img');
  const targetWord = await target.getAttribute('alt');
  expect(targetWord).toBeTruthy();
  const choices = page.getByTestId('rhyme-choice');
  await expect(choices.first()).toBeEnabled({ timeout: 20_000 });
  const words = await choices.getByRole('img').evaluateAll((images) => images.map((image) => image.getAttribute('alt') || ''));
  const wrongIndex = words.findIndex((word) => word.slice(-2) !== (targetWord || '').slice(-2));
  expect(wrongIndex).toBeGreaterThanOrEqual(0);

  await choices.nth(wrongIndex).click();
  await expect(choices.first()).toBeEnabled({ timeout: 20_000 });
  await choices.nth(wrongIndex).click();
  await expect(choices.first()).toBeEnabled({ timeout: 20_000 });

  await expect(choices).toHaveCount(3);
  await expect(target).toHaveAttribute('alt', targetWord || '');
  for (const choice of await choices.all()) {
    await expect(choice).toBeEnabled();
    expect((await choice.textContent()) || '').not.toMatch(/[a-z]/i);
    expect(await choice.getAttribute('class')).not.toContain('ring-green-400');
  }
});

test('Rhyme Beach stays interactive during narration and retry never speaks an unselected answer', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  const wordRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/words/')) wordRequests.push(request.url());
  });

  await page.goto('/world/1/rhyme-match');
  const choices = page.getByTestId('rhyme-choice');
  await expect(choices.first()).toBeEnabled();

  const targetWord = await page.getByTestId('rhyme-target').getByRole('img').getAttribute('alt');
  const words = await choices.getByRole('img').evaluateAll((images) => images.map((image) => image.getAttribute('alt') || ''));
  const wrongIndex = words.findIndex((word) => word.slice(-2) !== (targetWord || '').slice(-2));
  expect(wrongIndex).toBeGreaterThanOrEqual(0);
  const selectedWord = words[wrongIndex];
  const unselectedWords = words.filter((_, index) => index !== wrongIndex);

  // Let the initial prompt finish naming the choices. We only want to audit
  // audio started by the retry after the child's wrong selection.
  await expect.poll(() => wordRequests.length).toBeGreaterThanOrEqual(4);
  wordRequests.length = 0;
  await choices.nth(wrongIndex).click();
  await expect(choices.first()).toBeEnabled();

  await expect.poll(
    () => wordRequests.some((url) => url.includes(`/audio/words/${targetWord}.mp3`))
      && wordRequests.some((url) => url.includes(`/audio/words/${selectedWord}.mp3`)),
    { timeout: 20_000 },
  ).toBe(true);

  expect(wordRequests.some((url) => url.includes(`/audio/words/${targetWord}.mp3`))).toBe(true);
  expect(wordRequests.some((url) => url.includes(`/audio/words/${selectedWord}.mp3`))).toBe(true);
  for (const word of unselectedWords) {
    expect(wordRequests.some((url) => url.includes(`/audio/words/${word}.mp3`))).toBe(false);
  }
});

test('Syllable Clap never offers separated beats before an answer', async ({ page }) => {
  await page.goto('/world/1/syllable-clap');
  await expect(page.getByRole('button', { name: /hear the beats/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clap' })).toBeVisible();
});

test('Letter Trace asks from the picture without printing its answer word', async ({ page }) => {
  const errors = captureRuntimeFailures(page);
  await page.goto('/world/2/letter-trace');
  await expect(page.getByTestId('letter-trace-prompt')).toHaveText('What letter does it start with?');
  const picture = page.getByRole('button', { name: /^Hear / }).getByRole('img');
  await expect(picture).toBeVisible();
  const answerWord = await picture.getAttribute('alt');
  expect(answerWord).toBeTruthy();
  expect((await page.locator('body').innerText()).toLowerCase()).not.toContain((answerWord || '').toLowerCase());
  expect(errors).toEqual([]);
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
  const choice = page.getByRole('button', { name: target || '', exact: true });
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
  const answerButtons = page.getByTestId('boss-answer-choice');
  await expect(answerButtons).toHaveCount(3);
  for (const answer of await answerButtons.all()) {
    expect((await answer.textContent())?.trim()).toBe('');
  }
  expect(errors).toEqual([]);
});

test('Heart Word Map requires choosing the irregular part', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  await page.goto('/world/5/heart-word-map');
  const word = (await page.locator('.text-6xl.font-bold').first().textContent())?.trim();
  expect(word).toBeTruthy();
  const choices = page.getByTestId('heart-part-choice');
  await expect(choices).toHaveCount(word === 'said' ? 3 : 2);
  const wrong = choices.first();
  await wrong.click();
  await page.waitForTimeout(800);
  await expect(page.getByText('Which part do we learn by heart?')).toBeVisible();
  for (const choice of await choices.all()) {
    await expect(choice).toBeEnabled();
    expect(await choice.getAttribute('class')).not.toContain('ring-rose-400');
  }
});

test('Treasure Memory pairs four printed cards with four sound cards', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  await page.goto('/world/5/treasure-memory');
  const cards = page.getByTestId('treasure-memory-card');
  await expect(cards).toHaveCount(8);
  await expect(page.locator('[data-testid="treasure-memory-card"][data-card-kind="print"]')).toHaveCount(4);
  await expect(page.locator('[data-testid="treasure-memory-card"][data-card-kind="audio"]')).toHaveCount(4);
});

for (const game of ['souk-sentences', 'story-stroll']) {
  test(`${game} uses picture-only comprehension choices`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
    await page.goto(`/world/${game === 'souk-sentences' ? 5 : 6}/${game}`);
    await page.getByRole('button', { name: /i read it/i }).click();
    const choices = page.getByTestId(game === 'souk-sentences' ? 'souk-picture-choice' : 'story-picture-choice');
    await expect(choices).toHaveCount(3);
    for (const choice of await choices.all()) {
      await expect(choice.getByRole('img')).toBeVisible();
      expect((await choice.textContent())?.trim()).toBe('');
    }
  });
}

test('Manatee Rescue asks one question without reading the clue aloud', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Covered once in the full interaction browser.');
  const narrationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/audio/narration/')) narrationRequests.push(request.url());
  });
  await page.goto('/world/6/manatee-rescue');
  await page.waitForTimeout(700);
  narrationRequests.length = 0;
  await page.getByRole('button', { name: /i read it/i }).click();
  await page.waitForTimeout(1200);
  expect(narrationRequests.some((url) => url.includes('the-manatee-needs-help'))).toBe(false);
  const questionRequests = narrationRequests.filter((url) => url.includes('/audio/narration/inst-'));
  expect(questionRequests.length).toBe(1);
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
