import { expect, test } from '@playwright/test';

test('PWA manifest and installed-app icons resolve from their declared paths', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Static asset contract only needs one browser project.');

  const manifestResponse = await request.get('/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
    expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' }),
  ]));

  for (const iconPath of ['/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png']) {
    const response = await request.get(iconPath);
    expect(response.ok(), iconPath).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    expect((await response.body()).byteLength, iconPath).toBeGreaterThan(1_000);
  }
});
