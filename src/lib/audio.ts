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
  // Always preload common feedback clips and SFX
  const common = [
    'narration/great-job.mp3', 'narration/correct.mp3', 'narration/try-again.mp3',
    'narration/you-did-it.mp3', 'narration/keep-trying.mp3', 'narration/amazing.mp3',
    'narration/well-done.mp3', 'narration/think-again.mp3', 'narration/first-try.mp3',
    'narration/level-complete.mp3',
    'sfx/correct.mp3', 'sfx/wrong.mp3', 'sfx/celebrate.mp3', 'sfx/coin.mp3', 'sfx/tap.mp3',
  ];

  const worldAudioPaths: Record<number, string[]> = {
    1: [
      'narration/welcome.mp3',
      'narration/world-1-intro.mp3',
      'narration/rhyme-match-intro.mp3', 'narration/syllable-clap-intro.mp3',
      'narration/first-sound-intro.mp3', 'narration/odd-one-out-intro.mp3',
      'narration/sound-hunt-intro.mp3', 'narration/boss-1-intro.mp3',
    ],
    2: [
      'narration/world-2-intro.mp3',
      'narration/letter-intro-intro.mp3', 'narration/sound-safari-intro.mp3',
      'narration/letter-match-intro.mp3', 'narration/sound-sort-intro.mp3',
      'narration/letter-trace-intro.mp3', 'narration/boss-2-intro.mp3',
      'phonemes/s.mp3', 'phonemes/a.mp3', 'phonemes/t.mp3',
      'phonemes/p.mp3', 'phonemes/i.mp3', 'phonemes/n.mp3',
      'phonemes/e.mp3', 'phonemes/l.mp3',
    ],
    3: [
      'narration/world-3-intro.mp3',
      'narration/surf-slide-intro.mp3', 'narration/market-builder-intro.mp3',
      'narration/sailboat-race-intro.mp3', 'narration/sound-telescope-intro.mp3',
      'narration/plaza-puzzle-intro.mp3', 'narration/boss-3-intro.mp3',
      'blends/sat.mp3', 'blends/pin.mp3', 'blends/ten.mp3',
      'blends/net.mp3', 'blends/pet.mp3',
    ],
    4: [
      'narration/world-4-intro.mp3',
      'narration/potion-lab-intro.mp3', 'narration/word-towers-intro.mp3',
      'narration/knights-doors-intro.mp3', 'narration/dragon-feed-intro.mp3',
      'narration/garden-grow-intro.mp3', 'narration/boss-4-intro.mp3',
    ],
    5: [
      'narration/world-5-intro.mp3',
      'narration/heart-word-map-intro.mp3', 'narration/digraph-discovery-intro.mp3',
      'narration/ruin-decoder-intro.mp3', 'narration/treasure-memory-intro.mp3',
      'narration/souk-sentences-intro.mp3', 'narration/boss-5-intro.mp3',
    ],
    6: [
      'narration/world-6-intro.mp3',
      'narration/story-stroll-intro.mp3', 'narration/comic-creator-intro.mp3',
      'narration/manatee-rescue-intro.mp3', 'narration/beach-detective-intro.mp3',
      'narration/postcard-writer-intro.mp3', 'narration/boss-6-intro.mp3',
    ],
  };

  const paths = [...common, ...(worldAudioPaths[worldId] || [])];
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
let currentTrack: string | null = null;
let currentMusicVolume = 0.3;

export function startBackgroundMusic(track = 'menu'): void {
  // If same track is already playing, do nothing
  if (bgMusic && currentTrack === track) return;

  // Stop current track with crossfade
  if (bgMusic) {
    const old = bgMusic;
    old.fade(old.volume(), 0, 500);
    setTimeout(() => { old.unload(); }, 500);
    bgMusic = null;
  }

  currentTrack = track;
  bgMusic = new Howl({
    src: [`/audio/music/${track}.mp3`],
    html5: true,
    loop: true,
    volume: currentMusicVolume,
    onloaderror: () => {
      console.warn(`Background music not found: /audio/music/${track}.mp3`);
      bgMusic = null;
      currentTrack = null;
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
      currentTrack = null;
    }, 500);
  }
}

export function setMusicVolume(volume: number): void {
  currentMusicVolume = volume;
  if (bgMusic) bgMusic.volume(volume);
}
