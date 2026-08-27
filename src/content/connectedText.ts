export interface PictureComprehensionRound {
  sentence: string;
  question: string;
  correct: string;
  options: string[];
}

export interface IconComprehensionOption {
  label: string;
  icon: string;
}

export interface IconComprehensionRound {
  sentence: string;
  question: string;
  correct: string;
  options: IconComprehensionOption[];
}

export interface BossSentenceRound {
  prompt: string;
  question: string;
  correct: string;
  options: string[];
}

export const CONNECTED_COMPREHENSION_ROUNDS: PictureComprehensionRound[] = [
  { sentence: 'The cat sat on the mat.', question: 'Who sat on the mat?', correct: 'cat', options: ['cat', 'dog', 'bug'] },
  { sentence: 'The dog ran to the cat.', question: 'Who ran?', correct: 'dog', options: ['dog', 'cat', 'bus'] },
  { sentence: 'The bug sat on the log.', question: 'What did the bug sit on?', correct: 'log', options: ['log', 'bug', 'bed'] },
  { sentence: 'He got the red hat.', question: 'What did he get?', correct: 'hat', options: ['hat', 'cup', 'net'] },
  { sentence: 'The bug is in the pot.', question: 'What is in the pot?', correct: 'bug', options: ['bug', 'pot', 'fish'] },
  { sentence: 'The pig sat in the van.', question: 'Who sat in the van?', correct: 'pig', options: ['pig', 'van', 'hen'] },
  { sentence: 'Sam sat on the bed.', question: 'What did Sam sit on?', correct: 'bed', options: ['bed', 'cat', 'hat'] },
  { sentence: 'The cat is big.', question: 'What is big?', correct: 'cat', options: ['cat', 'dog', 'bug'] },
  { sentence: 'The fish is in the net.', question: 'Where is the fish?', correct: 'net', options: ['net', 'bed', 'cup'] },
  { sentence: 'He got the pet dog.', question: 'What pet did he get?', correct: 'dog', options: ['dog', 'cat', 'fish'] },
  { sentence: 'The hen is in the nest.', question: 'Where is the hen?', correct: 'nest', options: ['nest', 'hat', 'ship'] },
  { sentence: 'The pot is hot.', question: 'What is hot?', correct: 'pot', options: ['pot', 'cup', 'hat'] },
];

export const MANATEE_COMPREHENSION_ROUNDS: PictureComprehensionRound[] = [
  { sentence: 'The big net is on the fin.', question: 'What is on the fin?', correct: 'net', options: ['net', 'hat', 'cup'] },
  { sentence: 'The log is in the path.', question: 'What is in the path?', correct: 'log', options: ['log', 'cup', 'hat'] },
  { sentence: 'The cup is in the pond.', question: 'What is in the pond?', correct: 'cup', options: ['cup', 'log', 'net'] },
  { sentence: 'The can is on the sand.', question: 'What is on the sand?', correct: 'can', options: ['can', 'cup', 'hat'] },
  { sentence: 'The fish is in the net.', question: 'Who is in the net?', correct: 'fish', options: ['fish', 'cat', 'dog'] },
  { sentence: 'The hat is on the fin.', question: 'What is on the fin?', correct: 'hat', options: ['hat', 'net', 'cup'] },
  { sentence: 'The cup is in the path.', question: 'What is in the path?', correct: 'cup', options: ['cup', 'log', 'hat'] },
  { sentence: 'The log is in the pond.', question: 'What is in the pond?', correct: 'log', options: ['log', 'cup', 'net'] },
  { sentence: 'The net is on the sand.', question: 'What is on the sand?', correct: 'net', options: ['net', 'can', 'hat'] },
  { sentence: 'The cat is in the net.', question: 'Who is in the net?', correct: 'cat', options: ['cat', 'fish', 'dog'] },
];

export const BEACH_COMPREHENSION_ROUNDS: IconComprehensionRound[] = [
  {
    sentence: 'The red hat is on the sand.',
    question: 'What color is the hat?',
    correct: 'red',
    options: [{ label: 'red', icon: '🔴' }, { label: 'blue', icon: '🔵' }, { label: 'green', icon: '🟢' }],
  },
  {
    sentence: 'The big net is on the log.',
    question: 'What is on the log?',
    correct: 'a net',
    options: [{ label: 'a net', icon: '🥅' }, { label: 'a hat', icon: '🧢' }, { label: 'a cup', icon: '🥤' }],
  },
  {
    sentence: 'The man got the net.',
    question: 'Who got the net?',
    correct: 'a man',
    options: [{ label: 'a man', icon: '👨' }, { label: 'a dog', icon: '🐶' }, { label: 'a cat', icon: '🐱' }],
  },
  {
    sentence: 'The dog is on the sand.',
    question: 'Where is the dog?',
    correct: 'on the sand',
    options: [{ label: 'on the sand', icon: '🏖️' }, { label: 'on a bed', icon: '🛏️' }, { label: 'on the ship', icon: '🚢' }],
  },
  {
    sentence: 'The net is on the ship.',
    question: 'What is on the ship?',
    correct: 'a net',
    options: [{ label: 'a net', icon: '🥅' }, { label: 'a hat', icon: '🧢' }, { label: 'a cup', icon: '🥤' }],
  },
  {
    sentence: 'The cup is on the log.',
    question: 'What is on the log?',
    correct: 'a cup',
    options: [{ label: 'a cup', icon: '🥤' }, { label: 'a net', icon: '🥅' }, { label: 'a hat', icon: '🧢' }],
  },
  {
    sentence: 'The dog got the net.',
    question: 'Who got the net?',
    correct: 'a dog',
    options: [{ label: 'a dog', icon: '🐶' }, { label: 'a man', icon: '👨' }, { label: 'a cat', icon: '🐱' }],
  },
  {
    sentence: 'The dog is on the ship.',
    question: 'Where is the dog?',
    correct: 'on the ship',
    options: [{ label: 'on the ship', icon: '🚢' }, { label: 'on the sand', icon: '🏖️' }, { label: 'on a bed', icon: '🛏️' }],
  },
  {
    sentence: 'The cup is on the ship.',
    question: 'What is on the ship?',
    correct: 'a cup',
    options: [{ label: 'a cup', icon: '🥤' }, { label: 'a net', icon: '🥅' }, { label: 'a hat', icon: '🧢' }],
  },
  {
    sentence: 'The cat got the net.',
    question: 'Who got the net?',
    correct: 'a cat',
    options: [{ label: 'a cat', icon: '🐱' }, { label: 'a dog', icon: '🐶' }, { label: 'a man', icon: '👨' }],
  },
];

export const WORLD_5_BOSS_SENTENCES: BossSentenceRound[] = [
  { prompt: 'The ship is big.', question: 'What is big?', correct: 'ship', options: ['ship', 'cat', 'dog'] },
  { prompt: 'She said it to the cat.', question: 'Who heard it?', correct: 'cat', options: ['cat', 'dog', 'fish'] },
  { prompt: 'He is sad in the van.', question: 'Where is he?', correct: 'van', options: ['van', 'ship', 'bed'] },
  { prompt: 'The thin cat is on the bed.', question: 'Who is on the bed?', correct: 'cat', options: ['cat', 'dog', 'bug'] },
  { prompt: 'She is at the shop.', question: 'Where is she?', correct: 'shop', options: ['shop', 'ship', 'tent'] },
  { prompt: 'The dog is on the ship.', question: 'Who is on the ship?', correct: 'dog', options: ['dog', 'cat', 'fish'] },
  { prompt: 'The fish is in the net.', question: 'Where is the fish?', correct: 'net', options: ['net', 'bed', 'cup'] },
  { prompt: 'The hen is in the nest.', question: 'Where is the hen?', correct: 'nest', options: ['nest', 'hat', 'ship'] },
  { prompt: 'The pot is hot.', question: 'What is hot?', correct: 'pot', options: ['pot', 'cup', 'hat'] },
  { prompt: 'The bug is on the log.', question: 'Where is the bug?', correct: 'log', options: ['log', 'cup', 'hat'] },
];

export const WORLD_6_BOSS_SENTENCES: BossSentenceRound[] = [
  { prompt: 'Sam sat on the bed.', question: 'What did Sam sit on?', correct: 'bed', options: ['bed', 'cat', 'hat'] },
  { prompt: 'The cat is big.', question: 'What is big?', correct: 'cat', options: ['cat', 'dog', 'bug'] },
  { prompt: 'The bug is on the log.', question: 'Where is the bug?', correct: 'log', options: ['log', 'cup', 'hat'] },
  { prompt: 'He got the red hat.', question: 'What did he get?', correct: 'hat', options: ['hat', 'cup', 'net'] },
  { prompt: 'The fish is in the net.', question: 'Where is the fish?', correct: 'net', options: ['net', 'bed', 'cup'] },
  { prompt: 'He got the pet dog.', question: 'What pet did he get?', correct: 'dog', options: ['dog', 'cat', 'fish'] },
  { prompt: 'The hen is in the nest.', question: 'Where is the hen?', correct: 'nest', options: ['nest', 'hat', 'ship'] },
  { prompt: 'The pot is hot.', question: 'What is hot?', correct: 'pot', options: ['pot', 'cup', 'hat'] },
  { prompt: 'The pig sat in the van.', question: 'Who sat in the van?', correct: 'pig', options: ['pig', 'van', 'hen'] },
  { prompt: 'The dog ran to the cat.', question: 'Who ran?', correct: 'dog', options: ['dog', 'cat', 'bus'] },
];

const DECODABLE_LEXICON: Record<string, string[]> = {
  ant: ['a', 'n', 't'], at: ['a', 't'], bat: ['b', 'a', 't'], bed: ['b', 'e', 'd'], big: ['b', 'i', 'g'],
  bug: ['b', 'u', 'g'], bus: ['b', 'u', 's'], can: ['c', 'a', 'n'], cap: ['c', 'a', 'p'], cat: ['c', 'a', 't'],
  cup: ['c', 'u', 'p'], dog: ['d', 'o', 'g'], fin: ['f', 'i', 'n'], fish: ['f', 'i', 'sh'],
  got: ['g', 'o', 't'], hat: ['h', 'a', 't'], hen: ['h', 'e', 'n'], hot: ['h', 'o', 't'],
  in: ['i', 'n'], it: ['i', 't'], jet: ['j', 'e', 't'], lamp: ['l', 'a', 'm', 'p'],
  lip: ['l', 'i', 'p'], log: ['l', 'o', 'g'], man: ['m', 'a', 'n'], map: ['m', 'a', 'p'],
  mat: ['m', 'a', 't'], mug: ['m', 'u', 'g'], nest: ['n', 'e', 's', 't'], net: ['n', 'e', 't'],
  no: ['n', 'o'], on: ['o', 'n'], pan: ['p', 'a', 'n'], path: ['p', 'a', 'th'],
  pen: ['p', 'e', 'n'], pet: ['p', 'e', 't'], pig: ['p', 'i', 'g'], pin: ['p', 'i', 'n'],
  pond: ['p', 'o', 'n', 'd'], pot: ['p', 'o', 't'], ran: ['r', 'a', 'n'], red: ['r', 'e', 'd'],
  rug: ['r', 'u', 'g'], sad: ['s', 'a', 'd'], sam: ['s', 'a', 'm'], sand: ['s', 'a', 'n', 'd'],
  sat: ['s', 'a', 't'], shed: ['sh', 'e', 'd'], ship: ['sh', 'i', 'p'], shop: ['sh', 'o', 'p'], ten: ['t', 'e', 'n'],
  tent: ['t', 'e', 'n', 't'], thin: ['th', 'i', 'n'], to: ['t', 'o'], van: ['v', 'a', 'n'],
};

const tokenize = (text: string) => text.toLowerCase().match(/[a-z]+/g) || [];

export function analyzeChildReadableText(
  text: string,
  taughtPhonemes: ReadonlySet<string>,
  masteredHeartWords: ReadonlySet<string>,
): string[] {
  return tokenize(text).filter((token) => {
    if (masteredHeartWords.has(token)) return false;
    const units = DECODABLE_LEXICON[token];
    return !units || units.some((unit) => !taughtPhonemes.has(unit));
  });
}
