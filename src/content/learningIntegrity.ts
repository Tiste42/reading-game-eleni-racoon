/** Shared, pure contracts for child-facing learning integrity. */

export const AUTOMATIC_ANSWER_REVEALS_ENABLED = false;

export function canAutomaticallyRevealAnswer(attempts: number, maxAttempts: number): boolean {
  return AUTOMATIC_ANSWER_REVEALS_ENABLED && attempts >= maxAttempts;
}

export interface HeartWord {
  word: string;
  parts: string[];
  heartIndex: number;
}

export const REQUIRED_HEART_WORDS = ['the', 'was', 'said', 'is', 'to', 'he', 'she'] as const;
// "th" has two distinct sounds. Both must be explicitly practiced before
// connected text treats the grapheme as taught.
export const REQUIRED_DIGRAPHS = ['sh', 'ch', 'th', 'th-voiced'] as const;

export const HEART_WORDS: HeartWord[] = [
  { word: 'the', parts: ['th', 'e'], heartIndex: 1 },
  { word: 'was', parts: ['w', 'as'], heartIndex: 1 },
  { word: 'said', parts: ['s', 'ai', 'd'], heartIndex: 1 },
  { word: 'is', parts: ['i', 's'], heartIndex: 1 },
  { word: 'to', parts: ['t', 'o'], heartIndex: 1 },
  { word: 'he', parts: ['h', 'e'], heartIndex: 1 },
  { word: 'she', parts: ['sh', 'e'], heartIndex: 1 },
];

export function heartWordPrompt(word: string): string {
  return `The heart word is ${word}. Tap the part we learn by heart!`;
}

export interface MemoryCard {
  id: string;
  word: string;
  kind: 'print' | 'audio';
}

export function buildPrintAudioCards(words: string[]): MemoryCard[] {
  return words.flatMap((word) => [
    { id: `${word}:print`, word, kind: 'print' as const },
    { id: `${word}:audio`, word, kind: 'audio' as const },
  ]);
}

export const REQUIRED_GAMEPLAY_NARRATION = [
  'Match each printed word to its sound!',
  ...HEART_WORDS.map((entry) => heartWordPrompt(entry.word)),
];
