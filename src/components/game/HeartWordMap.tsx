'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';

interface HeartWord {
  word: string;
  regularLetters: number[];
  heartLetters: number[];
  hint: string;
}

const HEART_WORDS: HeartWord[] = [
  { word: 'the', regularLetters: [2], heartLetters: [0, 1], hint: '"th" makes a special sound together!' },
  { word: 'was', regularLetters: [2], heartLetters: [0, 1], hint: '"wa" sounds like "wuh" here!' },
  { word: 'said', regularLetters: [0, 3], heartLetters: [1, 2], hint: '"ai" says "eh" in this word!' },
  { word: 'is', regularLetters: [0, 1], heartLetters: [], hint: 'You can sound this one out!' },
  { word: 'to', regularLetters: [0], heartLetters: [1], hint: 'The "o" makes an "oo" sound here!' },
  { word: 'he', regularLetters: [0], heartLetters: [1], hint: 'The "e" says its name here!' },
  { word: 'she', regularLetters: [], heartLetters: [0, 1, 2], hint: '"sh" and "e" both have special sounds!' },
  { word: 'we', regularLetters: [0], heartLetters: [1], hint: 'The "e" says its name here!' },
  { word: 'you', regularLetters: [], heartLetters: [0, 1, 2], hint: 'This whole word is special!' },
  { word: 'are', regularLetters: [], heartLetters: [0, 1, 2], hint: 'This word is tricky - learn it by heart!' },
  { word: 'have', regularLetters: [0], heartLetters: [1, 2, 3], hint: 'The "a" is short and the "e" is silent!' },
  { word: 'do', regularLetters: [0], heartLetters: [1], hint: 'The "o" makes an "oo" sound!' },
  { word: 'no', regularLetters: [0], heartLetters: [1], hint: 'The "o" says its name!' },
  { word: 'go', regularLetters: [0], heartLetters: [1], hint: 'The "o" says its name!' },
  { word: 'my', regularLetters: [0], heartLetters: [1], hint: 'The "y" says "eye" here!' },
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
  const [tappedAll, setTappedAll] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [tappedLetters, setTappedLetters] = useState<Set<number>>(new Set());
  const [words] = useState(() => shuffle(HEART_WORDS).slice(0, 8));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = words[round];

  useGameSpeech(
    tappedAll ? null : `The heart word is ${current.word}. Tap each letter to learn it!`,
    [round]
  );

  const handleTapLetter = useCallback(
    (idx: number) => {
      if (tappedAll) return;
      const next = new Set(tappedLetters);
      next.add(idx);
      setTappedLetters(next);
      if (next.size === current.word.length) {
        setTappedAll(true);
        setShowHint(true);
        speakFeedback('correct');
      }
    },
    [tappedAll, tappedLetters, current]
  );

  const handleNext = useCallback(() => {
    masterWord(current.word);
    if (round >= words.length - 1) {
      completeGame(worldId, 'heart-word-map');
      addCoins(8);
      setShowCelebration(true);
      speakFeedback('complete');
    } else {
      setRound((r) => r + 1);
      setTappedAll(false);
      setShowHint(false);
      setTappedLetters(new Set());
    }
  }, [round, words, current, worldId, completeGame, addCoins, masterWord]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-400/90 to-amber-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md"
        >
          {'<'}
        </motion.button>
        <div className="flex gap-1">
          {words.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <EleniCharacter pose={tappedAll ? 'celebrating' : 'waving'} size={80} />

        <p className="text-white font-[Nunito] text-center text-sm">
          Tap each letter to learn it!
        </p>

        {/* Word tiles */}
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="flex gap-3"
          >
            {current.word.split('').map((letter, i) => {
              const isHeart = current.heartLetters.includes(i);
              const isRegular = current.regularLetters.includes(i);
              const tapped = tappedLetters.has(i);
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleTapLetter(i)}
                  animate={
                    tapped
                      ? { scale: [1, 1.2, 1], transition: { duration: 0.3 } }
                      : {}
                  }
                  className={`w-20 h-24 rounded-2xl flex flex-col items-center justify-center text-4xl font-bold font-[Fredoka] lowercase shadow-lg transition-colors ${
                    tapped
                      ? isHeart
                        ? 'bg-pink-200 ring-4 ring-pink-400'
                        : 'bg-green-200 ring-4 ring-green-400'
                      : 'bg-white/90'
                  }`}
                >
                  {letter}
                  {tapped && (
                    <span className="text-sm mt-1">
                      {isHeart ? '\u2764\uFE0F' : '\u2705'}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex gap-6 text-sm text-white/80">
          <span>{'\u2705'} = sounds normal</span>
          <span>{'\u2764\uFE0F'} = learn by heart</span>
        </div>

        {/* Hint */}
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/90 rounded-2xl p-5 max-w-sm text-center shadow-lg"
            >
              <p className="text-gray-700 font-[Nunito] mb-3">{current.hint}</p>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                className="game-button bg-pink-500 text-white px-8 py-4 rounded-full shadow-lg text-lg"
              >
                <span className="font-[Fredoka]">Next Word!</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message="Heart words mastered!"
        onComplete={onComplete}
      />
    </div>
  );
}
