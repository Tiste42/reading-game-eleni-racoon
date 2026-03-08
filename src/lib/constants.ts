export interface WorldConfig {
  id: number;
  name: string;
  subtitle: string;
  location: string;
  color: string;
  bgGradient: string;
  icon: string;
  description: string;
  skills: string[];
  games: GameConfig[];
  bossGame: GameConfig;
  reward: {
    costume: string;
    companion: string;
  };
}

export interface GameConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const WORLDS: WorldConfig[] = [
  {
    id: 1,
    name: 'The Sound Fiesta',
    subtitle: 'Mexico',
    location: 'Mexico',
    color: '#EC4899',
    bgGradient: 'from-pink-500 to-orange-400',
    icon: '🪅',
    description: 'Listen to sounds and find the ones that match!',
    skills: ['Rhyme recognition', 'Syllable awareness', 'First sound identification'],
    games: [
      { id: 'rhyme-match', name: 'Rhyme Fiesta', icon: '🎶', description: 'Find the sounds that rhyme!' },
      { id: 'syllable-clap', name: 'Clap & Count', icon: '👏', description: 'Clap the beats in words!' },
      { id: 'first-sound', name: 'Sound Sorting', icon: '🎵', description: 'Which words start the same?' },
      { id: 'odd-one-out', name: 'Odd Sound Out', icon: '🔍', description: 'Find the one that\'s different!' },
      { id: 'sound-hunt', name: 'Sound Hunt', icon: '🗺️', description: 'Find things that start with this sound!' },
    ],
    bossGame: { id: 'boss-1', name: 'Fiesta Finale', icon: '🎊', description: 'Show what you learned!' },
    reward: { costume: 'sombrero', companion: 'parrot' },
  },
  {
    id: 2,
    name: 'The Letter Garden',
    subtitle: 'France',
    location: 'France',
    color: '#8B5CF6',
    bgGradient: 'from-purple-400 to-pink-300',
    icon: '🌸',
    description: 'Learn the sounds that letters make!',
    skills: ['Letter-sound mapping (s, a, t, p, i, n, e, l)', 'Letter recognition', 'Initial sound matching'],
    games: [
      { id: 'letter-intro', name: 'Sound Spotter', icon: '🔊', description: 'Hear a sound, find the letter!' },
      { id: 'sound-safari', name: 'Sound Safari', icon: '🦋', description: 'Find the picture that starts with this letter!' },
      { id: 'letter-match', name: 'Letter Match', icon: '🎯', description: 'Match letters to their pictures!' },
      { id: 'sound-sort', name: 'Sound Sorting', icon: '🧺', description: 'Sort pictures by their first sound!' },
      { id: 'letter-trace', name: 'Beginning Sounds', icon: '🌱', description: 'What letter does this picture start with?' },
    ],
    bossGame: { id: 'boss-2', name: 'The Garden Party', icon: '🎪', description: 'Show off all your letter sounds!' },
    reward: { costume: 'beret', companion: 'butterfly' },
  },
  {
    id: 3,
    name: 'The Blending Coast',
    subtitle: 'Spain & Majorca',
    location: 'Spain',
    color: '#F59E0B',
    bgGradient: 'from-amber-400 to-orange-300',
    icon: '🏄',
    description: 'Blend sounds together to make words!',
    skills: ['Continuous blending', 'CVC word decoding', 'Sound-to-word mapping'],
    games: [
      { id: 'surf-slide', name: 'Surf Slide', icon: '🌊', description: 'Ride the wave and blend the sounds!' },
      { id: 'market-builder', name: 'Market Builder', icon: '🏪', description: 'Build words to buy things!' },
      { id: 'sailboat-race', name: 'Sailboat Race', icon: '⛵', description: 'Sail to the right island!' },
      { id: 'sound-telescope', name: 'Sound Telescope', icon: '🔭', description: 'What word do you hear?' },
      { id: 'plaza-puzzle', name: 'Plaza Puzzle', icon: '🧩', description: 'Read words to build the puzzle!' },
    ],
    bossGame: { id: 'boss-3', name: 'The Regatta', icon: '🏆', description: 'Win the big race!' },
    reward: { costume: 'sailor-hat', companion: 'dolphin' },
  },
  {
    id: 4,
    name: 'The Castle of Words',
    subtitle: 'England & Wales',
    location: 'England',
    color: '#10B981',
    bgGradient: 'from-emerald-400 to-teal-300',
    icon: '🏰',
    description: 'Read words fast and discover word families!',
    skills: ['CVC fluency', 'Word families', 'Phoneme manipulation'],
    games: [
      { id: 'potion-lab', name: 'Potion Lab', icon: '🧪', description: 'Mix letters to make new words!' },
      { id: 'word-towers', name: 'Word Towers', icon: '🗼', description: 'Build towers of words that rhyme!' },
      { id: 'knights-doors', name: 'Knight\'s Doors', icon: '🚪', description: 'Open the right door!' },
      { id: 'dragon-feed', name: 'Dragon Feed', icon: '🐲', description: 'Read words to feed the dragon!' },
      { id: 'garden-grow', name: 'Garden Grow', icon: '🌻', description: 'Read words to grow a garden!' },
    ],
    bossGame: { id: 'boss-4', name: 'Dragon\'s Library', icon: '📚', description: 'Rescue the dragon!' },
    reward: { costume: 'knight-armor', companion: 'dragon' },
  },
  {
    id: 5,
    name: 'The Market of Mysteries',
    subtitle: 'Morocco',
    location: 'Morocco',
    color: '#EF4444',
    bgGradient: 'from-red-400 to-amber-300',
    icon: '🕌',
    description: 'Learn special words and new letter pairs!',
    skills: ['Sight words', 'Digraphs (sh, ch, th)', 'Simple phrases'],
    games: [
      { id: 'heart-word-map', name: 'Heart Word Map', icon: '💖', description: 'Learn special words by heart!' },
      { id: 'digraph-discovery', name: 'Digraph Discovery', icon: '🔮', description: 'Two letters, one sound!' },
      { id: 'ruin-decoder', name: 'Ruin Decoder', icon: '🏺', description: 'Read the ancient words!' },
      { id: 'treasure-memory', name: 'Treasure Memory', icon: '🃏', description: 'Match the word pairs!' },
      { id: 'souk-sentences', name: 'Souk Sentences', icon: '📜', description: 'Read short phrases!' },
    ],
    bossGame: { id: 'boss-5', name: 'Atlas Mountain Riddle', icon: '⛰️', description: 'Answer the riddles!' },
    reward: { costume: 'desert-explorer', companion: 'camel' },
  },
  {
    id: 6,
    name: 'Everglades Explorer',
    subtitle: 'Florida',
    location: 'Florida',
    color: '#06B6D4',
    bgGradient: 'from-cyan-400 to-green-300',
    icon: '🐊',
    description: 'Read sentences and understand stories!',
    skills: ['Sentence reading', 'Comprehension', 'Connected text'],
    games: [
      { id: 'story-stroll', name: 'Story Stroll', icon: '🛶', description: 'Read signs along the river!' },
      { id: 'comic-creator', name: 'Comic Creator', icon: '💬', description: 'Read to create a comic!' },
      { id: 'manatee-rescue', name: 'Manatee Rescue', icon: '🐋', description: 'Read to help the manatees!' },
      { id: 'beach-detective', name: 'Beach Detective', icon: '🔎', description: 'Read clues to solve the mystery!' },
      { id: 'postcard-writer', name: 'Postcard Writer', icon: '✉️', description: 'Pick the right words!' },
    ],
    bossGame: { id: 'boss-6', name: 'The Sunset Story', icon: '🌅', description: 'Read the whole story!' },
    reward: { costume: 'surfer-wetsuit', companion: 'manatee' },
  },
];

export const SATPIN_LETTERS = ['s', 'a', 't', 'p', 'i', 'n'];
export const EXTENDED_LETTERS = ['e', 'l'];
export const WORLD_2_LETTERS = [...SATPIN_LETTERS, ...EXTENDED_LETTERS];

export const ADAPTIVE_THRESHOLDS = {
  INCREASE_DIFFICULTY_STREAK: 3,
  DECREASE_DIFFICULTY_STREAK: 2,
  MASTERY_THRESHOLD: 0.8,
  MIN_ATTEMPTS_FOR_MASTERY: 5,
};

export const UI_CONFIG = {
  MIN_TAP_TARGET: 80,
  ANIMATION_DURATION: 0.3,
  CELEBRATION_DURATION: 2000,
  HINT_DELAY: 5000,
  AUTO_ADVANCE_DELAY: 1500,
};
