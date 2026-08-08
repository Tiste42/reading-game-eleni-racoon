'use client';

import { Howl, Howler } from 'howler';
import { useGameStore } from './store';
import { shouldUseNativeMediaAudio } from './audioPlatform';

// Bump this whenever pre-generated audio files are regenerated so browsers
// fetch the new versions instead of stale cached ones.
export const AUDIO_VERSION = '6-apple-audio-recovery';

const audioCache = new Map<string, Howl>();
let audioUnlocked = false;

let unlockInFlight: Promise<boolean> | null = null;
let unlockListenersInstalled = false;

type NativeAudioChannel = 'speech' | 'sfx' | 'music';

interface NativeChannelState {
  element: HTMLAudioElement;
  finishPending?: () => void;
}

const nativeChannels = new Map<NativeAudioChannel, NativeChannelState>();
let nativeMediaEpoch = 0;

function soundIsEnabled(): boolean {
  try {
    return useGameStore.getState().soundEnabled;
  } catch {
    return true;
  }
}

function versionedAudioPath(path: string): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${AUDIO_VERSION}&session=${nativeMediaEpoch}`;
}

function nativeChannel(channel: NativeAudioChannel): NativeChannelState {
  const existing = nativeChannels.get(channel);
  if (existing) return existing;

  const element = new Audio();
  element.preload = 'auto';
  element.setAttribute('playsinline', '');
  element.setAttribute('webkit-playsinline', '');
  element.dataset.audioChannel = channel;
  const state = { element };
  nativeChannels.set(channel, state);
  return state;
}

export function stopNativeAudio(channel: NativeAudioChannel): void {
  const state = nativeChannels.get(channel);
  if (!state) return;

  state.finishPending?.();
  state.finishPending = undefined;
  state.element.pause();
}

/**
 * Apple mobile/PWA playback intentionally bypasses WebAudio. iOS/iPadOS 26
 * can leave a "running" AudioContext permanently silent after a Home Screen
 * app resumes. Reassigning src immediately before HTML media playback avoids
 * that dead context and routes through the audible media session.
 */
export function playNativeAudio(
  path: string,
  channel: NativeAudioChannel,
  options: { loop?: boolean; waitForEnd?: boolean } = {},
): Promise<void> {
  if (typeof Audio === 'undefined') return Promise.resolve();
  if (channel !== 'music' && !soundIsEnabled()) return Promise.resolve();

  const state = nativeChannel(channel);
  stopNativeAudio(channel);

  const element = state.element;
  element.loop = options.loop ?? false;
  element.removeAttribute('src');
  element.load();
  element.src = versionedAudioPath(path);
  element.load();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      element.removeEventListener('ended', onEnded);
      element.removeEventListener('error', onError);
      if (state.finishPending === finish) state.finishPending = undefined;
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onEnded = () => finish();
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Native audio failed: ${path}`));
    };

    state.finishPending = finish;
    element.addEventListener('ended', onEnded);
    element.addEventListener('error', onError);

    element.play().then(() => {
      audioUnlocked = true;
      if (!options.waitForEnd) finish();
    }).catch((error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });
  });
}

/** Wake the active audio backend from a trusted gesture when required. */
async function activateAudio(): Promise<boolean> {
  if (unlockInFlight) return unlockInFlight;

  unlockInFlight = (async () => {
    try {
      const navAny = navigator as unknown as { audioSession?: { type: string } };
      if (navAny.audioSession) navAny.audioSession.type = 'playback';
    } catch {
      // The native media fallback does not require this optional API.
    }

    if (shouldUseNativeMediaAudio()) {
      audioUnlocked = true;
      tryPlayBgMusic();
      return true;
    }

    if (Howler.ctx && Howler.ctx.state !== 'running') {
      try {
        await Howler.ctx.resume();
      } catch {
        audioUnlocked = false;
        return false;
      }
    }

    audioUnlocked = !Howler.ctx || Howler.ctx.state === 'running';
    if (audioUnlocked) tryPlayBgMusic();
    return audioUnlocked;
  })().finally(() => {
    unlockInFlight = null;
  });

  return unlockInFlight;
}

function handleAudioGesture(): void {
  void activateAudio();
}

function installAudioRecovery(): void {
  if (typeof document === 'undefined' || unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  // Keep these listeners installed. Apple can silently lose its media session
  // after backgrounding, so any later real gesture must be able to heal it.
  document.addEventListener('touchend', handleAudioGesture, { passive: true, capture: true });
  document.addEventListener('pointerup', handleAudioGesture, { passive: true, capture: true });
  document.addEventListener('click', handleAudioGesture, { capture: true });

  const recover = () => {
    if (document.visibilityState === 'hidden') return;
    audioUnlocked = false;
    nativeMediaEpoch += 1;
    if (shouldUseNativeMediaAudio()) {
      stopNativeAudio('speech');
      stopNativeAudio('sfx');
      stopNativeAudio('music');
      nativeMusicTrack = null;
    }
  };
  document.addEventListener('visibilitychange', recover);
  window.addEventListener('pageshow', recover);
}

installAudioRecovery();

export function unlockAudio(): void {
  installAudioRecovery();
  // Playback starts from the permanent trusted-gesture listeners above.
}

export function getAudio(src: string): Howl {
  const path = `/audio/${src}?v=${AUDIO_VERSION}`;
  const cached = audioCache.get(path);
  if (cached) return cached;

  // WebAudio (html5:false): iOS ignores volume changes on HTML5 audio
  // elements and caps how many can exist — WebAudio has neither problem.
  const sound = new Howl({
    src: [path],
    format: ['mp3'],
    html5: false,
    preload: true,
    volume: 0.8,
    onloaderror: (_id, err) => {
      console.warn(`Failed to load audio: ${path}`, err);
    },
    onplayerror: (id, err) => {
      console.warn(`Failed to start audio: ${path}`, err);
      sound.once('unlock', () => sound.play(id));
    },
  });

  audioCache.set(path, sound);
  return sound;
}

export function playSound(src: string): Promise<void> {
  if (!soundIsEnabled()) return Promise.resolve();
  if (shouldUseNativeMediaAudio()) {
    return playNativeAudio(`/audio/${src}`, 'speech', { waitForEnd: true });
  }

  return new Promise((resolve) => {
    const sound = getAudio(src);
    sound.once('end', () => resolve());
    sound.once('loaderror', () => resolve());
    sound.play();
  });
}

export function playSoundEffect(type: 'correct' | 'wrong' | 'celebrate' | 'coin' | 'tap'): void {
  if (!soundIsEnabled()) return;

  const sfxMap: Record<string, string> = {
    correct: 'sfx/correct.mp3',
    wrong: 'sfx/wrong.mp3',
    celebrate: 'sfx/celebrate.mp3',
    coin: 'sfx/coin.mp3',
    tap: 'sfx/tap.mp3',
  };
  const src = sfxMap[type];
  if (src) {
    if (shouldUseNativeMediaAudio()) {
      void playNativeAudio(`/audio/${src}`, 'sfx', { waitForEnd: false }).catch((error) => {
        console.warn(`Failed to play sound effect: ${src}`, error);
      });
    } else {
      getAudio(src).play();
    }
  }
}

export function preloadWorldAudio(worldId: number): void {
  // Apple mobile uses fixed HTML media channels and assigns each source only
  // immediately before playback. Pre-creating many elements exhausts iOS.
  if (shouldUseNativeMediaAudio()) return;
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
      'phonemes/e.mp3', 'phonemes/l.mp3', 'phonemes/q.mp3',
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
  nativeChannels.forEach((_state, channel) => stopNativeAudio(channel));
}

export function unloadAll(): void {
  audioCache.forEach((sound) => sound.unload());
  audioCache.clear();
  nativeChannels.forEach((state, channel) => {
    stopNativeAudio(channel);
    state.element.removeAttribute('src');
    state.element.load();
  });
  nativeChannels.clear();
}

let bgMusic: Howl | null = null;
let currentTrack: string | null = null;
let desiredTrack: string | null = null;
let nativeMusicTrack: string | null = null;
let currentMusicVolume = 0.12;

function tryPlayBgMusic(): void {
  const track = desiredTrack;
  if (!track || !audioUnlocked) return;

  if (shouldUseNativeMediaAudio()) {
    const existing = nativeChannels.get('music')?.element;
    if (nativeMusicTrack === track && existing) {
      if (!existing.paused) return;

      // Speech ducking pauses the existing native music element. Resume that
      // element in place so every phoneme does not restart the song at 0:00.
      void existing.play().then(() => {
        audioUnlocked = true;
      }).catch((error) => {
        console.warn(`Background music could not resume: /audio/music/apple/${track}.mp3`, error);
      });
      return;
    }

    nativeMusicTrack = track;
    void playNativeAudio(`/audio/music/apple/${track}.mp3`, 'music', {
      loop: true,
      waitForEnd: false,
    }).catch((error) => {
      if (nativeMusicTrack === track) nativeMusicTrack = null;
      console.warn(`Background music failed: /audio/music/apple/${track}.mp3`, error);
    });
    return;
  }

  if (bgMusic && currentTrack === track) {
    if (!bgMusic.playing()) bgMusic.play();
    return;
  }

  if (bgMusic) {
    const old = bgMusic;
    bgMusic = null;
    old.fade(old.volume(), 0, 500);
    setTimeout(() => old.unload(), 500);
  }

  const nextMusic = new Howl({
    src: [`/audio/music/${track}.mp3?v=${AUDIO_VERSION}`],
    format: ['mp3'],
    html5: false,
    loop: true,
    volume: musicTarget(),
    onloaderror: (_id, error) => {
      console.warn(`Background music not found: /audio/music/${track}.mp3`, error);
      if (bgMusic === nextMusic) {
        bgMusic = null;
        currentTrack = null;
      }
    },
    onplayerror: (id, error) => {
      console.warn(`Background music could not start: /audio/music/${track}.mp3`, error);
      nextMusic.once('unlock', () => nextMusic.play(id));
    },
  });
  bgMusic = nextMusic;
  currentTrack = track;
  nextMusic.play();
}

export function startBackgroundMusic(track = 'menu'): void {
  desiredTrack = track;
  tryPlayBgMusic();
}

export function stopBackgroundMusic(): void {
  desiredTrack = null;
  nativeMusicTrack = null;
  stopNativeAudio('music');

  if (bgMusic) {
    const old = bgMusic;
    bgMusic = null;
    currentTrack = null;
    old.fade(old.volume(), 0, 500);
    setTimeout(() => old.unload(), 500);
  }
}

// The music tracks are mastered ~3dB hotter than the voice clips (measured),
// so the music channel gets a constant trim — "30%" on the slider should FEEL
// like 30% next to Leni's voice.
const MUSIC_TRIM = 0.55;

// Music should be MUCH quieter than speech — drop it to ~5% while Leni talks.
const DUCK_FACTOR = 0.05;
let duckCount = 0;

/** The single source of truth for what the music should play at right now. */
function musicTarget(): number {
  return currentMusicVolume * MUSIC_TRIM * (duckCount > 0 ? DUCK_FACTOR : 1);
}

export function setMusicVolume(volume: number): void {
  currentMusicVolume = volume;
  // Apple HTML media volume is controlled by the device. Those devices use
  // separately attenuated music masters so narration remains dominant.
  if (shouldUseNativeMediaAudio()) return;
  if (bgMusic) {
    // Cancel any in-flight duck/fade so the slider change applies immediately.
    bgMusic.fade(bgMusic.volume(), musicTarget(), 80);
  }
}

// --- Music ducking: lower music while Leni speaks so the child hears her clearly ---

let unduckTimer: ReturnType<typeof setTimeout> | null = null;

export function duckMusic(): void {
  duckCount++;
  if (unduckTimer) {
    clearTimeout(unduckTimer);
    unduckTimer = null;
  }
  if (shouldUseNativeMediaAudio() && duckCount === 1) {
    stopNativeAudio('music');
  } else if (bgMusic && duckCount === 1) {
    bgMusic.fade(bgMusic.volume(), musicTarget(), 120);
  }
}

export function unduckMusic(): void {
  duckCount = Math.max(0, duckCount - 1);
  if (duckCount !== 0) return;
  // Lazy restore: stay ducked through the short gaps between clips in a
  // spoken sequence so the music doesn't pump up and down between words.
  if (unduckTimer) clearTimeout(unduckTimer);
  unduckTimer = setTimeout(() => {
    unduckTimer = null;
    if (shouldUseNativeMediaAudio() && duckCount === 0) {
      tryPlayBgMusic();
    } else if (bgMusic && duckCount === 0) {
      bgMusic.fade(bgMusic.volume(), musicTarget(), 400);
    }
  }, 450);
}
