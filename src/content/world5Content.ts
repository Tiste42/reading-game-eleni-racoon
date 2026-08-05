export interface DecoderRound {
  word: string;
  units: string[];
  distractors: string[];
}

// Pure authored data so the build-time validator checks every decoder picture,
// distractor, grapheme unit, and static audio dependency.
export const WORLD_5_DECODER_ROUNDS: DecoderRound[] = [
  { word: 'ship', units: ['sh', 'i', 'p'], distractors: ['shop', 'fish'] },
  { word: 'shop', units: ['sh', 'o', 'p'], distractors: ['ship', 'fish'] },
  { word: 'fish', units: ['f', 'i', 'sh'], distractors: ['ship', 'shop'] },
];
