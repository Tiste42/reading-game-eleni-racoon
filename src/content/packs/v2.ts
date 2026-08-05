import type { ContentPack, ContentWord, GraphemeUnit } from '../types';

const unit = (text: string, phonemeId = text): GraphemeUnit => ({ text, phonemeId });
const word = (
  pack: string,
  text: string,
  units: GraphemeUnit[],
  uses: ContentWord['activities'] = [],
): ContentWord => ({
  id: `${pack}:${text}`,
  text,
  units,
  picturePath: `/images/generated/items/${text}.png`,
  audioPath: `/audio/words/${text}.mp3`,
  activities: uses,
});

export const CONTINUOUS_BRIDGE_PACK: ContentPack = {
  id: 'continuous-bridge',
  name: 'Stretchy Sounds',
  description: 'Adds m, f, r, and short o to word swaps and later reading.',
  focus: 'm, f, r, short o',
  optional: true,
  requiredPackIds: [],
  prerequisitePhonemes: ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l'],
  introducedPhonemes: ['m', 'f', 'r', 'o'],
  words: [
    word('continuous-bridge', 'map', [unit('m'), unit('a'), unit('p')], ['word-chain']),
    word('continuous-bridge', 'mat', [unit('m'), unit('a'), unit('t')], ['word-chain']),
    word('continuous-bridge', 'man', [unit('m'), unit('a'), unit('n')], ['word-chain']),
    word('continuous-bridge', 'fan', [unit('f'), unit('a'), unit('n')], ['word-chain']),
    word('continuous-bridge', 'rat', [unit('r'), unit('a'), unit('t')], ['word-chain']),
    word('continuous-bridge', 'pot', [unit('p'), unit('o'), unit('t')]),
  ],
  letterExamples: [],
  initialSoundGroups: [],
  rhymeFamilies: [],
  syllableWords: [],
  wordChains: [],
  stories: [
    { id: 'continuous:story-map', text: 'The map is in the cup.', pictureWord: 'cup', question: 'Where is the map?', correct: 'cup', options: ['cup', 'hat', 'bed'], cue: 'self-read-sentence' },
    { id: 'continuous:story-pot', text: 'The pot is hot.', pictureWord: 'pot', question: 'What is hot?', correct: 'pot', options: ['pot', 'cup', 'hat'], cue: 'self-read-sentence' },
  ],
  postcards: [],
};

export const CVC_GRID_PACK: ContentPack = {
  id: 'cvc-grid',
  name: 'New CVC Grid',
  description: 'Adds concrete CVC word swaps after the blending worlds.',
  focus: 'b, d, h, g, u, hard c',
  optional: true,
  requiredPackIds: ['continuous-bridge'],
  prerequisitePhonemes: ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l', 'm', 'f', 'r', 'o'],
  introducedPhonemes: ['b', 'd', 'h', 'g', 'u', 'c'],
  words: [
    ...[
      ['bug', ['b', 'u', 'g']], ['mug', ['m', 'u', 'g']],
      ['rug', ['r', 'u', 'g']], ['pug', ['p', 'u', 'g']],
      ['bed', ['b', 'e', 'd']], ['cap', ['c', 'a', 'p']],
      ['cup', ['c', 'u', 'p']], ['hat', ['h', 'a', 't']], ['hut', ['h', 'u', 't']],
    ].map(([text, letters]) => word('cvc-grid', text as string, (letters as string[]).map((letter) => unit(letter, letter === 'c' ? 'c' : letter)), ['word-chain'])),
    word('cvc-grid', 'red', [unit('r'), unit('e'), unit('d')], ['word-chain']),
  ],
  letterExamples: [],
  initialSoundGroups: [],
  rhymeFamilies: [],
  syllableWords: [],
  wordChains: [
    { id: 'cvc:bug-mug', fromWordId: 'cvc-grid:bug', toWordId: 'cvc-grid:mug', changedUnitIndex: 0, distractorUnits: [unit('d')] },
    { id: 'cvc:cap-cup', fromWordId: 'cvc-grid:cap', toWordId: 'cvc-grid:cup', changedUnitIndex: 1, distractorUnits: [unit('i')] },
    { id: 'cvc:hat-hut', fromWordId: 'cvc-grid:hat', toWordId: 'cvc-grid:hut', changedUnitIndex: 1, distractorUnits: [unit('o')] },
  ],
  stories: [
    { id: 'cvc:story-bug-mug', text: 'The bug is in the mug.', pictureWord: 'mug', question: 'Where is the bug?', correct: 'mug', options: ['mug', 'rug', 'hat'], cue: 'self-read-sentence' },
  ],
  postcards: [
    { id: 'cvc:postcard-cup', template: 'The ___ is red.', spoken: 'The blank is red.', correct: 'cup', options: ['cup', 'cap', 'mug'], cue: 'picture-only' },
  ],
};

export const LONGER_WORDS_PACK: ContentPack = {
  id: 'longer-words',
  name: 'Longer Word Challenge',
  description: 'Adds sh, ch, and four-sound words to connected reading.',
  focus: 'sh, ch, four sounds',
  optional: true,
  requiredPackIds: ['continuous-bridge', 'cvc-grid'],
  prerequisitePhonemes: ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l', 'm', 'f', 'r', 'o', 'b', 'd', 'h', 'g', 'u', 'c'],
  introducedPhonemes: ['sh', 'ch'],
  words: [
    word('longer-words', 'ship', [unit('sh'), unit('i'), unit('p')]),
    word('longer-words', 'shop', [unit('sh'), unit('o'), unit('p')]),
    word('longer-words', 'shed', [unit('sh'), unit('e'), unit('d')]),
    word('longer-words', 'chop', [unit('ch'), unit('o'), unit('p')]),
    word('longer-words', 'lamp', [unit('l'), unit('a'), unit('m'), unit('p')]),
    word('longer-words', 'nest', [unit('n'), unit('e'), unit('s'), unit('t')]),
    word('longer-words', 'tent', [unit('t'), unit('e'), unit('n'), unit('t')]),
  ],
  letterExamples: [],
  initialSoundGroups: [],
  rhymeFamilies: [],
  syllableWords: [],
  wordChains: [],
  stories: [
    { id: 'longer:story-ship', text: 'The ship is big.', pictureWord: 'ship', question: 'What is big?', correct: 'ship', options: ['ship', 'cat', 'dog'], cue: 'self-read-sentence' },
    { id: 'longer:story-nest', text: 'The hen is in the nest.', pictureWord: 'nest', question: 'Where is the hen?', correct: 'nest', options: ['nest', 'hat', 'ship'], cue: 'self-read-sentence' },
  ],
  postcards: [
    { id: 'longer:postcard-ship', template: 'The ___ is big.', spoken: 'The blank is big.', correct: 'ship', options: ['ship', 'shop', 'shed'], cue: 'picture-only' },
    { id: 'longer:postcard-shop', template: 'She is at the ___.', spoken: 'She is at the blank.', correct: 'shop', options: ['ship', 'shop', 'shed'], cue: 'picture-only' },
    { id: 'longer:postcard-tent', template: 'The ___ is big.', spoken: 'The blank is big.', correct: 'tent', options: ['tent', 'nest', 'shed'], cue: 'picture-only' },
  ],
};
