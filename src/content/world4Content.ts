import { canSharePictureChoices } from './pictureConflicts';
import { hasChildIdentifiablePicture } from './pictureQuality';
import { isTextDecodable } from './progression';

export interface World4PictureRound {
  word: string;
  distractors: string[];
}

export interface World4FamilyRound {
  pattern: string;
  member: string;
  outsiders: string[];
}

export interface World4DoorRound {
  target: string;
  doors: string[];
}

// The six foundation-only rounds keep World 4 playable for a new profile.
// Later rows join the pool only after Letter Intro has explicitly taught all
// of their sounds. Every picture has passed the blind audit.
export const WORLD_4_PICTURE_ROUNDS: World4PictureRound[] = [
  { word: 'pan', distractors: ['pen', 'pin'] },
  { word: 'pen', distractors: ['pan', 'pin'] },
  { word: 'pin', distractors: ['pen', 'pan'] },
  { word: 'ten', distractors: ['pen', 'net'] },
  { word: 'net', distractors: ['ten', 'pen'] },
  { word: 'lip', distractors: ['net', 'pan'] },
  { word: 'cat', distractors: ['hat', 'bat'] },
  { word: 'dog', distractors: ['log', 'cat'] },
  { word: 'bug', distractors: ['rug', 'mug'] },
  { word: 'hen', distractors: ['pen', 'ten'] },
  { word: 'pot', distractors: ['cup', 'hat'] },
  { word: 'bed', distractors: ['bug', 'hat'] },
  { word: 'van', distractors: ['fan', 'jet'] },
  { word: 'jet', distractors: ['net', 'hen'] },
  { word: 'ant', distractors: ['cup', 'hat'] },
];

export const WORLD_4_FAMILY_ROUNDS: World4FamilyRound[] = [
  { pattern: '-an', member: 'pan', outsiders: ['pen', 'pin'] },
  { pattern: '-en', member: 'pen', outsiders: ['pan', 'pin'] },
  { pattern: '-in', member: 'pin', outsiders: ['pan', 'pen'] },
  { pattern: '-en', member: 'ten', outsiders: ['pan', 'pin'] },
  { pattern: '-et', member: 'net', outsiders: ['pan', 'pin'] },
  { pattern: '-ip', member: 'lip', outsiders: ['pan', 'net'] },
  { pattern: '-at', member: 'cat', outsiders: ['dog', 'pen'] },
  { pattern: '-at', member: 'hat', outsiders: ['bug', 'net'] },
  { pattern: '-an', member: 'van', outsiders: ['hen', 'log'] },
  { pattern: '-og', member: 'dog', outsiders: ['fan', 'bed'] },
  { pattern: '-og', member: 'log', outsiders: ['fan', 'bed'] },
  { pattern: '-ug', member: 'bug', outsiders: ['hat', 'jet'] },
  { pattern: '-ug', member: 'mug', outsiders: ['jet', 'van'] },
];

export const WORLD_4_DOOR_ROUNDS: World4DoorRound[] = [
  { target: 'pan', doors: ['pan', 'pen', 'pin'] },
  { target: 'pen', doors: ['pen', 'pan', 'pin'] },
  { target: 'pin', doors: ['pin', 'pan', 'pen'] },
  { target: 'ten', doors: ['ten', 'pen', 'net'] },
  { target: 'net', doors: ['net', 'ten', 'pen'] },
  { target: 'lip', doors: ['lip', 'net', 'pan'] },
  { target: 'cat', doors: ['cat', 'hat', 'bat'] },
  { target: 'dog', doors: ['dog', 'log', 'cat'] },
  { target: 'bug', doors: ['bug', 'rug', 'mug'] },
  { target: 'hen', doors: ['hen', 'pen', 'ten'] },
  { target: 'bed', doors: ['bed', 'bug', 'hat'] },
  { target: 'van', doors: ['van', 'fan', 'jet'] },
];

const allWords = (round: { word?: string; distractors?: string[]; member?: string; outsiders?: string[]; target?: string; doors?: string[] }) => [
  round.word || round.member || round.target || '',
  ...(round.distractors || round.outsiders || round.doors || []),
].filter(Boolean);

export function isWorld4RoundDecodable(
  round: World4PictureRound | World4FamilyRound | World4DoorRound,
  allowedPhonemes: ReadonlySet<string>,
): boolean {
  return allWords(round).every((word) => isTextDecodable(word, allowedPhonemes));
}

export function isWorld4PictureRoundSafe(round: World4PictureRound): boolean {
  const words = allWords(round);
  return words.every(hasChildIdentifiablePicture) && words.every((word, index) =>
    words.slice(index + 1).every((other) => canSharePictureChoices(word, other)),
  );
}
