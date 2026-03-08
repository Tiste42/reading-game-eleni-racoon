/**
 * Centralized word-to-icon mapping for all games.
 * Every game component should use getIcon() instead of hardcoding emoji.
 *
 * Design rules for a 4-year-old:
 * - Each word MUST have a unique icon (no two words share the same emoji)
 * - Icons must be immediately recognizable without text
 * - Prefer concrete objects over abstract symbols
 * - Avoid emoji that look like game UI (✅ looks like "correct" feedback)
 */

const WORD_ICONS: Record<string, string> = {
  // --- SATPIN CVC words (Worlds 2-3) ---
  sat: '🪑',   // chair (sat down)
  sit: '💺',   // seat (sitting)
  pat: '👋',   // hand (gentle pat)
  tap: '🚰',   // faucet/tap
  tip: '👆',   // fingertip (pointing up)
  pit: '🕳️',  // hole/pit
  pin: '📌',   // pushpin
  pan: '🍳',   // frying pan
  nap: '😴',   // sleeping face (NOT 💤 zzz — too abstract for kids)
  nip: '🦀',   // crab (crabs nip! — NOT ❄️ snowflake)
  tan: '☀️',   // sun (getting a tan)
  tin: '🥫',   // tin can
  sip: '🥤',   // cup with straw
  ten: '🔟',   // number 10
  net: '🥅',   // goal net
  let: '🚪',   // door (let someone in — NOT ✅ which looks like correct feedback)
  pen: '🖊️',  // pen
  pet: '🐾',   // paw prints (petting — NOT 🐶 which is same as dog/pup)
  set: '🍽️',  // place setting (set the table — NOT ✅)
  lip: '👄',   // lips/mouth

  // --- -at family (World 4) ---
  cat: '🐱',   // cat face
  hat: '🧢',   // cap/hat
  mat: '🏖️',  // mat/blanket
  bat: '🦇',   // bat (animal)
  rat: '🐀',   // rat
  fat: '🍔',   // hamburger (fat/full)

  // --- -an family (World 4) ---
  can: '🫙',   // jar/can
  man: '👨',   // man
  van: '🚐',   // van
  ran: '🏃',   // running
  fan: '🌬️',  // wind/fan

  // --- -in family (World 4) ---
  fin: '🐠',   // tropical fish (visible fins — NOT 🦈 whole shark)
  bin: '🗑️',  // trash bin
  win: '🏆',   // trophy
  din: '🔔',   // bell (loud noise)

  // --- -og family (World 4) ---
  dog: '🐕',   // full dog (different from 🐶 puppy face)
  log: '🪵',   // log
  fog: '🌫️',  // fog
  hog: '🐗',   // wild boar/hog
  jog: '🏃‍♂️', // jogging
  cog: '⚙️',  // gear/cog

  // --- -ug family (World 4) ---
  bug: '🐛',   // caterpillar/bug
  rug: '🧶',   // yarn (textile/rug)
  mug: '🍵',   // tea cup (different from ☕ for cup)
  hug: '🤗',   // hugging face
  dug: '⛏️',  // pickaxe (digging)
  jug: '🫗',   // pouring (jug)
  pug: '🐶',   // puppy face

  // --- Other CVC (World 4) ---
  cup: '☕',    // coffee cup
  hot: '🔥',   // fire
  pot: '🍲',   // pot of food
  dot: '⚫',   // black circle
  cot: '🛏️',  // small bed
  bed: '🛌',   // person in bed (different from 🛏️ cot)
  red: '🔴',   // red circle
  fed: '🥄',   // spoon (feeding — NOT 🍽️ which is now "set")
  hen: '🐔',   // chicken
  den: '🐻',   // bear (bear's den)
  men: '👥',   // people
  wet: '💧',   // water droplet
  jet: '✈️',   // airplane
  pup: '🐶',   // puppy face
  cut: '✂️',   // scissors
  hut: '🛖',   // hut
  run: '🏃',   // running
  cap: '🧢',   // cap

  // --- Digraph words (World 5) ---
  ship: '🚢',  // ship
  shop: '🏪',  // store
  shin: '🦵',  // leg/shin
  shed: '🏚️', // old house/shed (NOT 🏠 generic house)
  chip: '🍟',  // french fry/chip
  chop: '🪓',  // axe (chopping)
  chin: '😊',  // smiling face (shows chin)
  chat: '💬',  // speech bubble
  thin: '📏',  // ruler (thin/straight)
  this: '👉',  // pointing right
  that: '👈',  // pointing left
  then: '➡️',  // arrow
  them: '👥',  // people
  with: '🤝',  // handshake

  // --- World 1-2 vocabulary ---
  snake: '🐍',
  apple: '🍎',
  tiger: '🐯',
  penguin: '🐧',
  iguana: '🦎',
  nut: '🥜',
  egg: '🥚',
  lemon: '🍋',
  tent: '⛺',
  insect: '🐜',
  igloo: '🏔️',  // snowy mountain (NOT 🏠 generic house)
  lion: '🦁',
  sun: '☀️',
  moon: '🌕',   // full moon (NOT 🌙 crescent — less recognizable)
  banana: '🍌',
  soap: '🧼',
  ball: '⚽',
  bird: '🐦',
  fish: '🐟',
  bus: '🚌',
  sock: '🧦',
  mouse: '🐭',
  milk: '🥛',
  tree: '🌳',
  top: '🔝',
  leg: '🦵',
  rain: '🌧️',
  star: '⭐',
  map: '🗺️',
  turtle: '🐢',
  pig: '🐷',
  nest: '🪹',
  elephant: '🐘',
  car: '🚗',
  fox: '🦊',
  lamp: '💡',
  elf: '🧝',
  ink: '✒️',   // fountain pen (NOT 🪷 lotus which makes no sense)
  monkey: '🐒',
  rabbit: '🐰',
  tomato: '🍅',
  butterfly: '🦋',
  dinosaur: '🦕',
  watermelon: '🍉',

  // --- Color words ---
  blue: '🔵',
  green: '🟢',
  yellow: '🟡',

  // --- Feeling/descriptor words ---
  happy: '😊',
  sad: '😢',
  fast: '💨',
  mad: '😠',
  big: '🐘',
  small: '🐜',
  cold: '🥶',
};

/**
 * Get the icon emoji for a word. Returns ❓ if no icon is mapped.
 */
export function getIcon(word: string): string {
  return WORD_ICONS[word.toLowerCase()] || '❓';
}

export default WORD_ICONS;
