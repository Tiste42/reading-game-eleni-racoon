import { expect, test } from '@playwright/test';
import { buildRhymeCandidates } from '../../src/content/earlyRoundBuilders';
import { getRhymeFamilies } from '../../src/content/registry';
import { allPacks, seedFreePlay } from './helpers';

test('World 1 rhyme choices stay touchable when automatic narration stalls', async ({ page }) => {
  // This seed reproduces the upgraded `star` round reported from production.
  await seedFreePlay(page, allPacks, 'hotfix13');
  await page.addInitScript(() => {
    // Simulate the Apple failure mode: media `play()` resolves, but playback
    // never begins and no `ended` or `error` event arrives.
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'iPhone' });
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    if (window.speechSynthesis) {
      window.speechSynthesis.speak = () => undefined;
    }
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/world/1/rhyme-match');

  const target = page.getByTestId('rhyme-target').getByRole('img');
  await expect(target).toHaveAttribute('alt', 'star');
  const choices = page.getByTestId('rhyme-choice');
  await expect(choices).toHaveCount(3);
  await expect(choices.first()).toBeEnabled({ timeout: 2_000 });

  const replay = page.getByRole('button', { name: 'Hear the directions again' });
  await expect(replay).toBeEnabled();
  await replay.click();
  await expect(choices.first()).toBeEnabled({ timeout: 2_000 });

  const wrongChoice = choices.filter({ has: page.getByRole('img', { name: 'hen' }) });
  await wrongChoice.click();
  await expect(choices.first()).toBeEnabled({ timeout: 2_000 });

  const answerByTarget = new Map(
    buildRhymeCandidates(getRhymeFamilies(allPacks)).map((candidate) => [candidate.target, candidate.match]),
  );

  for (let index = 0; index < 6; index += 1) {
    const targetWord = await target.getAttribute('alt');
    const answerWord = answerByTarget.get(targetWord || '');
    expect(answerWord, `No authored rhyme answer for ${targetWord}`).toBeTruthy();
    await choices.filter({ has: page.getByRole('img', { name: answerWord }) }).click();
    if (index < 5) {
      await expect(target).not.toHaveAttribute('alt', targetWord || '', { timeout: 3_000 });
    }
  }

  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('eleni-sound-safari') || '{}');
    return saved.state?.worldProgress?.['1']?.gamesCompleted?.includes('rhyme-match') === true;
  }), { timeout: 3_000 }).toBe(true);

  expect(pageErrors).toEqual([]);
});
