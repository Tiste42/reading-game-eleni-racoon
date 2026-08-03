import type { Page } from '@playwright/test';

export const allPacks = ['alphabet-adventure', 'continuous-bridge', 'cvc-grid', 'longer-words'];

export async function seedFreePlay(page: Page, enabledContentPackIds = allPacks) {
  await page.addInitScript((packs) => {
    const worldProgress = Object.fromEntries(
      [1, 2, 3, 4, 5, 6].map((world) => [world, { gamesCompleted: [], bossCompleted: false, stars: 0 }]),
    );
    localStorage.setItem('eleni-sound-safari', JSON.stringify({
      version: 3,
      state: {
        currentWorld: 0,
        worldProgress,
        coins: 0,
        companions: [],
        costumes: [],
        passportStamps: [],
        masteredPhonemes: [],
        taughtPhonemes: 'abcdefghijklmnopqrstuvwxyz'.split(''),
        masteredWords: [],
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
        contentSeed: 'e2e-seed',
        contentRunCounter: 0,
        recentContentByGame: {},
      },
    }));
  }, enabledContentPackIds);
}

export function captureRuntimeFailures(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
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
