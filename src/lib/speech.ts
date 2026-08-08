'use client';

import { Howl, Howler } from 'howler';
import {
  duckMusic,
  unduckMusic,
  AUDIO_VERSION,
  playNativeAudio,
  stopNativeAudio,
} from './audio';
import { shouldUseNativeMediaAudio } from './audioPlatform';
import { useGameStore } from './store';
import { CONTENT_AUDIO_WORDS, CONTENT_NARRATION_SLUGS, CONTENT_SYLLABLE_CLIPS } from '@/content/registry';

// The parent "Voice Volume" slider — applied to every spoken clip.
function voiceVolume(): number {
  try {
    return useGameStore.getState().volume;
  } catch {
    return 0.9;
  }
}

function voiceIsEnabled(): boolean {
  try {
    return useGameStore.getState().soundEnabled;
  } catch {
    return true;
  }
}

// --- Static audio playback via Howler ---

let speakGeneration = 0;
let currentSpeechHowl: Howl | null = null;

// Normalize text to a slug for narration file lookup
function textToSlug(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-');
}

// All words that have pre-generated static files
const KNOWN_WORDS = new Set([
  ...CONTENT_AUDIO_WORDS,
  // CVC words (Worlds 2-4)
  'sat', 'sit', 'pat', 'tap', 'tip', 'pit', 'pin', 'pan', 'nap', 'nip',
  'tan', 'tin', 'sip', 'ten', 'net', 'let', 'pen', 'pet', 'set',
  'cat', 'hat', 'mat', 'bat', 'rat', 'fat', 'can', 'man', 'van', 'ran',
  'fan', 'fin', 'bin', 'win', 'dog', 'log', 'fog', 'hog', 'bug', 'rug',
  'mug', 'hug', 'cup', 'hot', 'pot', 'dot', 'bed', 'red', 'hen', 'den',
  'men', 'wet', 'jet', 'pup', 'cut', 'hut',
  // Digraph words (World 5)
  'ship', 'shop', 'shin', 'shed', 'chip', 'chop', 'chin', 'chat',
  'thin', 'this', 'that', 'then', 'them', 'with',
  // Sight words (World 5)
  'the', 'a', 'is', 'was', 'to', 'he', 'she', 'we', 'my', 'you',
  'are', 'have', 'do', 'no', 'go', 'said', 'of', 'i',
  // Game option words (animals, objects, descriptors)
  'snake', 'ant', 'tiger', 'penguin', 'iguana', 'nut', 'egg', 'lemon',
  'apple', 'tent', 'insect', 'igloo', 'lion', 'sun', 'moon', 'banana',
  'soap', 'ball', 'bird', 'fish', 'bus', 'sock', 'mouse', 'milk',
  'tree', 'top', 'leg', 'rain', 'star', 'map', 'turtle', 'pig',
  'nest', 'elephant', 'din', 'cog', 'jog', 'dug', 'jug', 'cap',
  'car', 'fox', 'lamp', 'elf', 'ink', 'fed', 'lip', 'cot', 'run',
  'cold', 'big', 'small', 'blue', 'green', 'yellow', 'happy', 'sad',
  'fast', 'mad', 'yes', 'pug',
  'monkey', 'rabbit', 'tomato', 'butterfly', 'dinosaur', 'watermelon',
]);

// All phoneme letters with static files
const KNOWN_PHONEMES = new Set([
  's', 'a', 't', 'p', 'i', 'n', 'e', 'l', 'c', 'k',
  'h', 'r', 'm', 'd', 'g', 'o', 'u', 'f', 'b', 'j',
  'q', 'v', 'w', 'x', 'y', 'z', 'sh', 'ch', 'th', 'th-voiced',
]);

// Feedback clip IDs mapped by type
const FEEDBACK_CLIPS: Record<string, string[]> = {
  correct: [
    'great-job', 'correct', 'well-done', 'amazing', 'awesome-job', 'great-work',
    'youre-the-best', 'wonderful', 'fantastic', 'way-to-go', 'brilliant',
    'super-reading', 'you-got-it', 'high-five', 'nice-work', 'yes-perfect',
  ],
  wrong: ['try-again', 'keep-trying', 'think-again', 'almost', 'so-close', 'good-try'],
  complete: ['you-did-it', 'level-complete', 'amazing', 'youre-the-best', 'super-reading'],
};

// All pre-generated instruction & phrase narration slugs.
// If textToSlug(text) is in this set, play from narration/inst-{slug}.mp3
const KNOWN_NARRATION_SLUGS = new Set([
  ...CONTENT_NARRATION_SLUGS,
  ...CONTENT_SYLLABLE_CLIPS.map((entry) => `${entry.word.replace(/[^a-z0-9]/g, '')}-has-${entry.syllables}-${entry.syllables === 1 ? 'beat' : 'beats'}`),
  // --- World 1: Sound Fiesta ---
  // SoundSafari instructions
  'find-the-picture-that-starts-with-s',
  'find-the-picture-that-starts-with-a',
  'find-the-picture-that-starts-with-t',
  'find-the-picture-that-starts-with-p',
  'find-the-picture-that-starts-with-i',
  'find-the-picture-that-starts-with-n',
  'find-the-picture-that-starts-with-e',
  'find-the-picture-that-starts-with-l',
  // OddSoundOut instructions
  'two-of-these-start-with-kuh-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-sss-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-puh-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-buh-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-mmm-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-rrr-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-huh-which-one-doesnt-find-the-odd-one-out',
  'two-of-these-start-with-fff-which-one-doesnt-find-the-odd-one-out',
  // SoundHunt instructions
  'find-everything-that-starts-with-sss-tap-them-all',
  'find-everything-that-starts-with-buh-tap-them-all',
  'find-everything-that-starts-with-mmm-tap-them-all',
  'find-everything-that-starts-with-tuh-tap-them-all',
  'find-everything-that-starts-with-puh-tap-them-all',
  // SyllableClap
  'how-many-beats-does-this-word-have-clap-for-each-beat',
  // RhymeBeach
  'what-rhymes-with-cat',
  'what-rhymes-with-bug',
  'what-rhymes-with-log',
  'what-rhymes-with-hen',
  'what-rhymes-with-pin',

  // --- World 2: Letter Garden ---
  // LetterIntro instructions
  'what-letter-makes-the-sss-sound-tap-it',
  'what-letter-makes-the-aah-sound-tap-it',
  'what-letter-makes-the-tuh-sound-tap-it',
  'what-letter-makes-the-puh-sound-tap-it',
  'what-letter-makes-the-ih-sound-tap-it',
  'what-letter-makes-the-nnn-sound-tap-it',
  'what-letter-makes-the-eh-sound-tap-it',
  'what-letter-makes-the-lll-sound-tap-it',
  // LetterTrace instructions
  'what-letter-does-sun-start-with',
  'what-letter-does-snake-start-with',
  'what-letter-does-apple-start-with',
  'what-letter-does-ant-start-with',
  'what-letter-does-tiger-start-with',
  'what-letter-does-tent-start-with',
  'what-letter-does-penguin-start-with',
  'what-letter-does-pig-start-with',
  'what-letter-does-igloo-start-with',
  'what-letter-does-insect-start-with',
  'what-letter-does-nut-start-with',
  'what-letter-does-nest-start-with',
  'what-letter-does-egg-start-with',
  'what-letter-does-elephant-start-with',
  'what-letter-does-lemon-start-with',
  'what-letter-does-lion-start-with',
  // LetterMatch
  'match-each-letter-to-its-picture-tap-a-letter-then-tap-the-picture-that-starts-with-it',
  // SoundSort instructions
  'sort-the-pictures-does-it-start-with-s-or-t',
  'sort-the-pictures-does-it-start-with-p-or-n',
  'sort-the-pictures-does-it-start-with-a-or-e',
  'sort-the-pictures-does-it-start-with-l-or-i',
  // SoundSorting instructions
  'tap-everything-that-starts-with-sss',
  'tap-everything-that-starts-with-mmm',
  'tap-everything-that-starts-with-tuh',
  'tap-everything-that-starts-with-this-sound',

  // --- World 3: Blending Coast ---
  // SurfSlide (simplified)
  'blend-the-sounds-together-what-word-do-the-letters-make',
  // SoundTelescope instructions
  'listen-to-the-sounds-sssaaat-what-word-is-that',
  'listen-to-the-sounds-piiinnn-what-word-is-that',
  'listen-to-the-sounds-nnneeet-what-word-is-that',
  'listen-to-the-sounds-peeet-what-word-is-that',
  'listen-to-the-sounds-sssiiip-what-word-is-that',
  'listen-to-the-sounds-llleeet-what-word-is-that',
  // PlazaPuzzle — show picture, child reads word options
  'which-word-matches-the-picture-read-the-words',
  // MarketBuilder instructions
  'build-the-word-sat-tap-the-letters-in-order',
  'build-the-word-pin-tap-the-letters-in-order',
  'build-the-word-tap-tap-the-letters-in-order',
  'build-the-word-net-tap-the-letters-in-order',
  'build-the-word-pet-tap-the-letters-in-order',
  'build-the-word-let-tap-the-letters-in-order',
  'build-the-word-tin-tap-the-letters-in-order',
  'build-the-word-sip-tap-the-letters-in-order',
  // SailboatRace — show word, child reads it
  'read-the-word-sail-to-the-right-island',

  // --- World 4: Castle of Words ---
  // WordTowers instructions
  'find-words-in-the-at-family-which-word-belongs',
  'find-words-in-the-an-family-which-word-belongs',
  'find-words-in-the-in-family-which-word-belongs',
  'find-words-in-the-og-family-which-word-belongs',
  'find-words-in-the-ug-family-which-word-belongs',
  // PotionLab instructions
  'put-the-letters-c-a-t-into-the-cauldron-to-make-cat',
  'put-the-letters-p-i-n-into-the-cauldron-to-make-pin',
  'put-the-letters-h-o-t-into-the-cauldron-to-make-hot',
  'put-the-letters-b-a-t-into-the-cauldron-to-make-bat',
  'put-the-letters-d-o-g-into-the-cauldron-to-make-dog',
  'put-the-letters-c-u-p-into-the-cauldron-to-make-cup',
  // KnightsDoors instructions
  'find-the-door-that-says-cat',
  'find-the-door-that-says-dog',
  'find-the-door-that-says-cup',
  'find-the-door-that-says-hen',
  'find-the-door-that-says-bed',
  'find-the-door-that-says-van',
  // DragonFeed — child reads word, picks picture
  'read-the-word-feed-the-dragon-the-right-picture',
  // GardenGrow — child reads seed packet, picks picture
  'read-the-seed-which-picture-matches',

  // --- World 5: Market of Mysteries ---
  // DigraphDiscovery instructions
  'the-word-is-ship-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-shop-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-shin-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-shed-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-chip-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-chop-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-chin-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-chat-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-thin-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-this-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  'the-word-is-that-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  // HeartWordMap instructions
  'the-heart-word-is-the-tap-each-letter-to-learn-it',
  'the-heart-word-is-was-tap-each-letter-to-learn-it',
  'the-heart-word-is-said-tap-each-letter-to-learn-it',
  'the-heart-word-is-is-tap-each-letter-to-learn-it',
  'the-heart-word-is-to-tap-each-letter-to-learn-it',
  'the-heart-word-is-he-tap-each-letter-to-learn-it',
  'the-heart-word-is-she-tap-each-letter-to-learn-it',
  'the-heart-word-is-we-tap-each-letter-to-learn-it',
  'the-heart-word-is-you-tap-each-letter-to-learn-it',
  'the-heart-word-is-are-tap-each-letter-to-learn-it',
  'the-heart-word-is-have-tap-each-letter-to-learn-it',
  'the-heart-word-is-do-tap-each-letter-to-learn-it',
  'the-heart-word-is-no-tap-each-letter-to-learn-it',
  'the-heart-word-is-go-tap-each-letter-to-learn-it',
  'the-heart-word-is-my-tap-each-letter-to-learn-it',
  'the-heart-word-is-the-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-said-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-is-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-to-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-he-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-she-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-we-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-you-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-go-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-no-tap-the-part-we-learn-by-heart',
  'the-heart-word-is-my-tap-the-part-we-learn-by-heart',
  // TreasureMemory
  'match-the-word-pairs-tap-a-card-to-flip-it',
  'match-each-printed-word-to-its-sound',
  // RuinDecoder — child reads word, picks picture
  'read-the-ancient-word-which-picture-matches',
  // SoukSentences — child reads phrase, answers question
  'read-the-sign-what-does-it-say',

  // --- World 6: Everglades Explorer ---
  // StoryStroll — child reads sentence, then answers spoken question
  'read-the-sentence',
  // ComicCreator — child reads sentence, picks matching picture
  'read-the-sentence-which-picture-matches',
  // PostcardWriter instructions
  'i-can-see-a-blank',
  'i-have-a-big-blank',
  'the-blank-is-red',
  'she-sat-on-a-blank',
  'he-got-a-pet-blank',
  'we-can-run-to-the-blank',
  'i-put-it-in-the-blank',
  'the-blank-is-on-the-mat',
  // BeachDetective — child reads passage, then answers spoken question
  'read-the-clue',
  // ManateeRescue instructions
  'the-manatee-needs-help-the-big-net-is-on-the-fin-what-should-we-do',
  'the-manatee-needs-help-the-log-is-in-the-path-what-should-we-do',
  'the-manatee-needs-help-the-cup-fell-in-the-pond-what-should-we-do',
  'the-manatee-needs-help-a-can-is-on-the-sand-what-should-we-do',
  'the-manatee-needs-help-the-fish-is-in-a-net-how-do-we-help',
  'what-should-we-do',
  'how-do-we-help',

  // --- Boss Level prompts ---
  // W1
  'which-one-rhymes-with-cat',
  'which-starts-with-s',
  'which-one-rhymes-with-log',
  'which-starts-with-m',
  'clap-the-beats-banana-has',
  'which-doesnt-start-with-b',
  'which-starts-with-p',
  'which-one-rhymes-with-pin',
  // W2
  'what-sound-does-s-make',
  'what-sound-does-t-make',
  'what-sound-does-a-make',
  'what-sound-does-p-make',
  'what-sound-does-n-make',
  'what-sound-does-e-make',
  'what-sound-does-l-make',
  'what-sound-does-i-make',
  // W3
  'what-word-is-this',
  // W4
  'read-the-word',
  // W5
  'the-ship-is-big',
  'she-said-no',
  'he-was-sad',
  'i-have-a-thin-cat',
  'we-can-go-to-the-shop',
  'the-dog-is-in-the-shed',
  'who-heard-no',
  'where-was-he',
  'what-do-i-have',
  'where-can-we-go',
  'who-is-in-the-shed',
  // W6 (reuse some ComicCreator/sentence slugs + extras)
  'sam-sat-on-a-mat',
  'a-bug-is-on-the-log',
  'the-fish-is-in-the-net',
  'i-have-a-pet-dog',

  // --- Multi-word option phrases ---
  'a-mat', 'a-cat', 'a-hat', 'a-dog', 'a-fish', 'a-bug', 'a-cup', 'a-net', 'a-man',
  'on-the-log', 'in-the-cup', 'on-the-hat', 'in-the-net', 'on-the-bed',
  'in-the-van', 'on-the-sand',
  'the-ship', 'the-cat', 'the-dog',
  'a-blue-hat', 'a-red-flag', 'a-big-net',
  'remove-the-net', 'add-more-net', 'swim-away', 'sit-on-it', 'move-the-log', 'jump-on-it',
  'leave-it', 'push-it-deeper', 'pick-it-up', 'put-it-in-the-bin', 'kick-it', 'hide-it',
  'cook-it', 'free-the-fish', 'watch-it',

  // --- StoryStroll questions ---
  'what-did-sam-sit-on',
  'is-the-cat-big-or-small',
  'where-is-the-bug',
  'what-color-is-the-hat',
  'where-is-the-fish',
  'what-can-she-see',
  'what-pet-do-i-have',
  'is-the-cup-hot-or-cold',

  // --- BeachDetective questions ---
  'what-color-is-the-shell',
  'what-color-is-the-hat',
  'who-has-the-net',
  'where-is-the-dog',
  'what-does-the-ship-have',

  // --- Wrong/reveal composable templates ---
  'not-quite-the-answer-is',

  // --- World 1 redesign: rhyme corrective-model lines ---
  'cat-and-hat-rhyme-listen-cat-hat',
  'bug-and-mug-rhyme-listen-bug-mug',
  'log-and-dog-rhyme-listen-log-dog',
  'hen-and-ten-rhyme-listen-hen-ten',
  'pin-and-bin-rhyme-listen-pin-bin',

  // --- World 1 redesign: syllable beat-count lines ---
  'cat-has-1-beat', 'dog-has-1-beat', 'sun-has-1-beat',
  'apple-has-2-beats', 'monkey-has-2-beats', 'rabbit-has-2-beats',
  'banana-has-3-beats', 'elephant-has-3-beats', 'tomato-has-3-beats',
  'butterfly-has-3-beats', 'dinosaur-has-3-beats', 'watermelon-has-4-beats',

  // --- World 1 redesign: odd-one-out composable templates ---
  'two-of-these-start-with',
  'which-one-doesnt-tap-the-odd-one-out',

  // --- World 2 rebuild: generic instructions composed with phoneme audio ---
  'what-letter-makes-this-sound',
  'which-picture-starts-with-this-sound',
  'what-letter-does-it-start-with',
  'which-one-does-not-start-with-this-sound',
  'listen-first-then-tap-the-one-that-is-different',

  // --- World 6 ComicCreator: real comprehension questions ---
  'who-sat-on-the-mat',
  'who-ran',
  'what-did-the-bug-sit-on',
  'what-did-he-get',
  'what-fell-in-the-pot',
  'who-sat-in-the-van',

  // --- Coverage gap fixes ---
  'the-word-is-them-which-two-letters-make-the-special-sound-is-it-sh-ch-or-th',
  '1', '2', '3', '4',

  // --- LetterIntro reveal narrations ---
  'the-letter-s-makes-the-sss-sound-like-snake',
  'the-letter-a-makes-the-aah-sound-like-ant',
  'the-letter-t-makes-the-tuh-sound-like-tiger',
  'the-letter-p-makes-the-puh-sound-like-penguin',
  'the-letter-i-makes-the-ih-sound-like-iguana',
  'the-letter-n-makes-the-nnn-sound-like-nut',
  'the-letter-e-makes-the-eh-sound-like-egg',
  'the-letter-l-makes-the-lll-sound-like-lemon',
]);

/**
 * Play a static .mp3 file from /public/audio/ via Howler.
 * Cancels any previously playing speech sound.
 * If the file is missing/broken and fallbackText is given, speaks the
 * fallback via browser TTS instead of failing silently.
 * Background music is ducked while speech plays.
 */
async function playStatic(path: string, fallbackText?: string): Promise<void> {
  if (!voiceIsEnabled()) return;

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

  duckMusic();
  if (shouldUseNativeMediaAudio()) {
    try {
      await playNativeAudio(`/audio/${path}`, 'speech', { waitForEnd: true });
    } catch (error) {
      console.warn(`[speech] native playback failed: /audio/${path}`, error);
      if (fallbackText && thisGen === speakGeneration) {
        await browserSpeak(fallbackText);
      }
    } finally {
      unduckMusic();
    }
    return;
  }

  // iOS suspends the WebAudio context during silence (the music kept it awake);
  // with music OFF that made speech go silent. Wake it before every clip.
  if (Howler.ctx && Howler.ctx.state !== 'running') {
    try { await Howler.ctx.resume(); } catch { /* Howler retries after unlock below */ }
  }
  return new Promise<void>((resolve) => {
    // WebAudio (html5:false): iOS only allows a handful of live HTML5 audio
    // elements — with html5:true, sounds went silent after the first round.
    const sound = new Howl({
      src: [`/audio/${path}?v=${AUDIO_VERSION}`],
      format: ['mp3'], // querystring hides the extension from Howler
      html5: false,
      volume: voiceVolume(),
      onend: () => finish(),
      // Resolve on stop too — an interrupted clip must not leave callers
      // awaiting forever (that froze speech sequences mid-game).
      onstop: () => finish(),
      onloaderror: () => {
        console.warn(`[speech] missing audio file: /audio/${path}`);
        if (fallbackText && thisGen === speakGeneration) {
          cleanup();
          browserSpeak(fallbackText).then(resolve);
        } else {
          finish();
        }
      },
      onplayerror: (id, error) => {
        if (thisGen !== speakGeneration) {
          finish();
          return;
        }
        sound.once('unlock', () => {
          if (thisGen === speakGeneration) sound.play(id);
          else finish();
        });
        console.warn(`[speech] waiting for audio unlock: /audio/${path}`, error);
      },
    });

    let done = false;
    const cleanup = () => {
      if (currentSpeechHowl === sound) currentSpeechHowl = null;
      // Release the audio node — leaking them exhausts mobile audio slots
      setTimeout(() => { try { sound.unload(); } catch { /* already unloaded */ } }, 0);
    };
    const finish = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve();
    };

    if (thisGen !== speakGeneration) {
      sound.unload();
      resolve();
      return;
    }

    currentSpeechHowl = sound;
    sound.play();
  }).finally(() => unduckMusic());
}

// --- Browser speech fallback for dynamic text ---

function browserSpeak(text: string, rate = 0.85): Promise<void> {
  if (!voiceIsEnabled()) return Promise.resolve();
  duckMusic();
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = 1.2;
    utter.volume = voiceVolume();

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
  }).finally(() => unduckMusic());
}

// --- Public API ---

/**
 * Smart speak: routes to static file if available, otherwise browser speech.
 */
export async function speak(text: string): Promise<void> {
  if (!text) return;

  const lower = text.toLowerCase().trim();

  // Single phoneme letter?
  if (KNOWN_PHONEMES.has(lower)) {
    return playStatic(`phonemes/${lower}.mp3`, PHONEME_PRONUNCIATIONS[lower] || text);
  }

  // Known word with static file?
  if (KNOWN_WORDS.has(lower)) {
    return playStatic(`words/${lower}.mp3`, text);
  }

  // Known narration (instruction, phrase, etc.)?
  const slug = textToSlug(lower);
  if (KNOWN_NARRATION_SLUGS.has(slug)) {
    return playStatic(`narration/inst-${slug}.mp3`, text);
  }

  // Longer text — use browser speech as fallback.
  // Every string that lands here ships robotic browser TTS: log it so
  // coverage gaps are visible during development.
  console.warn(`[speech] no pre-generated audio for: "${text}" (slug: ${slug})`);
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
 */
export async function speakPhoneme(letter: string): Promise<void> {
  const key = letter.toLowerCase();
  const pronunciation = PHONEME_PRONUNCIATIONS[key] || letter;
  if (KNOWN_PHONEMES.has(key)) {
    return playStatic(`phonemes/${key}.mp3`, pronunciation);
  }
  return browserSpeak(pronunciation);
}

/**
 * Play a word pronunciation from static file.
 */
export async function speakWord(word: string): Promise<void> {
  const key = word.toLowerCase().trim();
  if (KNOWN_WORDS.has(key)) {
    return playStatic(`words/${key}.mp3`, word);
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
 * Play a specific narration clip by id (file: narration/{id}.mp3).
 */
export async function speakClip(id: string, fallbackText?: string): Promise<void> {
  return playStatic(`narration/${id}.mp3`, fallbackText);
}

/**
 * Play the syllable-segmented pronunciation of a word
 * (file: narration/syll-{word}.mp3, e.g. "ba... na... na").
 */
export async function speakSyllables(word: string): Promise<void> {
  return playStatic(`narration/syll-${word.toLowerCase()}.mp3`, word);
}

/**
 * Play the stretched blend pronunciation of a word
 * (file: blends/{word}.mp3, e.g. "s...a...t... sat").
 */
export async function speakBlend(word: string): Promise<void> {
  const key = word.toLowerCase().trim();
  return playStatic(`blends/${key}.mp3`, key.split('').join('... '));
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
 * Explain why the answer was wrong — plays generic wrong feedback clip,
 * then speaks the correct word using pre-generated audio.
 */
export async function speakWrongExplanation(
  _chosenWord: string,
  correctWord: string,
  _context?: string,
): Promise<void> {
  const thisGen = ++speakGeneration;
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (thisGen !== speakGeneration) return;

  // Play a generic wrong feedback clip
  await speakFeedback('wrong');
}

/**
 * Reveal the correct answer — plays "Not quite, the answer is..." then the word.
 */
export async function speakReveal(correctWord: string): Promise<void> {
  const thisGen = ++speakGeneration;
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (thisGen !== speakGeneration) return;

  const lower = correctWord.toLowerCase().trim();

  // Check if the full reveal text is a known narration (e.g., LetterIntro reveals)
  const slug = textToSlug(lower);
  if (KNOWN_NARRATION_SLUGS.has(slug)) {
    return playStatic(`narration/inst-${slug}.mp3`);
  }

  // Play template "Not quite, the answer is..." then the word
  await playStatic('narration/inst-not-quite-the-answer-is.mp3');
  if (speakGeneration !== thisGen) return;
  await new Promise(r => setTimeout(r, 200));
  if (speakGeneration !== thisGen) return;

  // Play the correct word
  if (KNOWN_WORDS.has(lower)) {
    await playStatic(`words/${lower}.mp3`);
  } else if (KNOWN_PHONEMES.has(lower)) {
    await playStatic(`phonemes/${lower}.mp3`);
  }
}

/**
 * Stop all currently playing speech (both Howler and browser).
 */
export function stopSpeaking(): void {
  speakGeneration++;
  stopNativeAudio('speech');
  if (currentSpeechHowl) {
    currentSpeechHowl.stop();
    currentSpeechHowl = null;
  }
  if (typeof window !== 'undefined') {
    window.speechSynthesis?.cancel();
  }
}

/**
 * Play book page narration from pre-generated audio.
 * Path: /audio/books/{bookId}/page-{pageNum}.mp3
 */
export async function speakBookPage(bookId: string, pageNum: number): Promise<void> {
  return playStatic(`books/${bookId}/page-${pageNum}.mp3`);
}

// --- Pronunciation display text (used by game components for UI, not for audio) ---

export const PHONEME_PRONUNCIATIONS: Record<string, string> = {
  a: 'ă', b: 'b', c: 'k', d: 'd',
  e: 'ĕ', f: 'fff', g: 'g', h: 'h',
  i: 'ĭ', j: 'j', k: 'k', l: 'lll',
  m: 'mmm', n: 'nnn', o: 'ŏ', p: 'p', q: 'kw',
  r: 'rrr', s: 'sss', t: 't', u: 'ŭ',
  v: 'vvv', w: 'w', x: 'ks', y: 'y', z: 'zzz',
  sh: 'shh', ch: 'ch', th: 'thh', 'th-voiced': 'thh',
};
