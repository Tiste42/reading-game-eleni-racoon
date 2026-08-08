import assert from 'node:assert/strict';
import test from 'node:test';
import { isAppleMobilePlatform } from '../../src/lib/audioPlatform';

test('routes iPhone and iPad browsers to native media audio', () => {
  assert.equal(isAppleMobilePlatform({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',
    platform: 'iPhone',
    maxTouchPoints: 5,
  }), true);

  assert.equal(isAppleMobilePlatform({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  }), true);
});

test('keeps desktop and Android browsers on WebAudio', () => {
  assert.equal(isAppleMobilePlatform({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    platform: 'Win32',
    maxTouchPoints: 0,
  }), false);

  assert.equal(isAppleMobilePlatform({
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
  }), false);
});
