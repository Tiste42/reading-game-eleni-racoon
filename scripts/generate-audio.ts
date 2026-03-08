import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  }
}

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JQLMoxrGsJub4hRarykA';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'audio');
const RATE_LIMIT_MS = 500;

interface AudioClip {
  id: string;
  text: string;
  outputPath: string;
  category: 'phoneme' | 'word' | 'blend' | 'narration' | 'sfx';
}

// Natural pronunciation text for phonemes — spoken by the same voice model
// as everything else. No SSML/IPA needed.
// Continuous sounds get stretched, stop sounds get a minimal vowel.
const PHONEME_TEXT: Record<string, string> = {
  s: 'ssss', a: 'ah', t: 'tuh', p: 'puh', i: 'ih',
  n: 'nnnn', e: 'eh', l: 'llll', c: 'kuh', k: 'kuh',
  h: 'huh', r: 'rrrr', m: 'mmmm', d: 'duh', g: 'guh',
  o: 'oh', u: 'uh', f: 'ffff', b: 'buh', j: 'juh',
  v: 'vvvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzzz',
  sh: 'shhhh', ch: 'chuh', th: 'thhhh',
};

function buildManifest(): AudioClip[] {
  const clips: AudioClip[] = [];

  // --- Phonemes ---
  const phonemeLetters = [
    's', 'a', 't', 'p', 'i', 'n', 'e', 'l', 'c', 'k',
    'h', 'r', 'm', 'd', 'g', 'o', 'u', 'f', 'b', 'j',
    'v', 'w', 'x', 'y', 'z', 'sh', 'ch', 'th',
  ];

  for (const ph of phonemeLetters) {
    clips.push({
      id: `phoneme-${ph}`,
      text: PHONEME_TEXT[ph] || ph,
      outputPath: `phonemes/${ph}.mp3`,
      category: 'phoneme',
    });
  }

  // --- CVC Words + game option words (clean pronunciation) ---
  const words = [
    // Original CVC words
    'sat', 'sit', 'pat', 'tap', 'tip', 'pit', 'pin', 'pan', 'nap', 'nip',
    'tan', 'tin', 'sip', 'ten', 'net', 'let', 'pen', 'pet', 'set',
    'cat', 'hat', 'mat', 'bat', 'rat', 'fat', 'can', 'man', 'van', 'ran',
    'fan', 'fin', 'bin', 'win', 'dog', 'log', 'fog', 'hog', 'bug', 'rug',
    'mug', 'hug', 'cup', 'hot', 'pot', 'dot', 'bed', 'red', 'hen', 'den',
    'men', 'wet', 'jet', 'pup', 'cut', 'hut',
    // Digraph words
    'ship', 'shop', 'shin', 'shed', 'chip', 'chop', 'chin', 'chat',
    'thin', 'this', 'that', 'then', 'them', 'with',
    // Game option words (animals, objects, descriptors used across games)
    'snake', 'ant', 'tiger', 'penguin', 'iguana', 'nut', 'egg', 'lemon',
    'apple', 'tent', 'insect', 'igloo', 'lion', 'sun', 'moon', 'banana',
    'soap', 'ball', 'bird', 'fish', 'bus', 'sock', 'mouse', 'milk',
    'tree', 'top', 'leg', 'rain', 'star', 'map', 'turtle', 'pig',
    'nest', 'elephant', 'din', 'cog', 'jog', 'dug', 'jug', 'cap',
    'car', 'fox', 'lamp', 'elf', 'ink', 'fed', 'lip', 'cot', 'run',
    'cold', 'big', 'small', 'blue', 'green', 'yellow', 'happy', 'sad',
    'fast', 'mad', 'yes', 'pug',
    'monkey', 'rabbit', 'tomato', 'butterfly', 'dinosaur', 'watermelon',
  ];

  for (const w of words) {
    clips.push({
      id: `word-${w}`,
      text: w,
      outputPath: `words/${w}.mp3`,
      category: 'word',
    });
  }

  // --- Blended pronunciations (stretched) ---
  const blendWords = [
    'sat', 'sit', 'pat', 'tap', 'tip', 'pit', 'pin', 'pan', 'nap', 'nip',
    'tan', 'tin', 'sip', 'ten', 'net', 'let', 'pen', 'pet', 'set',
    'cat', 'hat', 'mat', 'bat', 'dog', 'log', 'bug', 'cup', 'hot', 'pot',
  ];

  for (const w of blendWords) {
    const stretched = w.split('').join('...');
    clips.push({
      id: `blend-${w}`,
      text: `${stretched}... ${w}`,
      outputPath: `blends/${w}.mp3`,
      category: 'blend',
    });
  }

  // --- Sight words ---
  const sightWords = [
    'the', 'a', 'is', 'was', 'to', 'he', 'she', 'we', 'my', 'you',
    'are', 'have', 'do', 'no', 'go', 'said', 'of', 'I',
  ];

  for (const w of sightWords) {
    if (!words.includes(w)) {
      clips.push({
        id: `word-${w}`,
        text: w,
        outputPath: `words/${w}.mp3`,
        category: 'word',
      });
    }
  }

  // --- Sentences ---
  const sentences = [
    { id: 'sen-1', text: 'Sam sat on a mat.' },
    { id: 'sen-2', text: 'The cat is big.' },
    { id: 'sen-3', text: 'She can see the ship.' },
    { id: 'sen-4', text: 'He got a red hat.' },
    { id: 'sen-5', text: 'The fish is in the net.' },
    { id: 'sen-6', text: 'A bug is on the log.' },
    { id: 'sen-7', text: 'I have a pet dog.' },
    { id: 'sen-8', text: 'The hen sat on ten eggs.' },
    { id: 'sen-9', text: 'The man has a big van.' },
    { id: 'sen-10', text: 'She can run and hop.' },
  ];

  for (const s of sentences) {
    clips.push({
      id: s.id,
      text: s.text,
      outputPath: `narration/${s.id}.mp3`,
      category: 'narration',
    });
  }

  // --- Eleni narration clips (child-friendly, spoken by Eleni the Raccoon) ---
  const narrations = [
    // Core UI narration
    { id: 'welcome', text: "Hi! I'm Eleni the Raccoon! Let's learn to read together!" },
    { id: 'great-job', text: 'Great job! You are so smart!' },
    { id: 'try-again', text: "Oops! That's okay. Let's try another one!" },
    { id: 'amazing', text: "Wow! Amazing! You're a reading superstar!" },
    { id: 'lets-go', text: "Let's go on an adventure!" },
    { id: 'correct', text: 'Yes! That is right!' },
    { id: 'keep-trying', text: "Almost! Give it one more try!" },
    { id: 'you-did-it', text: "You did it! I'm so proud of you!" },
    { id: 'think-again', text: "Hmm, listen carefully and try again!" },
    { id: 'well-done', text: 'Well done! You are getting so good!' },

    // World intros
    { id: 'world-1-intro', text: "Welcome to the Sound Fiesta in Mexico! Let's listen for sounds and have fun!" },
    { id: 'world-2-intro', text: "Welcome to the Letter Garden in France! Let's learn what sounds letters make!" },
    { id: 'world-3-intro', text: "Welcome to the Blending Coast in Spain! We will blend sounds together to make words!" },
    { id: 'world-4-intro', text: "Welcome to the Castle of Words in England! Let's read words and explore the castle!" },
    { id: 'world-5-intro', text: "Welcome to the Market of Mysteries in Morocco! Let's learn special words and new letter pairs!" },
    { id: 'world-6-intro', text: "Welcome to the Everglades in Florida! You can read whole stories now! How exciting!" },

    // World 1 game instructions
    { id: 'rhyme-match-intro', text: "Let's play Rhyme Fiesta! I will show you some pictures. Tap the two that sound the same at the end. Like cat and hat! They both end the same way!" },
    { id: 'syllable-clap-intro', text: "Let's clap! Every word has beats. Listen: ba-na-na has three beats! Tap the clap button for each beat you hear!" },
    { id: 'first-sound-intro', text: "Listen to the beginning of each word. Can you find the one that starts with the same sound? Tap the one that matches!" },
    { id: 'odd-one-out-intro', text: "Three of these start with the same sound, but one is different. Can you find the odd one out? Tap it!" },
    { id: 'sound-hunt-intro', text: "Let's go on a sound hunt! I will give you a sound. Tap everything that starts with that sound!" },

    // World 2 game instructions
    { id: 'letter-intro-intro', text: "Let's meet some new letter friends! I will show you a letter. Tap it to hear the sound it makes. Every letter has its own special sound!" },
    { id: 'sound-safari-intro', text: "Time for a sound safari! I will show you a letter. Find the picture that starts with that letter sound!" },
    { id: 'letter-match-intro', text: "Let's match! Tap a letter on one side, then tap the picture that starts with it on the other side. Match them all up!" },
    { id: 'sound-sort-intro', text: "Let's sort! Tap a picture, then put it in the right bucket. Does it start with this sound, or that sound?" },
    { id: 'letter-trace-intro', text: "Let's plant a letter garden! I will show you a letter. Tap the plant button and watch it grow into something beautiful!" },

    // World 3 game instructions
    { id: 'surf-slide-intro', text: "Let's surf! I will show you some letters. Tap each one to hear its sound. Then the sounds blend together into a word! Find the matching picture!" },
    { id: 'market-builder-intro', text: "Welcome to the market! See the picture? Build the word by tapping the letters in the right order. Left to right!" },
    { id: 'sailboat-race-intro', text: "Sailboat race! I will show you a word on the sail. Read it and sail to the island with the matching picture!" },
    { id: 'sound-telescope-intro', text: "I see something through my telescope! Tap to look, and I will blend the sounds together. Can you figure out the word? Pick the right picture!" },
    { id: 'plaza-puzzle-intro', text: "Let's build a puzzle! I will show you a word. Read it and pick the matching picture. Each one fills in a piece!" },

    // World 4 game instructions
    { id: 'potion-lab-intro', text: "Welcome to the potion lab! Drag the letters into the cauldron to make a word. Then swap a letter to make a whole new word! It is like magic!" },
    { id: 'word-towers-intro', text: "Let's build a word tower! I will show you words that end the same way. They are a word family! Read each word to add a block." },
    { id: 'knights-doors-intro', text: "There are three doors in the castle. Each one has a word on it. I need the right door! Read the words and find the one I need. Open it!" },
    { id: 'dragon-feed-intro', text: "The baby dragon is hungry! I will show you a word. Read it and pick the matching picture to feed the dragon!" },
    { id: 'garden-grow-intro', text: "Let's grow a garden! Each seed has a word on it. Read the word and pick the matching picture. Watch it grow!" },

    // World 5 game instructions
    { id: 'heart-word-map-intro', text: "These are heart words! They are special. Some parts follow the rules, and some parts we just learn by heart. Tap the letters to see which ones are special!" },
    { id: 'digraph-discovery-intro', text: "Guess what? Sometimes two letters get together and make one brand new sound! Like s and h make shh! Let's find out which one starts each word!" },
    { id: 'ruin-decoder-intro', text: "Ancient words are written on the wall! Read each word and pick the matching picture. Each one reveals part of a secret picture!" },
    { id: 'treasure-memory-intro', text: "Memory game! Tap a card to flip it over and see a word. Find the other card with the same word. Match them all!" },
    { id: 'souk-sentences-intro', text: "Can you read these short phrases? Read what is on the sign and answer the question. You are reading real sentences now!" },

    // World 6 game instructions
    { id: 'story-stroll-intro', text: "Let's go for a stroll and read the signs! Read each sentence. I will show you the picture that goes with it. You are reading a real story!" },
    { id: 'comic-creator-intro', text: "Let's make a comic! Read each sentence and watch the picture appear. You are the author of this story!" },
    { id: 'manatee-rescue-intro', text: "The manatees need our help! Read the sentence to understand what is happening, then choose the right thing to do!" },
    { id: 'beach-detective-intro', text: "You are a detective! Read the clue carefully. Then answer the question about what you read!" },
    { id: 'postcard-writer-intro', text: "Let's write postcards! Read the sentence and pick the missing word. Which word fits? Look at the picture for a hint!" },

    // Boss level intros
    { id: 'boss-1-intro', text: "This is the big fiesta challenge! Show me everything you learned about sounds! You can do it!" },
    { id: 'boss-2-intro', text: "Time for the garden party! Let's see if you know all your letter sounds! I believe in you!" },
    { id: 'boss-3-intro', text: "The regatta is starting! Blend all the words to win the race! You are ready for this!" },
    { id: 'boss-4-intro', text: "The dragon is in the library! Read all the words to help him! You have got this!" },
    { id: 'boss-5-intro', text: "The sphinx has riddles for us! Read the sentences and answer carefully! You are so smart!" },
    { id: 'boss-6-intro', text: "This is the sunset story! Read the whole story from beginning to end. You are a real reader now!" },

    // Hints and encouragement
    { id: 'rhyme-hint', text: 'Listen! These words sound the same at the end!' },
    { id: 'blend-hint', text: "Slide your finger across the letters. Don't stop in between!" },
    { id: 'letter-hint', text: 'This letter says...' },
    { id: 'heart-word', text: "This word is special. We learn it by heart!" },
    { id: 'boss-intro', text: "This is the big challenge! Show me what you have learned!" },
    { id: 'passport-stamp', text: "You earned a passport stamp! Let's explore the next world!" },
    { id: 'coin-reward', text: 'You earned some coins! Great work!' },
    { id: 'free-play-on', text: 'Free play mode is on! You can play any game!' },
    { id: 'streak-3', text: 'Three in a row! Keep going!' },
    { id: 'streak-5', text: 'Five in a row! You are on fire!' },
    { id: 'streak-10', text: 'Ten in a row! That is incredible!' },
    { id: 'first-try', text: 'You got it on the first try! Wonderful!' },
    { id: 'level-complete', text: 'Level complete! You are amazing!' },
    { id: 'new-companion', text: 'You made a new friend! They will travel with you!' },
    { id: 'new-costume', text: 'You got a new outfit! Looking great!' },
  ];

  for (const n of narrations) {
    clips.push({
      id: `narration-${n.id}`,
      text: n.text,
      outputPath: `narration/${n.id}.mp3`,
      category: 'narration',
    });
  }

  // --- Per-round instruction narrations ---
  // These are the dynamic instruction strings spoken each round in games.
  // File naming: narration/inst-{slug}.mp3 where slug = textToSlug(text)
  const instructionNarrations: { text: string; ttsText?: string }[] = [
    // World 1: SoundSafari
    { text: 'Find the picture that starts with s!' },
    { text: 'Find the picture that starts with a!' },
    { text: 'Find the picture that starts with t!' },
    { text: 'Find the picture that starts with p!' },
    { text: 'Find the picture that starts with i!' },
    { text: 'Find the picture that starts with n!' },
    { text: 'Find the picture that starts with e!' },
    { text: 'Find the picture that starts with l!' },
    // World 1: OddSoundOut
    { text: "Two of these start with kuh. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with sss. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with puh. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with buh. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with mmm. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with rrr. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with huh. Which one doesn't? Find the odd one out!" },
    { text: "Two of these start with fff. Which one doesn't? Find the odd one out!" },
    // World 1: SoundHunt
    { text: 'Find everything that starts with sss! Tap them all!' },
    { text: 'Find everything that starts with buh! Tap them all!' },
    { text: 'Find everything that starts with mmm! Tap them all!' },
    { text: 'Find everything that starts with tuh! Tap them all!' },
    { text: 'Find everything that starts with puh! Tap them all!' },
    // World 1: SyllableClap
    { text: 'How many beats does this word have? Clap for each beat!' },
    // World 1: RhymeBeach
    { text: 'What rhymes with cat?' },
    { text: 'What rhymes with bug?' },
    { text: 'What rhymes with log?' },
    { text: 'What rhymes with hen?' },
    { text: 'What rhymes with pin?' },
    // World 2: LetterIntro
    { text: 'What letter makes the sss sound? Tap it!' },
    { text: 'What letter makes the aah sound? Tap it!' },
    { text: 'What letter makes the tuh sound? Tap it!' },
    { text: 'What letter makes the puh sound? Tap it!' },
    { text: 'What letter makes the ih sound? Tap it!' },
    { text: 'What letter makes the nnn sound? Tap it!' },
    { text: 'What letter makes the eh sound? Tap it!' },
    { text: 'What letter makes the lll sound? Tap it!' },
    // World 2: LetterTrace
    { text: 'What letter does sun start with?' },
    { text: 'What letter does snake start with?' },
    { text: 'What letter does apple start with?' },
    { text: 'What letter does ant start with?' },
    { text: 'What letter does tiger start with?' },
    { text: 'What letter does tent start with?' },
    { text: 'What letter does penguin start with?' },
    { text: 'What letter does pig start with?' },
    { text: 'What letter does igloo start with?' },
    { text: 'What letter does insect start with?' },
    { text: 'What letter does nut start with?' },
    { text: 'What letter does nest start with?' },
    { text: 'What letter does egg start with?' },
    { text: 'What letter does elephant start with?' },
    { text: 'What letter does lemon start with?' },
    { text: 'What letter does lion start with?' },
    // World 2: LetterMatch
    { text: 'Match each letter to its picture! Tap a letter, then tap the picture that starts with it!' },
    // World 2: SoundSort
    { text: 'Sort the pictures! Does it start with s or t?' },
    { text: 'Sort the pictures! Does it start with p or n?' },
    { text: 'Sort the pictures! Does it start with a or e?' },
    { text: 'Sort the pictures! Does it start with l or i?' },
    // World 2: SoundSorting
    { text: 'Tap everything that starts with sss!' },
    { text: 'Tap everything that starts with mmm!' },
    { text: 'Tap everything that starts with tuh!' },
    // World 3: SurfSlide (simplified)
    { text: 'Blend the sounds together! What word do the letters make?' },
    // World 3: SoundTelescope
    { text: 'Listen to the sounds: sss...aaa...t. What word is that?', ttsText: 'Listen to the sounds: sss, aah, t. What word is that?' },
    { text: 'Listen to the sounds: p...iii...nnn. What word is that?', ttsText: 'Listen to the sounds: p, ih, nnn. What word is that?' },
    { text: 'Listen to the sounds: nnn...eee...t. What word is that?', ttsText: 'Listen to the sounds: nnn, eh, t. What word is that?' },
    { text: 'Listen to the sounds: p...eee...t. What word is that?', ttsText: 'Listen to the sounds: p, eh, t. What word is that?' },
    { text: 'Listen to the sounds: sss...iii...p. What word is that?', ttsText: 'Listen to the sounds: sss, ih, p. What word is that?' },
    { text: 'Listen to the sounds: lll...eee...t. What word is that?', ttsText: 'Listen to the sounds: lll, eh, t. What word is that?' },
    // World 3: SailboatRace — child reads the word, no answer given
    { text: 'Read the word! Sail to the right island!' },
    // World 3: PlazaPuzzle — show picture, child reads word options
    { text: 'Which word matches the picture? Read the words!' },
    // World 3: MarketBuilder
    { text: 'Build the word sat! Tap the letters in order!' },
    { text: 'Build the word pin! Tap the letters in order!' },
    { text: 'Build the word tap! Tap the letters in order!' },
    { text: 'Build the word net! Tap the letters in order!' },
    { text: 'Build the word pet! Tap the letters in order!' },
    { text: 'Build the word let! Tap the letters in order!' },
    { text: 'Build the word tin! Tap the letters in order!' },
    { text: 'Build the word sip! Tap the letters in order!' },
    // World 4: WordTowers
    { text: 'Find words in the -at family! Which word belongs?' },
    { text: 'Find words in the -an family! Which word belongs?' },
    { text: 'Find words in the -in family! Which word belongs?' },
    { text: 'Find words in the -og family! Which word belongs?' },
    { text: 'Find words in the -ug family! Which word belongs?' },
    // World 4: PotionLab
    { text: 'Put the letters c, a, t into the cauldron to make cat!' },
    { text: 'Put the letters p, i, n into the cauldron to make pin!' },
    { text: 'Put the letters h, o, t into the cauldron to make hot!' },
    { text: 'Put the letters b, a, t into the cauldron to make bat!' },
    { text: 'Put the letters d, o, g into the cauldron to make dog!' },
    { text: 'Put the letters c, u, p into the cauldron to make cup!' },
    // World 4: KnightsDoors
    { text: 'Find the door that says cat!' },
    { text: 'Find the door that says dog!' },
    { text: 'Find the door that says cup!' },
    { text: 'Find the door that says hen!' },
    { text: 'Find the door that says bed!' },
    { text: 'Find the door that says van!' },
    // World 4: DragonFeed — generic (child reads word, picks picture)
    { text: 'Read the word! Feed the dragon the right picture!' },
    // World 4: GardenGrow — generic (child reads seed packet, picks picture)
    { text: 'Read the seed! Which picture matches?' },
    // World 5: DigraphDiscovery
    { text: 'The word is ship. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is shop. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is shin. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is shed. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is chip. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is chop. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is chin. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is chat. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is thin. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is this. Which two letters make the special sound? Is it sh, ch, or th?' },
    { text: 'The word is that. Which two letters make the special sound? Is it sh, ch, or th?' },
    // World 5: HeartWordMap
    { text: 'The heart word is the. Tap each letter to learn it!' },
    { text: 'The heart word is was. Tap each letter to learn it!' },
    { text: 'The heart word is said. Tap each letter to learn it!' },
    { text: 'The heart word is is. Tap each letter to learn it!' },
    { text: 'The heart word is to. Tap each letter to learn it!' },
    { text: 'The heart word is he. Tap each letter to learn it!' },
    { text: 'The heart word is she. Tap each letter to learn it!' },
    { text: 'The heart word is we. Tap each letter to learn it!' },
    { text: 'The heart word is you. Tap each letter to learn it!' },
    { text: 'The heart word is are. Tap each letter to learn it!' },
    { text: 'The heart word is have. Tap each letter to learn it!' },
    { text: 'The heart word is do. Tap each letter to learn it!' },
    { text: 'The heart word is no. Tap each letter to learn it!' },
    { text: 'The heart word is go. Tap each letter to learn it!' },
    { text: 'The heart word is my. Tap each letter to learn it!' },
    // World 5: TreasureMemory
    { text: 'Match the word pairs! Tap a card to flip it!' },
    // World 5: RuinDecoder — generic (child reads word, picks picture)
    { text: 'Read the ancient word! Which picture matches?' },
    // World 5: SoukSentences — generic (child reads phrase, answers question)
    { text: 'Read the sign! What does it say?' },
    // World 6: StoryStroll — generic (child reads sentence, answers spoken question)
    { text: 'Read the sentence!' },
    // World 6: StoryStroll — per-question narrations (spoken after child taps "I read it!")
    { text: 'What did Sam sit on?' },
    { text: 'Is the cat big or small?' },
    { text: 'Where is the bug?' },
    { text: 'What color is the hat?' },
    { text: 'Where is the fish?' },
    { text: 'What can she see?' },
    { text: 'What pet do I have?' },
    { text: 'Is the cup hot or cold?' },
    // World 6: BeachDetective — per-question narrations (spoken after child reads clue)
    { text: 'What color is the shell?' },
    { text: 'Who has the net?' },
    { text: 'Where is the dog?' },
    { text: 'What does the ship have?' },
    // World 6: ComicCreator — generic (child reads sentence, picks matching picture)
    { text: 'Read the sentence! Which picture matches?' },
    // World 6: PostcardWriter
    { text: 'I can see a blank.' },
    { text: 'I have a big blank.' },
    { text: 'The blank is red.' },
    { text: 'She sat on a blank.' },
    { text: 'He got a pet blank.' },
    { text: 'We can run to the blank.' },
    { text: 'I put it in the blank.' },
    { text: 'The blank is on the mat.' },
    // World 6: BeachDetective — generic (child reads passage, answers spoken question)
    { text: 'Read the clue!' },
    // World 6: ManateeRescue
    { text: 'The manatee needs help! The big net is on the fin. What should we do?' },
    { text: 'The manatee needs help! The log is in the path. What should we do?' },
    { text: 'The manatee needs help! The cup fell in the pond. What should we do?' },
    { text: 'The manatee needs help! A can is on the sand. What should we do?' },
    { text: 'The manatee needs help! The fish is in a net. How do we help?' },
    // Boss Level W1
    { text: 'Which one rhymes with cat?' },
    { text: 'Which starts with "s"?', ttsText: 'Which starts with s?' },
    { text: 'Which one rhymes with log?' },
    { text: 'Which starts with "m"?', ttsText: 'Which starts with m?' },
    { text: 'Clap the beats: "banana" has...', ttsText: 'Clap the beats: banana has...' },
    { text: "Which doesn't start with \"b\"?", ttsText: "Which doesn't start with b?" },
    { text: 'Which starts with "p"?', ttsText: 'Which starts with p?' },
    { text: 'Which one rhymes with pin?' },
    // Boss Level W2
    { text: 'What sound does "s" make?', ttsText: 'What sound does s make?' },
    { text: 'What sound does "t" make?', ttsText: 'What sound does t make?' },
    { text: 'What sound does "a" make?', ttsText: 'What sound does a make?' },
    { text: 'What sound does "p" make?', ttsText: 'What sound does p make?' },
    { text: 'What sound does "n" make?', ttsText: 'What sound does n make?' },
    { text: 'What sound does "e" make?', ttsText: 'What sound does e make?' },
    { text: 'What sound does "l" make?', ttsText: 'What sound does l make?' },
    { text: 'What sound does "i" make?', ttsText: 'What sound does i make?' },
    // Boss Level W3
    { text: 'What word is this?' },
    // Boss Level W4
    { text: 'Read the word:' },
    // Boss Level W5
    { text: 'The ship is big.' },
    { text: 'She said no.' },
    { text: 'He was sad.' },
    { text: 'I have a thin cat.' },
    { text: 'We can go to the shop.' },
    { text: 'The dog is in the shed.' },
    // Boss Level W6 (some overlap with above)
    { text: 'Sam sat on a mat.' },
    { text: 'A bug is on the log.' },
    { text: 'The fish is in the net.' },
    { text: 'I have a pet dog.' },
  ];

  // Multi-word option phrases (spoken as options in games)
  const phraseNarrations = [
    'a mat', 'a cat', 'a hat', 'a dog', 'a fish', 'a bug', 'a cup', 'a net', 'a man',
    'on the log', 'in the cup', 'on the hat', 'in the net', 'on the bed',
    'in the van', 'on the sand',
    'the ship', 'the cat', 'the dog',
    'a blue hat', 'a red flag', 'a big net',
    'Remove the net', 'Add more net', 'Swim away', 'Sit on it', 'Move the log', 'Jump on it',
    'Leave it', 'Push it deeper', 'Pick it up', 'Put it in the bin', 'Kick it', 'Hide it',
    'Cook it', 'Free the fish', 'Watch it',
  ];

  // Wrong/reveal template narrations
  const templateNarrations = [
    { text: 'Not quite. The answer is...', slug: 'not-quite-the-answer-is' },
  ];

  // LetterIntro reveal narrations
  const revealNarrations = [
    'The letter s makes the sss sound, like snake',
    'The letter a makes the aah sound, like ant',
    'The letter t makes the tuh sound, like tiger',
    'The letter p makes the puh sound, like penguin',
    'The letter i makes the ih sound, like iguana',
    'The letter n makes the nnn sound, like nut',
    'The letter e makes the eh sound, like egg',
    'The letter l makes the lll sound, like lemon',
  ];

  // Helper to create slug from text (must match speech.ts textToSlug)
  function textToSlug(text: string): string {
    return text.toLowerCase().trim()
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
  }

  // Add instruction narrations
  const seenSlugs = new Set<string>();
  for (const inst of instructionNarrations) {
    const slug = textToSlug(inst.text);
    if (seenSlugs.has(slug)) continue; // Skip duplicates
    seenSlugs.add(slug);
    clips.push({
      id: `inst-${slug}`,
      text: inst.ttsText || inst.text,
      outputPath: `narration/inst-${slug}.mp3`,
      category: 'narration',
    });
  }

  // Add phrase narrations
  for (const phrase of phraseNarrations) {
    const slug = textToSlug(phrase);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    clips.push({
      id: `inst-${slug}`,
      text: phrase,
      outputPath: `narration/inst-${slug}.mp3`,
      category: 'narration',
    });
  }

  // Add template narrations
  for (const tpl of templateNarrations) {
    clips.push({
      id: `inst-${tpl.slug}`,
      text: tpl.text,
      outputPath: `narration/inst-${tpl.slug}.mp3`,
      category: 'narration',
    });
  }

  // Add reveal narrations
  for (const reveal of revealNarrations) {
    const slug = textToSlug(reveal);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    clips.push({
      id: `inst-${slug}`,
      text: reveal,
      outputPath: `narration/inst-${slug}.mp3`,
      category: 'narration',
    });
  }

  // --- Book narration (page-by-page read-aloud) ---
  // Dynamically import book config — works at build time with tsx
  let BOOKS: Array<{ id: string; pages: Array<{ narrationText: string }> }> = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const booksModule = require('../src/lib/books');
    BOOKS = booksModule.BOOKS || [];
  } catch {
    console.log('  (No books config found, skipping book narration)');
  }

  for (const book of BOOKS) {
    for (let i = 0; i < book.pages.length; i++) {
      const page = book.pages[i];
      if (!page.narrationText) continue;
      clips.push({
        id: `book-${book.id}-page-${i + 1}`,
        text: page.narrationText,
        outputPath: `books/${book.id}/page-${i + 1}.mp3`,
        category: 'narration',
      });
    }
  }

  return clips;
}

async function generateClip(clip: AudioClip): Promise<boolean> {
  const outputFile = path.join(OUTPUT_DIR, clip.outputPath);
  const dir = path.dirname(outputFile);

  if (fs.existsSync(outputFile)) {
    console.log(`  SKIP: ${clip.outputPath} (exists)`);
    return true;
  }

  fs.mkdirSync(dir, { recursive: true });

  try {
    const body: Record<string, unknown> = {
      text: clip.text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.75,
        similarity_boost: 0.75,
        style: 0.3,
      },
    };

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`  FAIL: ${clip.outputPath} - ${response.status}: ${err}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputFile, buffer);
    console.log(`  OK: ${clip.outputPath} (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`  ERROR: ${clip.outputPath}`, error);
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Eleni Sound Safari - Audio Generator ===\n');

  if (!ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set in .env.local');
    process.exit(1);
  }

  const clips = buildManifest();
  console.log(`Total clips to generate: ${clips.length}\n`);

  const categories = ['phoneme', 'word', 'blend', 'narration'] as const;
  let successCount = 0;
  let failCount = 0;
  const failures: string[] = [];

  for (const cat of categories) {
    const catClips = clips.filter((c) => c.category === cat);
    console.log(`\n--- ${cat.toUpperCase()} (${catClips.length} clips) ---`);

    for (const clip of catClips) {
      const ok = await generateClip(clip);
      if (ok) {
        successCount++;
      } else {
        failCount++;
        failures.push(clip.outputPath);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  if (failures.length > 0) {
    console.log('\nFailed clips (need manual review/fallback):');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log('\nDone!');
}

main().catch(console.error);
