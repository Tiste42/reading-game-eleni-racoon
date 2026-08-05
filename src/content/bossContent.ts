export interface World1BossChallenge {
  type: 'picture-match';
  prompt: string;
  icon: string;
  correct: string;
  options: string[];
}

export const WORLD_1_BOSS_CHALLENGES: World1BossChallenge[] = [
  { type: 'picture-match', prompt: 'Which one rhymes with cat?', icon: '🐱', correct: 'hat', options: ['hat', 'dog', 'cup'] },
  { type: 'picture-match', prompt: 'Which starts with "s"?', icon: '', correct: 'sun', options: ['sun', 'cat', 'pen'] },
  { type: 'picture-match', prompt: 'Which one rhymes with log?', icon: '🪵', correct: 'dog', options: ['hat', 'dog', 'cup'] },
  { type: 'picture-match', prompt: 'Which starts with "m"?', icon: '', correct: 'moon', options: ['cat', 'moon', 'fan'] },
  { type: 'picture-match', prompt: 'Clap the beats: "banana" has...', icon: '🍌', correct: '3', options: ['1', '2', '3'] },
  { type: 'picture-match', prompt: 'Which doesn\'t start with "b"?', icon: '🔍', correct: 'cat', options: ['bat', 'bug', 'cat'] },
  { type: 'picture-match', prompt: 'Which starts with "p"?', icon: '', correct: 'penguin', options: ['sun', 'penguin', 'hat'] },
  { type: 'picture-match', prompt: 'Which one rhymes with net?', icon: '', correct: 'jet', options: ['cup', 'jet', 'hat'] },
];
