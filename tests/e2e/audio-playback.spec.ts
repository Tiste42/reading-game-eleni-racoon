import { expect, test, type Page } from '@playwright/test';

type AudioProbe = {
  bufferStarts: Array<{ duration: number; maxSample: number; ended: boolean }>;
  mediaPlays: Array<{
    channel: string;
    src: string;
    resolved: boolean;
    ended: boolean;
    paused: boolean;
    currentTime: number;
  }>;
  mediaPauses: Array<{ channel: string; src: string }>;
  errors: string[];
};

async function installAudioProbe(page: Page) {
  await page.addInitScript(() => {
    const target = window as typeof window & { __audioProbe?: AudioProbe };
    target.__audioProbe = { bufferStarts: [], mediaPlays: [], mediaPauses: [], errors: [] };

    const audioContext = window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (audioContext) {
      const prototype = audioContext.prototype;
      const createBufferSource = prototype.createBufferSource;
      prototype.createBufferSource = function createProbedBufferSource() {
        const source = createBufferSource.call(this);
        const start = source.start.bind(source);
        source.start = (...args) => {
          const samples = source.buffer?.getChannelData(0);
          let maxSample = 0;
          if (samples) {
            const stride = Math.max(1, Math.floor(samples.length / 8_000));
            for (let index = 0; index < samples.length; index += stride) {
              maxSample = Math.max(maxSample, Math.abs(samples[index]));
            }
          }
          const entry = {
            duration: source.buffer?.duration ?? 0,
            maxSample,
            ended: false,
          };
          target.__audioProbe?.bufferStarts.push(entry);
          source.addEventListener('ended', () => { entry.ended = true; }, { once: true });
          return start(...args);
        };
        return source;
      };
    }

    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function playProbedMedia(...args) {
      const media = this as HTMLMediaElement;
      const entry = {
        channel: media.dataset.audioChannel || 'unknown',
        src: media.currentSrc || media.src,
        resolved: false,
        ended: false,
        paused: true,
        currentTime: 0,
      };
      target.__audioProbe?.mediaPlays.push(entry);
      media.addEventListener('ended', () => {
        entry.ended = true;
        entry.paused = media.paused;
        entry.currentTime = media.currentTime;
      }, { once: true });
      const result = play.apply(this, args);
      void result?.then(() => {
        entry.resolved = true;
        entry.paused = media.paused;
        setTimeout(() => {
          entry.paused = media.paused;
          entry.currentTime = media.currentTime;
        }, 350);
      }).catch((error) => {
          target.__audioProbe?.errors.push(String(error));
        });
      return result;
    };

    const pause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function pauseProbedMedia(...args) {
      target.__audioProbe?.mediaPauses.push({
        channel: (this as HTMLMediaElement).dataset.audioChannel || 'unknown',
        src: (this as HTMLMediaElement).currentSrc || (this as HTMLMediaElement).src,
      });
      return pause.apply(this, args);
    };
  });
}

async function resetPlaybackProbe(page: Page) {
  await page.evaluate(() => {
    const value = (window as typeof window & { __audioProbe: AudioProbe }).__audioProbe;
    value.bufferStarts = [];
    value.mediaPlays = [];
    value.mediaPauses = [];
  });
}

function captureAudioWarnings(page: Page): string[] {
  const warnings: string[] = [];
  const patterns = [
    'Failed to load audio',
    'Failed to start audio',
    'Failed to play sound effect',
    'Background music failed',
    'Background music not found',
    'Background music could not start',
    'Background music could not resume',
    '[speech] native playback failed',
    '[speech] missing audio file',
    '[speech] waiting for audio unlock',
  ];
  page.on('console', (message) => {
    if (message.type() === 'warning' && patterns.some((pattern) => message.text().includes(pattern))) {
      warnings.push(message.text());
    }
  });
  return warnings;
}

async function waitForAutomaticSpeechToFinish(page: Page, projectName: string) {
  if (projectName === 'webkit-tablet') {
    await expect.poll(async () => {
      const speech = (await probe(page)).mediaPlays.filter((entry) => entry.channel === 'speech');
      return speech.length >= 2 && speech[speech.length - 1].ended;
    }, { timeout: 15_000 }).toBe(true);
  } else {
    await expect.poll(async () => {
      const starts = (await probe(page)).bufferStarts.filter((entry) => entry.maxSample > 0.001);
      return starts.length >= 2 && starts.every((entry) => entry.ended);
    }, { timeout: 15_000 }).toBe(true);
  }
}

async function probe(page: Page): Promise<AudioProbe> {
  return page.evaluate(() => (
    window as typeof window & { __audioProbe: AudioProbe }
  ).__audioProbe);
}

function unexpectedAudioErrors(value: AudioProbe): string[] {
  // Replacing an HTML media src deliberately aborts the prior load/play on
  // WebKit. That is the recovery mechanism, not a playback failure.
  return value.errors.filter((error) => !error.includes('AbortError'));
}

test.beforeEach(async ({ page }) => {
  await installAudioProbe(page);
});

test('the real Play gesture starts music and the music toggle stops and restarts it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'firefox', 'Critical Apple and Chromium audio backends are covered');
  const warnings = captureAudioWarnings(page);

  await page.goto('/');
  await page.getByRole('button', { name: /Play!/ }).click();

  if (testInfo.project.name === 'webkit-tablet') {
    await expect.poll(async () => (await probe(page)).mediaPlays.some((entry) =>
      entry.channel === 'music' && entry.resolved && !entry.paused && entry.currentTime > 0.05 &&
        entry.src.includes('/audio/music/apple/menu.mp3'),
    )).toBe(true);
  } else {
    await expect.poll(async () => (await probe(page)).bufferStarts.some((entry) =>
      entry.duration > 1 && entry.maxSample > 0.001,
    )).toBe(true);
  }

  await page.getByRole('button', { name: 'Settings' }).click();
  const toggle = page.getByRole('button', { name: 'Toggle Background Music' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  const beforePause = (await probe(page)).mediaPauses.filter((entry) => entry.channel === 'music').length;
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  if (testInfo.project.name === 'webkit-tablet') {
    await expect.poll(async () => (await probe(page)).mediaPauses.filter((entry) =>
      entry.channel === 'music',
    ).length).toBeGreaterThan(beforePause);
  } else {
    await page.waitForTimeout(700);
  }

  const beforeRestart = testInfo.project.name === 'webkit-tablet'
    ? (await probe(page)).mediaPlays.filter((entry) => entry.channel === 'music').length
    : (await probe(page)).bufferStarts.filter((entry) => entry.duration > 1 && entry.maxSample > 0.001).length;
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  if (testInfo.project.name === 'webkit-tablet') {
    await expect.poll(async () => (await probe(page)).mediaPlays.filter((entry) =>
      entry.channel === 'music' && entry.resolved && !entry.paused && entry.currentTime > 0.05,
    ).length).toBeGreaterThan(beforeRestart);
    await expect(page.getByText(/Use the iPhone or iPad volume buttons/)).toBeVisible();
    await expect(page.getByText('Voice Volume')).toHaveCount(0);
  } else {
    await expect.poll(async () => (await probe(page)).bufferStarts.filter((entry) =>
      entry.duration > 1 && entry.maxSample > 0.001,
    ).length).toBeGreaterThan(beforeRestart);
  }

  expect(unexpectedAudioErrors(await probe(page))).toEqual([]);
  expect(warnings).toEqual([]);
});

test('letter replay is audible, the sound switch suppresses it, and turning it on restores it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'firefox', 'Critical Apple and Chromium audio backends are covered');
  const warnings = captureAudioWarnings(page);

  await page.goto('/');
  await page.getByRole('button', { name: /Play!/ }).click();
  await page.goto('/parent');
  await page.getByRole('button', { name: 'Toggle Background Music' }).click();
  await page.getByRole('button', { name: 'Toggle Voice & Sound Effects' }).click();
  await expect(page.getByRole('button', { name: 'Toggle Voice & Sound Effects' })).toHaveAttribute('aria-pressed', 'false');

  await page.goto('/world/2/letter-intro');
  const hearSound = page.getByRole('button', { name: 'Hear the sound' });
  await expect(hearSound).toBeVisible();
  const mutedBefore = await probe(page);
  const mutedStarts = mutedBefore.bufferStarts.filter((entry) => entry.maxSample > 0.001).length;
  const mutedMedia = mutedBefore.mediaPlays.filter((entry) => entry.channel === 'speech').length;
  await hearSound.click();
  await page.waitForTimeout(700);
  const mutedAfter = await probe(page);
  expect(mutedAfter.bufferStarts.filter((entry) => entry.maxSample > 0.001)).toHaveLength(mutedStarts);
  expect(mutedAfter.mediaPlays.filter((entry) => entry.channel === 'speech')).toHaveLength(mutedMedia);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Toggle Voice & Sound Effects' }).click();
  await expect(page.getByRole('button', { name: 'Toggle Voice & Sound Effects' })).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  const restoredButton = page.getByRole('button', { name: 'Hear the sound' });
  await expect(restoredButton).toBeVisible();
  await waitForAutomaticSpeechToFinish(page, testInfo.project.name);
  await resetPlaybackProbe(page);

  if (testInfo.project.name === 'webkit-tablet') {
    await restoredButton.click();
    await expect.poll(async () => (await probe(page)).mediaPlays.filter((entry) =>
      entry.channel === 'speech' && entry.resolved && entry.currentTime > 0.05 && entry.src.includes('/audio/phonemes/'),
    ).length).toBe(1);
  } else {
    await restoredButton.click();
    await expect.poll(async () => (await probe(page)).bufferStarts.filter((entry) =>
      entry.duration > 0.05 && entry.maxSample > 0.001,
    ).length).toBe(1);
  }

  expect(unexpectedAudioErrors(await probe(page))).toEqual([]);
  expect(warnings).toEqual([]);
});

test('the voice and sound switch suppresses and restores tap effects', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'firefox', 'Critical Apple and Chromium audio backends are covered');
  const warnings = captureAudioWarnings(page);

  await page.goto('/');
  await page.getByRole('button', { name: /Play!/ }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Toggle Background Music' }).click();
  await page.getByRole('button', { name: 'Toggle Voice & Sound Effects' }).click();
  await page.goto('/world/1/syllable-clap');

  const clap = page.getByRole('button', { name: 'Clap' });
  await expect(clap).toBeVisible();
  await resetPlaybackProbe(page);
  await clap.click();
  await page.waitForTimeout(500);
  expect((await probe(page)).bufferStarts).toHaveLength(0);
  expect((await probe(page)).mediaPlays.filter((entry) => entry.channel === 'sfx')).toHaveLength(0);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Toggle Voice & Sound Effects' }).click();
  await page.goBack();
  await waitForAutomaticSpeechToFinish(page, testInfo.project.name);
  await resetPlaybackProbe(page);

  await page.getByRole('button', { name: 'Clap' }).click();
  if (testInfo.project.name === 'webkit-tablet') {
    await expect.poll(async () => (await probe(page)).mediaPlays.some((entry) =>
      entry.channel === 'sfx' && entry.resolved && entry.currentTime > 0.02 && entry.src.includes('/audio/sfx/tap.mp3'),
    )).toBe(true);
  } else {
    await expect.poll(async () => (await probe(page)).bufferStarts.some((entry) =>
      entry.duration > 0.05 && entry.maxSample > 0.001,
    )).toBe(true);
  }

  expect(unexpectedAudioErrors(await probe(page))).toEqual([]);
  expect(warnings).toEqual([]);
});

test('Apple media playback is recreated after a simulated PWA foreground return', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-tablet', 'Apple PWA recovery path');
  const warnings = captureAudioWarnings(page);

  await page.goto('/');
  await page.getByRole('button', { name: /Play!/ }).click();
  await expect.poll(async () => (await probe(page)).mediaPlays.filter((entry) =>
    entry.channel === 'music' && entry.resolved,
  ).length).toBeGreaterThan(0);
  const before = (await probe(page)).mediaPlays.filter((entry) => entry.channel === 'music').length;

  await page.evaluate(() => {
    const target = window as typeof window & { __testVisibilityState?: DocumentVisibilityState };
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => target.__testVisibilityState || 'visible',
    });
    target.__testVisibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    target.__testVisibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  // Use an actual visible control so recovery is exercised by the same trusted
  // pointer gesture a child/parent will make after reopening the PWA.
  await page.getByRole('button', { name: 'Settings' }).click();

  await expect.poll(async () => (await probe(page)).mediaPlays.filter((entry) =>
    entry.channel === 'music',
  ).length).toBeGreaterThan(before);
  await expect.poll(async () => (await probe(page)).mediaPlays.slice(before).some((entry) =>
    entry.channel === 'music' && entry.resolved && !entry.paused && entry.currentTime > 0.05,
  )).toBe(true);
  expect(unexpectedAudioErrors(await probe(page))).toEqual([]);
  expect(warnings).toEqual([]);
});
