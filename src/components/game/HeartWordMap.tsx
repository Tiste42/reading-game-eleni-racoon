'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakClip } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

interface HeartWord {
  word: string;
  heartLetters: number[]; // indexes learned "by heart"; the rest are decodable
}

// Per-word "The heart word is X" lines are recorded for all of these
const HEART_WORDS: HeartWord[] = [
  { word: 'the', heartLetters: [0, 1] },
  { word: 'was', heartLetters: [0, 1] },
  { word: 'said', heartLetters: [1, 2] },
  { word: 'is', heartLetters: [] },
  { word: 'to', heartLetters: [1] },
  { word: 'he', heartLetters: [1] },
  { word: 'she', heartLetters: [0, 1, 2] },
  { word: 'we', heartLetters: [1] },
  { word: 'you', heartLetters: [0, 1, 2] },
  { word: 'go', heartLetters: [1] },
  { word: 'no', heartLetters: [1] },
  { word: 'my', heartLetters: [1] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function HeartWordMap({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [tapped, setTapped] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(HEART_WORDS).slice(0, 6));
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const letters = current.word.split('');
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setTapped([]);
    setDone(false);
  }, [round]);

  // Recorded line: "The heart word is the. Tap each letter to learn it!"
  const { replay } = useGameSpeech(
    done ? null : `The heart word is ${current.word}. Tap each letter to learn it!`,
    [round, done],
  );

  const finishWord = useCallback(() => {
    setDone(true);
    playSoundEffect('coin');
    masterWord(current.word);
    recordSoundAttempt(current.word, true);
    (async () => {
      await speakWord(current.word);
      await speakClip('heart-word', 'This word is special. We learn it by heart!');
      await speakFeedback(isLast ? 'complete' : 'correct');
      await new Promise((r) => setTimeout(r, 700));
      if (isLast) {
        completeGame(worldId, 'heart-word-map');
        addCoins(10);
        setShowCelebration(true);
      } else {
        setRound((r) => r + 1);
      }
    })();
  }, [current.word, isLast, worldId, completeGame, addCoins, masterWord, recordSoundAttempt]);

  const tapLetter = useCallback(
    (i: number) => {
      if (done || tapped.includes(i)) return;
      const isHeart = current.heartLetters.includes(i);
      playSoundEffect('tap');
      if (isHeart) {
        // Learned "by heart" — no letter sound, the heart pops instead
        playSoundEffect('coin');
      } else {
        speakPhoneme(letters[i]);
      }
      const next = [...tapped, i];
      setTapped(next);
      if (next.length === letters.length) setTimeout(finishWord, 600);
    },
    [done, tapped, current.heartLetters, letters, finishWord],
  );

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
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={done ? 'celebrating' : 'excited'} size={130} />
          <p className="text-rose-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {done ? 'You learned a heart word!' : 'Tap each letter of the heart word!'}
          </p>
        </div>

        {/* The word — big tappable letters; heart letters get hearts */}
        <div className="flex gap-2 justify-center w-full px-2">
          {letters.map((letter, i) => {
            const isHeart = current.heartLetters.includes(i);
            const isTapped = tapped.includes(i);
            return (
              <motion.button
                key={`${round}-${i}`}
                onClick={() => tapLetter(i)}
                disabled={done || isTapped}
                animate={isTapped ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                whileTap={{ scale: 0.9 }}
                className={`relative flex-1 min-w-0 max-w-[104px] h-[112px] rounded-3xl shadow-xl press-3d flex items-center justify-center text-6xl font-bold font-[Fredoka] lowercase transition-colors ${
                  isTapped
                    ? isHeart
                      ? 'bg-rose-200 text-rose-700 ring-4 ring-rose-300'
                      : 'bg-emerald-200 text-emerald-800 ring-4 ring-emerald-300'
                    : 'bg-white text-gray-800 animate-hint-pulse'
                }`}
              >
                {letter}
                <AnimatePresence>
                  {isTapped && isHeart && (
                    <motion.span
                      initial={{ scale: 0, y: 0 }}
                      animate={{ scale: [0, 1.6, 1], y: -8 }}
                      className="absolute -top-5 text-3xl"
                    >
                      ❤️
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Legend — visual, no reading needed */}
        <div className="flex gap-5 bg-white/60 rounded-2xl px-5 py-2 shadow-inner">
          <span className="flex items-center gap-1.5 font-[Fredoka] text-emerald-800 text-lg">
            <span className="w-5 h-5 rounded bg-emerald-300 inline-block" /> sounds
          </span>
          <span className="flex items-center gap-1.5 font-[Fredoka] text-rose-700 text-lg">
            ❤️ by heart
          </span>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Heart word hero!" onComplete={onComplete} />
    </GameShell>
  );
}
