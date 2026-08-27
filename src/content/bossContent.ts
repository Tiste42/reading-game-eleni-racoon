export interface World1BossChallenge {
  type: 'picture-match';
  prompt: string;
  icon: string;
  correct: string;
  options: string[];
  phonemeId?: string;
}

export const WORLD_1_BOSS_CHALLENGES: World1BossChallenge[] = [
  { type: 'picture-match', prompt: 'Which one rhymes with cat?', icon: '🐱', correct: 'hat', options: ['hat', 'dog', 'cup'] },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'sun', options: ['sun', 'cat', 'pen'], phonemeId: 's' },
  { type: 'picture-match', prompt: 'Which one rhymes with log?', icon: '🪵', correct: 'dog', options: ['hat', 'dog', 'cup'] },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'moon', options: ['cat', 'moon', 'fan'], phonemeId: 'm' },
  { type: 'picture-match', prompt: 'Clap the beats: "banana" has...', icon: '🍌', correct: '3', options: ['1', '2', '3'] },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'ball', options: ['ball', 'cat', 'sun'], phonemeId: 'b' },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'penguin', options: ['sun', 'penguin', 'hat'], phonemeId: 'p' },
  { type: 'picture-match', prompt: 'Which one rhymes with net?', icon: '', correct: 'jet', options: ['cup', 'jet', 'hat'] },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'fish', options: ['fish', 'dog', 'sun'], phonemeId: 'f' },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'tiger', options: ['tiger', 'moon', 'fish'], phonemeId: 't' },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'nest', options: ['nest', 'cat', 'fish'], phonemeId: 'n' },
  { type: 'picture-match', prompt: 'Which picture starts with this sound?', icon: '', correct: 'apple', options: ['apple', 'dog', 'sun'], phonemeId: 'a' },
];
