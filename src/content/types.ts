export type ContentPackId = 'core' | 'continuous-bridge' | 'cvc-grid' | 'longer-words';

export type ContentActivity =
  | 'initial-sound'
  | 'letter-match'
  | 'blend-to-picture'
  | 'picture-to-build'
  | 'word-chain';

export interface GraphemeUnit {
  text: string;
  phonemeId: string;
}

export interface ContentWord {
  id: string;
  text: string;
  units: GraphemeUnit[];
  picturePath: string;
  audioPath: string;
  activities: ContentActivity[];
}

export interface InitialSoundGroup {
  id: string;
  letter: string;
  phonemeId: string;
  wordIds: string[];
}

export interface WordChain {
  id: string;
  fromWordId: string;
  toWordId: string;
  changedUnitIndex: number;
  distractorUnits: GraphemeUnit[];
}

export interface StoryRound {
  id: string;
  text: string;
  pictureWord: string;
  question: string;
  correct: string;
  options: string[];
  cue: 'self-read-sentence';
}

export interface PostcardRound {
  id: string;
  template: string;
  spoken: string;
  correct: string;
  options: string[];
  cue: 'picture-only';
}

export interface ContentPack {
  id: ContentPackId;
  name: string;
  description: string;
  focus: string;
  optional: boolean;
  requiredPackIds: ContentPackId[];
  prerequisitePhonemes: string[];
  introducedPhonemes: string[];
  words: ContentWord[];
  initialSoundGroups: InitialSoundGroup[];
  wordChains: WordChain[];
  stories: StoryRound[];
  postcards: PostcardRound[];
}
