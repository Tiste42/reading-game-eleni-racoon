import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { seedFreePlay, captureRuntimeFailures } from './helpers';

test('served phonemes match the pinned library bytes', async ({ request }) => {
  const manifest = JSON.parse(readFileSync('public/audio/phonemes/library-manifest.json', 'utf8'));
  for (const [file, provenance] of Object.entries({ ...manifest.recordings, ...manifest.additionalLibraryRecordings })) {
    const response = await request.get(`/audio/phonemes/${file}?v=8-original-library-phonemes`);
    expect(response.ok(), file).toBeTruthy();
    expect(createHash('sha256').update(await response.body()).digest('hex'), file)
      .toBe((provenance as { sha256: string }).sha256);
  }
});

for (const seed of ['library-a', 'library-s', 'library-l']) {
  test(`the requested sound has a selectable matching letter: ${seed}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Silent Chromium audio path only.');
    await seedFreePlay(page, undefined, seed);
    const errors = captureRuntimeFailures(page);
    const soundRequest = page.waitForRequest((request) => /\/audio\/phonemes\/[a-z]+\.mp3/.test(request.url()));
    await page.goto('/world/2/letter-intro');
    const sound = new URL((await soundRequest).url()).pathname.split('/').pop()!.replace('.mp3', '');
    const answer = page.getByRole('button', { name: sound, exact: true });
    await expect(answer).toHaveCount(1);
    await expect(answer).toBeEnabled();
    await answer.click();
    expect(errors).toEqual([]);
  });
}
