'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';

interface PotionWord {
  letters: string[];
  word: string;
  icon: string;
  swap?: { index: number; from: string; to: string; newWord: string; newIcon: string };
}

const POTION_WORDS: PotionWord[] = [
  {
    letters: ['c', 'a', 't'], word: 'cat', icon: '🐱',
    swap: { index: 0, from: 'c', to: 'h', newWord: 'hat', newIcon: '🧢' },
  },
  {
    letters: ['p', 'i', 'n'], word: 'pin', icon: '📌',
    swap: { index: 0, from: 'p', to: 'b', newWord: 'bin', newIcon: '🗑️' },
  },
  {
    letters: ['h', 'o', 't'], word: 'hot', icon: '🔥',
    swap: { index: 0, from: 'h', to: 'p', newWord: 'pot', newIcon: '🍲' },
  },
  {
    letters: ['b', 'a', 't'], word: 'bat', icon: '🦇',
    swap: { index: 0, from: 'b', to: 'm', newWord: 'mat', newIcon: '🧹' },
  },
  {
    letters: ['d', 'o', 'g'], word: 'dog', icon: '🐶',
    swap: { index: 0, from: 'd', to: 'l', newWord: 'log', newIcon: '🪵' },
  },
  {
    letters: ['c', 'u', 'p'], word: 'cup', icon: '☕',
    swap: { index: 0, from: 'c', to: 'p', newWord: 'pup', newIcon: '🐶' },
  },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function PotionLab({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'build' | 'swap' | 'done'>('build');
  const [placed, setPlaced] = useState<string[]>([]);
  const [swapped, setSwapped] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(POTION_WORDS).slice(0, 5));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = words[round];
  const trayLetters = useMemo(() => shuffle([...current.letters]), [current]);

  const { recordWrong } = useWrongAttempts(round);

  useGameSpeech(
    `Put the letters ${current.letters.join(', ')} into the cauldron to make ${current.word}!`,
    [round]
  );

  const advanceRound = useCallback(() => {
    if (round >= words.length - 1) {
      completeGame(worldId, 'potion-lab');
      addCoins(10);
      setShowCelebration(true);
      speakFeedback('complete');
    } else {
      setRound((r) => r + 1);
      setPhase('build');
      setPlaced([]);
      setSwapped(false);
      setFeedback(null);
    }
  }, [round, words, worldId, completeGame, addCoins]);

  const handlePlaceLetter = useCallback(
    (letter: string) => {
      if (phase !== 'build') return;
      const expected = current.letters[placed.length];
      if (letter === expected) {
        const next = [...placed, letter];
        setPlaced(next);
        if (next.length === current.letters.length) {
          speakFeedback('correct');
          masterWord(current.word);
          if (current.swap) {
            setTimeout(() => setPhase('swap'), 800);
          } else {
            setTimeout(() => advanceRound(), 800);
          }
        }
      } else {
        setFeedback('wrong');
        recordWrong();
        const builtSoFar = [...placed, letter].join('');
        speakWrongExplanation(builtSoFar, current.word, 'blend');
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [phase, placed, current, masterWord, advanceRound, recordWrong]
  );

  const handleSwap = useCallback(() => {
    if (!current.swap || swapped) return;
    setSwapped(true);
    const newLetters = [...current.letters];
    newLetters[current.swap.index] = current.swap.to;
    setPlaced(newLetters);
    masterWord(current.swap.newWord);
    setTimeout(() => advanceRound(), 1200);
  }, [current, swapped, masterWord, advanceRound]);

  const displayWord = swapped && current.swap ? current.swap.newWord : current.word;
  const displayIcon = swapped && current.swap ? current.swap.newIcon : current.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500/90 to-teal-400/90 px-4 py-6 flex flex-col">
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

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={placed.length === current.letters.length ? 'celebrating' : 'excited'} size={80} />

        <div className="bg-gray-800/20 rounded-[2rem] px-8 py-6 min-w-[280px]">
          <p className="text-center text-white/70 text-sm font-[Nunito] mb-3">
            {phase === 'build' ? 'Drag letters into the cauldron!' : 'Swap a letter!'}
          </p>
          <div className="flex gap-3 justify-center">
            {current.letters.map((_, i) => (
              <motion.div
                key={i}
                layout
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold font-[Fredoka] lowercase shadow-lg ${
                  placed[i]
                    ? swapped && current.swap && i === current.swap.index
                      ? 'bg-yellow-300'
                      : 'bg-white'
                    : 'bg-white/20 border-2 border-dashed border-white/40'
                }`}
              >
                {placed[i] || ''}
              </motion.div>
            ))}
          </div>
          {placed.length === current.letters.length && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center mt-4"
            >
              <span className="text-5xl">{displayIcon}</span>
              <p className="text-2xl font-bold font-[Fredoka] text-white lowercase mt-1">
                {displayWord}
              </p>
            </motion.div>
          )}
        </div>

        {phase === 'build' && placed.length < current.letters.length && (
          <div className="flex gap-3">
            {trayLetters.map((letter, i) => {
              const alreadyPlaced = placed.filter((p) => p === letter).length;
              const available = current.letters.filter((l) => l === letter).length;
              const disabled = alreadyPlaced >= available;
              return (
                <motion.button
                  key={`${letter}-${i}`}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handlePlaceLetter(letter)}
                  disabled={disabled}
                  className={`w-20 h-20 rounded-2xl text-4xl font-bold font-[Fredoka] lowercase shadow-lg ${
                    disabled ? 'bg-white/20 text-white/30' : 'bg-white/90 text-gray-800'
                  }`}
                >
                  {letter}
                </motion.button>
              );
            })}
          </div>
        )}

        {phase === 'swap' && !swapped && current.swap && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSwap}
            className="game-button bg-yellow-400 text-gray-800 px-8 py-5 rounded-full shadow-xl text-lg"
          >
            <span className="font-[Fredoka]">
              Swap {current.swap.from} for {current.swap.to}!
            </span>
          </motion.button>
        )}

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [-4, 4, -4, 0] }}
              exit={{ opacity: 0 }}
              className="text-lg text-white/80 font-bold"
            >
              Not quite - try another letter!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message="Amazing potions!"
        onComplete={onComplete}
      />
    </div>
  );
}
