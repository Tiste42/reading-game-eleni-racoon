'use client';

import { Howl } from 'howler';

// --- Static audio playback via Howler ---

let speakGeneration = 0;
let currentSpeechHowl: Howl | null = null;

// All words that have pre-generated static files
const KNOWN_WORDS = new Set([
  'sat', 'sit', 'pat', 'tap', 'tip', 'pit', 'pin', 'pan', 'nap', 'nip',
  'tan', 'tin', 'sip', 'ten', 'net', 'let', 'pen', 'pet', 'set',
  'cat', 'hat', 'mat', 'bat', 'rat', 'fat', 'can', 'man', 'van', 'ran',
  'fan', 'fin', 'bin', 'win', 'dog', 'log', 'fog', 'hog', 'bug', 'rug',
  'mug', 'hug', 'cup', 'hot', 'pot', 'dot', 'bed', 'red', 'hen', 'den',
  'men', 'wet', 'jet', 'pup', 'cut', 'hut',
  'ship', 'shop', 'shin', 'shed', 'chip', 'chop', 'chin', 'chat',
  'thin', 'this', 'that', 'then', 'them', 'with',
  'the', 'a', 'is', 'was', 'to', 'he', 'she', 'we', 'my', 'you',
  'are', 'have', 'do', 'no', 'go', 'said', 'of', 'i',
]);

// All phoneme letters with static files
const KNOWN_PHONEMES = new Set([
  's', 'a', 't', 'p', 'i', 'n', 'e', 'l', 'c', 'k',
  'h', 'r', 'm', 'd', 'g', 'o', 'u', 'f', 'b', 'j',
  'v', 'w', 'x', 'y', 'z', 'sh', 'ch', 'th',
]);

// Feedback clip IDs mapped by type
const FEEDBACK_CLIPS: Record<string, string[]> = {
  correct: ['great-job', 'correct', 'well-done', 'amazing', 'first-try'],
  wrong: ['try-again', 'keep-trying', 'think-again'],
  complete: ['you-did-it', 'level-complete', 'amazing'],
};

/**
 * Play a static .mp3 file from /public/audio/ via Howler.
 * Cancels any previously playing speech sound.
 */
function playStatic(path: string): Promise<void> {
  const thisGen = ++speakGeneration;

  // Stop any current speech
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }

  if (thisGen !== speakGeneration) return Promise.resolve();

  return new Promise((resolve) => {
    const sound = new Howl({
      src: [`/audio/${path}`],
      html5: true,
      volume: 0.9,
      onend: () => {
        if (currentSpeechHowl === sound) currentSpeechHowl = null;
        resolve();
      },
      onloaderror: () => {
        if (currentSpeechHowl === sound) currentSpeechHowl = null;
        resolve();
      },
      onplayerror: () => {
        if (currentSpeechHowl === sound) currentSpeechHowl = null;
        resolve();
      },
    });

    if (thisGen !== speakGeneration) {
      sound.unload();
      resolve();
      return;
    }

    currentSpeechHowl = sound;
    sound.play();
  });
}

// --- Browser speech fallback for dynamic text ---

function browserSpeak(text: string, rate = 0.85): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = 1.2;
    utter.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Samantha') || v.name.includes('Karen') ||
      v.name.includes('Zira') || v.name.includes('Google US English') ||
      (v.lang.startsWith('en') && v.name.includes('Female'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

// --- Public API ---

/**
 * Smart speak: routes to static file if available, otherwise browser speech.
 * Called by useGameSpeechWithOptions for both instructions and option words.
 */
export async function speak(text: string): Promise<void> {
  if (!text) return;

  const lower = text.toLowerCase().trim();

  // Single phoneme letter?
  if (KNOWN_PHONEMES.has(lower)) {
    return playStatic(`phonemes/${lower}.mp3`);
  }

  // Known word with static file?
  if (KNOWN_WORDS.has(lower)) {
    return playStatic(`words/${lower}.mp3`);
  }

  // Longer text — use browser speech as fallback
  const thisGen = ++speakGeneration;
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (thisGen !== speakGeneration) return;
  return browserSpeak(text);
}

/**
 * Play a phoneme sound from static file.
 * Uses pre-generated IPA pronunciation, not letter names.
 */
export async function speakPhoneme(letter: string): Promise<void> {
  const key = letter.toLowerCase();
  if (KNOWN_PHONEMES.has(key)) {
    return playStatic(`phonemes/${key}.mp3`);
  }
  // Fallback for unknown phonemes
  const pronunciation = PHONEME_PRONUNCIATIONS[key] || letter;
  return browserSpeak(pronunciation);
}

/**
 * Play a word pronunciation from static file.
 */
export async function speakWord(word: string): Promise<void> {
  const key = word.toLowerCase().trim();
  if (KNOWN_WORDS.has(key)) {
    return playStatic(`words/${key}.mp3`);
  }
  return browserSpeak(word);
}

/**
 * Play a game instruction from pre-generated narration.
 */
export async function speakInstruction(gameId: string): Promise<void> {
  return playStatic(`narration/${gameId}-intro.mp3`);
}

/**
 * Play random feedback clip from pre-generated narration.
 */
export async function speakFeedback(type: 'correct' | 'wrong' | 'complete'): Promise<void> {
  const clips = FEEDBACK_CLIPS[type];
  const clip = clips[Math.floor(Math.random() * clips.length)];
  return playStatic(`narration/${clip}.mp3`);
}

/**
 * Explain why the answer was wrong — dynamic text, uses browser speech.
 */
export async function speakWrongExplanation(
  chosenWord: string,
  correctWord: string,
  context?: string,
): Promise<void> {
  let text: string;
  if (context === 'rhyme') {
    text = `Hmm, ${chosenWord} doesn't rhyme with that. The answer is ${correctWord}!`;
  } else if (context === 'starts-with') {
    const firstSound = correctWord[0];
    text = `No, ${chosenWord} starts with a different sound. Look for something that starts with ${firstSound}!`;
  } else if (context === 'blend') {
    text = `Not quite! The word is ${correctWord}. Listen again!`;
  } else {
    text = `Hmm, that was ${chosenWord}. We need ${correctWord}! Try again!`;
  }

  const thisGen = ++speakGeneration;
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (thisGen !== speakGeneration) return;
  return browserSpeak(text);
}

/**
 * Reveal the correct answer — dynamic text, uses browser speech.
 */
export async function speakReveal(correctWord: string): Promise<void> {
  const thisGen = ++speakGeneration;
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (thisGen !== speakGeneration) return;
  return browserSpeak(`Let me help! The answer is ${correctWord}!`);
}

/**
 * Stop all currently playing speech (both Howler and browser).
 */
export function stopSpeaking(): void {
  speakGeneration++;
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
}

// --- Pronunciation display text (used by game components for UI, not for audio) ---

export const PHONEME_PRONUNCIATIONS: Record<string, string> = {
  a: 'aah', b: 'buh', c: 'kuh', d: 'duh',
  e: 'eh', f: 'fff', g: 'guh', h: 'huh',
  i: 'ih', j: 'juh', k: 'kuh', l: 'lll',
  m: 'mmm', n: 'nnn', o: 'oh', p: 'puh',
  r: 'rrr', s: 'sss', t: 'tuh', u: 'uh',
  v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz',
  sh: 'shh', ch: 'chuh', th: 'thh',
};
