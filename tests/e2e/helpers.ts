import type { Page } from '@playwright/test';

export const allPacks = ['alphabet-adventure', 'continuous-bridge', 'cvc-grid', 'longer-words'];

export async function seedFreePlay(
  page: Page,
  enabledContentPackIds = allPacks,
  contentSeed = 'e2e-seed',
) {
  await page.addInitScript(({ packs, seed }) => {
    const worldProgress = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((world) => [world, { gamesCompleted: [], bossCompleted: false, stars: 0 }]),
    );
    localStorage.setItem('eleni-sound-safari', JSON.stringify({
      version: 5,
      state: {
        currentWorld: 0,
        worldProgress,
        coins: 0,
        companions: [],
        costumes: [],
        passportStamps: [],
        masteredPhonemes: [],
        taughtPhonemes: [...'abcdefghijklmnopqrstuvwxyz'.split(''), 'sh', 'ch', 'th', 'th-voiced'],
        masteredWords: ['the', 'was', 'said', 'is', 'to', 'he', 'she'],
        ownedItems: [],
        soundStats: {},
        streakCount: 0,
        sessionHistory: [],
        soundEnabled: true,
        musicEnabled: false,
        volume: 0.9,
        musicVolume: 0.08,
        freePlay: true,
        enabledContentPackIds: packs,
        contentSeed: seed,
        contentRunCounter: 0,
        recentContentByGame: {},
      },
    }));
  }, { packs: enabledContentPackIds, seed: contentSeed });
}

export function captureRuntimeFailures(page: Page) {
  const errors: string[] = [];
  const isCurrentOrigin = (url: string) => {
    try {
      return new URL(url).origin === new URL(page.url()).origin;
    } catch {
      return false;
    }
  };

  page.on('pageerror', (error) => {
    // Firefox can report this browser-owned cancellation during an intentional
    // reload even though the new document loads normally.
    if (!error.message.includes('InvalidStateError: Navigated away from page')) {
      errors.push(`pageerror: ${error.message}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && isCurrentOrigin(response.url())) {
      errors.push(`response: ${response.status()} ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || '';
    if (isCurrentOrigin(request.url()) && !failure.includes('ERR_ABORTED')) {
      errors.push(`requestfailed: ${failure} ${request.url()}`);
    }
  });
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message.text().includes('InvalidStateError: Navigated away from page') &&
      // Chromium's generic resource message does not identify the URL and can
      // be caused by an optional cross-origin font. First-party failures are
      // recorded precisely by the response/request listeners above.
      !message.text().startsWith('Failed to load resource:')
    ) {
      errors.push(`console: ${message.text()}`);
    }
  });
  return errors;
}

export async function expectNoOverflow(page: Page) {
  return page.evaluate(() => {
    if (document.documentElement.scrollWidth > window.innerWidth + 1) return false;
    return [...document.querySelectorAll<HTMLElement>('button, [role="button"]')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= window.innerWidth + 1;
      });
  });
}
