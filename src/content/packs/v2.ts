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
  initialSoundGroups: [],
  wordChains: [
    { id: 'continuous:mat-rat', fromWordId: 'continuous-bridge:mat', toWordId: 'continuous-bridge:rat', changedUnitIndex: 0, distractorUnits: [unit('f')] },
    { id: 'continuous:map-mat', fromWordId: 'continuous-bridge:map', toWordId: 'continuous-bridge:mat', changedUnitIndex: 2, distractorUnits: [unit('n')] },
    { id: 'continuous:man-fan', fromWordId: 'continuous-bridge:man', toWordId: 'continuous-bridge:fan', changedUnitIndex: 0, distractorUnits: [unit('r')] },
  ],
  stories: [
    { id: 'continuous:story-map', text: 'The map is on the mat.', pictureWord: 'map', question: 'Where is the map?', correct: 'on the mat', options: ['on the mat', 'in the cup', 'on the hat'], cue: 'self-read-sentence' },
    { id: 'continuous:story-pot', text: 'The pot is hot.', pictureWord: 'pot', question: 'What is hot?', correct: 'the pot', options: ['the pot', 'the cup', 'the hat'], cue: 'self-read-sentence' },
  ],
  postcards: [
    { id: 'continuous:postcard-rat', template: 'It is a ___.', spoken: 'It is a blank.', correct: 'rat', options: ['rat', 'cat', 'bat'], cue: 'picture-only' },
  ],
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
  initialSoundGroups: [],
  wordChains: [
    { id: 'cvc:bug-mug', fromWordId: 'cvc-grid:bug', toWordId: 'cvc-grid:mug', changedUnitIndex: 0, distractorUnits: [unit('d')] },
    { id: 'cvc:rug-pug', fromWordId: 'cvc-grid:rug', toWordId: 'cvc-grid:pug', changedUnitIndex: 0, distractorUnits: [unit('b')] },
    { id: 'cvc:bed-red', fromWordId: 'cvc-grid:bed', toWordId: 'cvc-grid:red', changedUnitIndex: 0, distractorUnits: [unit('f')] },
    { id: 'cvc:cap-cup', fromWordId: 'cvc-grid:cap', toWordId: 'cvc-grid:cup', changedUnitIndex: 1, distractorUnits: [unit('i')] },
    { id: 'cvc:hat-hut', fromWordId: 'cvc-grid:hat', toWordId: 'cvc-grid:hut', changedUnitIndex: 1, distractorUnits: [unit('o')] },
  ],
  stories: [
    { id: 'cvc:story-bug-mug', text: 'The bug is in the mug.', pictureWord: 'bug', question: 'Where is the bug?', correct: 'in the mug', options: ['in the mug', 'on the rug', 'in the cup'], cue: 'self-read-sentence' },
  ],
  postcards: [
    { id: 'cvc:postcard-cup', template: 'It is a red ___.', spoken: 'It is a red blank.', correct: 'cup', options: ['cup', 'cap', 'mug'], cue: 'picture-only' },
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
  initialSoundGroups: [],
  wordChains: [],
  stories: [
    { id: 'longer:story-ship', text: 'The ship is big.', pictureWord: 'ship', question: 'What is big?', correct: 'the ship', options: ['the ship', 'the shop', 'the shed'], cue: 'self-read-sentence' },
    { id: 'longer:story-lamp', text: 'The lamp is in the shed.', pictureWord: 'lamp', question: 'Where is the lamp?', correct: 'in the shed', options: ['in the shed', 'in the shop', 'on the ship'], cue: 'self-read-sentence' },
    { id: 'longer:story-nest', text: 'The hen is in the nest.', pictureWord: 'nest', question: 'Where is the hen?', correct: 'in the nest', options: ['in the nest', 'in the shed', 'on the ship'], cue: 'self-read-sentence' },
  ],
  postcards: [
    { id: 'longer:postcard-ship', template: 'It is a ___.', spoken: 'It is a blank.', correct: 'ship', options: ['ship', 'shop', 'shed'], cue: 'picture-only' },
    { id: 'longer:postcard-shop', template: 'We go to the ___.', spoken: 'We go to the blank.', correct: 'shop', options: ['ship', 'shop', 'shed'], cue: 'picture-only' },
    { id: 'longer:postcard-chop', template: 'We can ___ the log.', spoken: 'We can blank the log.', correct: 'chop', options: ['chop', 'shop', 'ship'], cue: 'picture-only' },
    { id: 'longer:postcard-tent', template: 'It is a ___.', spoken: 'It is a blank.', correct: 'tent', options: ['tent', 'nest', 'shed'], cue: 'picture-only' },
  ],
};
