'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import { useGameStore } from '@/lib/store';
import { speakWord, speakFeedback, speakClip } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { HEART_WORDS, REQUIRED_HEART_WORDS, heartWordPrompt } from '@/content/learningIntegrity';

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'pick' | 'won';

export default function HeartWordMap({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(HEART_WORDS.filter((entry) =>
    REQUIRED_HEART_WORDS.includes(entry.word as (typeof REQUIRED_HEART_WORDS)[number]),
  )));
  const { completeGame, addCoins, masterWord, recordSoundAttempt, incrementStreak, resetStreak } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('pick');
    setWrongPick(null);
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'pick' ? heartWordPrompt(current.word) : null,
    [round, phase],
  );

  const finishRound = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'heart-word-map');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((value) => value + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  const choosePart = useCallback((index: number) => {
    if (phase !== 'pick') return;
    if (index === current.heartIndex) {
      setPhase('won');
      masterWord(current.word);
      recordSoundAttempt(current.word, true);
      incrementStreak();
      playSoundEffect('coin');
      (async () => {
        await speakWord(current.word);
        await speakClip('heart-word', 'This word has a part we learn by heart!');
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise((resolve) => setTimeout(resolve, 700));
        finishRound();
      })();
    } else {
      recordSoundAttempt(current.word, false);
      resetStreak();
      playSoundEffect('wrong');
      setWrongPick(index);
      setTimeout(() => setWrongPick(null), 650);
    }
  }, [phase, current, isLast, finishRound, masterWord, recordSoundAttempt, incrementStreak, resetStreak]);

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="💖"
      bgClassName="from-rose-300/60 to-amber-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={130} />
          <p className="text-rose-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'won' ? 'You found the heart part!' : 'Which part do we learn by heart?'}
          </p>
        </div>

        <div className="bg-white/70 rounded-3xl px-7 py-4 shadow-inner text-6xl font-bold font-[Fredoka] text-gray-800 lowercase">
          {current.word}
        </div>

        <div className="flex gap-3 justify-center w-full px-2">
          {current.parts.map((part, index) => {
            const isHeart = index === current.heartIndex;
            const revealHeart = phase === 'won' && isHeart;
            return (
              <motion.button
                key={`${current.word}-${part}-${index}`}
                data-testid="heart-part-choice"
                onClick={() => choosePart(index)}
                disabled={phase !== 'pick'}
                animate={wrongPick === index ? { x: [-8, 8, -8, 8, 0] } : revealHeart ? { scale: [1, 1.15, 1] } : {}}
                whileTap={{ scale: 0.9 }}
                className={`relative min-w-[104px] h-[112px] px-5 rounded-3xl shadow-xl press-3d flex items-center justify-center text-6xl font-bold font-[Fredoka] lowercase transition-colors ${
                  revealHeart
                    ? 'bg-rose-200 text-rose-700 ring-4 ring-rose-400'
                    : phase === 'won'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white text-gray-800'
                }`}
              >
                {part}
                {revealHeart && <span className="absolute -top-5 text-3xl">❤️</span>}
              </motion.button>
            );
          })}
        </div>

        <p className="text-rose-900/75 font-[Fredoka] text-lg text-center px-4 min-h-[28px]">
          {phase === 'won' ? 'The green parts follow their sounds. The heart part is the tricky bit.' : 'Listen to the word, then choose one part.'}
        </p>
      </div>

      <CelebrationOverlay show={showCelebration} message="Heart word hero!" onComplete={onComplete} />
    </GameShell>
  );
}
