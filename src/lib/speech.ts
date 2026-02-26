'use client';

const audioCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let speakGeneration = 0;

export function unlockSpeechAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  ctx.resume().then(() => ctx.close()).catch(() => {});
}

if (typeof window !== 'undefined') {
  const unlock = () => { unlockSpeechAudio(); };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

async function fetchSpeech(text: string): Promise<string> {
  const cacheKey = text.toLowerCase().trim();
  if (audioCache.has(cacheKey)) return audioCache.get(cacheKey)!;

  try {
    const res = await fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error(`Speech API ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    audioCache.set(cacheKey, url);
    return url;
  } catch (err) {
    console.warn('ElevenLabs failed, using browser speech:', err);
    return '';
  }
}

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

export async function speak(text: string): Promise<void> {
  if (!text) return;

  const thisGen = ++speakGeneration;

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();

  const url = await fetchSpeech(text);

  if (thisGen !== speakGeneration) return;

  if (url) {
    return new Promise((resolve) => {
      if (thisGen !== speakGeneration) { resolve(); return; }
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => { currentAudio = null; resolve(); };
      audio.onerror = () => {
        currentAudio = null;
        browserSpeak(text).then(resolve);
      };
      audio.play().catch((err) => {
        console.warn('Audio play blocked:', err.message);
        currentAudio = null;
        browserSpeak(text).then(resolve);
      });
    });
  }

  return browserSpeak(text);
}

export async function speakWord(word: string): Promise<void> {
  return speak(word);
}

const PHONEME_PRONUNCIATIONS: Record<string, string> = {
  a: 'aah', b: 'buh', c: 'kuh', d: 'duh',
  e: 'eh', f: 'fff', g: 'guh', h: 'huh',
  i: 'ih', j: 'juh', k: 'kuh', l: 'lll',
  m: 'mmm', n: 'nnn', o: 'oh', p: 'puh',
  r: 'rrr', s: 'sss', t: 'tuh', u: 'uh',
  v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz',
  sh: 'shh', ch: 'chuh', th: 'thh',
};

export async function speakPhoneme(letter: string): Promise<void> {
  const pronunciation = PHONEME_PRONUNCIATIONS[letter.toLowerCase()] || letter;
  return speak(pronunciation);
}

export async function speakInstruction(gameId: string): Promise<void> {
  const instructions: Record<string, string> = {
    'rhyme-match': "Let's play Rhyme Fiesta! Tap the picture that sounds the same at the end. Like cat and hat!",
    'syllable-clap': "Let's clap! Every word has beats. Tap the clap button for each beat you hear!",
    'first-sound': "Listen to the beginning of each word. Find the one that starts with the same sound!",
    'odd-one-out': "Three of these start with the same sound, but one is different. Find the odd one out!",
    'sound-hunt': "Let's go on a sound hunt! Find everything that starts with this sound!",
    'letter-intro': "Let's meet some letter friends! Tap a letter to hear the sound it makes!",
    'sound-safari': "Time for a sound safari! Find the picture that starts with this letter sound!",
    'letter-match': "Let's match! Tap a letter, then tap its picture!",
    'sound-sort': "Let's sort! Tap a picture, then put it in the right bucket!",
    'letter-trace': "Let's plant a letter garden! Tap the plant button to grow something beautiful!",
    'surf-slide': "Let's surf! Tap each letter to hear its sound, then find the matching picture!",
    'market-builder': "Welcome to the market! Build the word by tapping the letters in order!",
    'sailboat-race': "Sailboat race! Read the word and sail to the right island!",
    'sound-telescope': "I see something through my telescope! Can you figure out the word?",
    'plaza-puzzle': "Let's build a puzzle! Read the word and pick the matching picture!",
    'potion-lab': "Welcome to the potion lab! Drag letters into the cauldron to make a word!",
    'word-towers': "Let's build a word tower! Find words that end the same way!",
    'knights-doors': "Three doors in the castle! Read the words and find the right one!",
    'dragon-feed': "The baby dragon is hungry! Read the word and pick the matching picture!",
    'garden-grow': "Let's grow a garden! Read the seed packet and pick the right picture!",
    'heart-word-map': "These are heart words! They are special. Tap the letters to learn them!",
    'digraph-discovery': "Two letters get together and make one new sound! Find which one starts each word!",
    'ruin-decoder': "Ancient words on the wall! Read each word and pick the matching picture!",
    'treasure-memory': "Memory game! Flip cards and find the matching word pairs!",
    'souk-sentences': "Can you read these short phrases? You are reading real sentences now!",
    'story-stroll': "Let's read the signs! Read each sentence and see the matching picture!",
    'comic-creator': "Let's make a comic! Read each sentence and watch the picture appear!",
    'manatee-rescue': "The manatees need help! Read the sentence and choose what to do!",
    'beach-detective': "You are a detective! Read the clue and answer the question!",
    'postcard-writer': "Let's write postcards! Pick the missing word that fits!",
    'boss-1': "This is the big fiesta challenge! Show me everything you learned! You can do it!",
    'boss-2': "Time for the garden party! Let's see if you know all your letter sounds!",
    'boss-3': "The regatta is starting! Blend all the words to win the race!",
    'boss-4': "The dragon is in the library! Read all the words to help him!",
    'boss-5': "The sphinx has riddles! Read the sentences and answer carefully!",
    'boss-6': "This is the sunset story! Read the whole story! You are a real reader now!",
  };

  const text = instructions[gameId];
  if (text) await speak(text);
}

export async function speakFeedback(type: 'correct' | 'wrong' | 'complete'): Promise<void> {
  const correctPhrases = [
    'Yes! Great job!',
    'That is right!',
    'You got it!',
    'Wonderful!',
    'Super!',
  ];
  const wrongPhrases = [
    'Try again!',
    'Not quite! Try another one!',
    'Almost! Give it one more try!',
    'Hmm, try a different one!',
  ];
  const completePhrases = [
    'You did it! Amazing!',
    'Wow! You are a superstar!',
    'All done! I am so proud of you!',
  ];

  const phrases = type === 'correct' ? correctPhrases
    : type === 'wrong' ? wrongPhrases
    : completePhrases;
  const text = phrases[Math.floor(Math.random() * phrases.length)];
  await speak(text);
}

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
  return speak(text);
}

export async function speakReveal(correctWord: string): Promise<void> {
  return speak(`Let me help! The answer is ${correctWord}!`);
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  window.speechSynthesis?.cancel();
}
