'use client';

import { Howl, Howler } from 'howler';

const audioCache = new Map<string, Howl>();
let audioUnlocked = false;

export function unlockAudio() {
  if (audioUnlocked) return;

  const unlock = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume();
    }
    audioUnlocked = true;
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('click', unlock);
  };

  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('click', unlock, { once: true });
}

export function getAudio(src: string): Howl {
  const path = `/audio/${src}`;
  const cached = audioCache.get(path);
  if (cached) return cached;

  const sound = new Howl({
    src: [path],
    html5: true,
    preload: true,
    volume: 0.8,
    onloaderror: (_id, err) => {
      console.warn(`Failed to load audio: ${path}`, err);
    },
  });

  audioCache.set(path, sound);
  return sound;
}

export function playSound(src: string): Promise<void> {
  return new Promise((resolve) => {
    const sound = getAudio(src);
    sound.once('end', () => resolve());
    sound.once('loaderror', () => resolve());
    sound.play();
  });
}

export function playSoundEffect(type: 'correct' | 'wrong' | 'celebrate' | 'coin' | 'tap'): void {
  const sfxMap: Record<string, string> = {
    correct: 'sfx/correct.mp3',
    wrong: 'sfx/wrong.mp3',
    celebrate: 'sfx/celebrate.mp3',
    coin: 'sfx/coin.mp3',
    tap: 'sfx/tap.mp3',
  };
  const src = sfxMap[type];
  if (src) {
    getAudio(src).play();
  }
}

export function preloadWorldAudio(worldId: number): void {
  const worldAudioPaths: Record<number, string[]> = {
    1: [
      'narration/welcome.mp3',
      'narration/world1-intro.mp3',
    ],
    2: [
      'phonemes/s.mp3', 'phonemes/a.mp3', 'phonemes/t.mp3',
      'phonemes/p.mp3', 'phonemes/i.mp3', 'phonemes/n.mp3',
      'phonemes/e.mp3', 'phonemes/l.mp3',
    ],
    3: [
      'blends/sat.mp3', 'blends/pin.mp3', 'blends/ten.mp3',
      'blends/net.mp3', 'blends/pet.mp3',
    ],
  };

  const paths = worldAudioPaths[worldId] || [];
  paths.forEach((p) => getAudio(p));
}

export function setGlobalVolume(volume: number): void {
  Howler.volume(volume);
}

export function stopAll(): void {
  Howler.stop();
}

export function unloadAll(): void {
  audioCache.forEach((sound) => sound.unload());
  audioCache.clear();
}

let bgMusic: Howl | null = null;

export function startBackgroundMusic(): void {
  if (bgMusic) return;
  bgMusic = new Howl({
    src: ['/audio/music/background.mp3'],
    html5: true,
    loop: true,
    volume: 0.15,
    onloaderror: () => {
      console.warn('Background music not found at /audio/music/background.mp3');
      bgMusic = null;
    },
  });
  bgMusic.play();
}

export function stopBackgroundMusic(): void {
  if (bgMusic) {
    bgMusic.fade(bgMusic.volume(), 0, 500);
    setTimeout(() => {
      bgMusic?.unload();
      bgMusic = null;
    }, 500);
  }
}

export function setMusicVolume(volume: number): void {
  if (bgMusic) bgMusic.volume(volume * 0.2);
}
