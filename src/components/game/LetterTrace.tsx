'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal, PHONEME_PRONUNCIATIONS } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface PictureRound {
  word: string;
  icon: string;
  letter: string;
}

const ALL_PICTURES: PictureRound[] = [
  { word: 'sun', icon: '☀️', letter: 's' },
  { word: 'snake', icon: '🐍', letter: 's' },
  { word: 'apple', icon: '🍎', letter: 'a' },
  { word: 'ant', icon: '🐜', letter: 'a' },
  { word: 'tiger', icon: '🐯', letter: 't' },
  { word: 'tent', icon: '⛺', letter: 't' },
  { word: 'penguin', icon: '🐧', letter: 'p' },
  { word: 'pig', icon: '🐷', letter: 'p' },
  { word: 'igloo', icon: '🏠', letter: 'i' },
  { word: 'insect', icon: '🐛', letter: 'i' },
  { word: 'nut', icon: '🥜', letter: 'n' },
  { word: 'nest', icon: '🪹', letter: 'n' },
  { word: 'egg', icon: '🥚', letter: 'e' },
  { word: 'elephant', icon: '🐘', letter: 'e' },
  { word: 'lemon', icon: '🍋', letter: 'l' },
  { word: 'lion', icon: '🦁', letter: 'l' },
];

const SATPIN_EL = ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeLetterChoices(correct: string): string[] {
  return shuffle(
    SATPIN_EL.filter((l) => l !== correct)
  ).slice(0, 3).concat([correct]).sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function LetterTrace({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(ALL_PICTURES).slice(0, 8));
  const [choicesByRound] = useState(() => rounds.map(r => makeLetterChoices(r.letter)));
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak } = useGameStore();

  const current = rounds[round];
  const choices = choicesByRound[round];

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `What letter does ${current.word} start with?`,
    choices,
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      const pronunciation = PHONEME_PRONUNCIATIONS[current.letter] || current.letter;
      speakReveal(`${current.word} starts with the letter ${current.letter}. ${pronunciation}!`);
      const timer = setTimeout(() => {
        setFeedback(null);
        if (round >= rounds.length - 1) {
          completeGame(worldId, 'letter-trace');
          addCoins(8);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current, round, rounds, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (chosen: string) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      if (chosen === current.letter) {
        const isLast = round >= rounds.length - 1;
        setFeedback('correct');
        incrementStreak();
        masterPhoneme(chosen);
        speakFeedback(isLast ? 'complete' : 'correct');
        setTimeout(() => {
          setFeedback(null);
          if (isLast) {
            completeGame(worldId, 'letter-trace');
            addCoins(8);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        }, 1200);
      } else {
        setFeedback('wrong');
        recordWrong();
        resetStreak();
        speakWrongExplanation(chosen, current.letter);
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, current, round, rounds, worldId, completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/90 to-pink-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md"
        >
          {'<'}
        </motion.button>
        <div className="flex gap-1">
          {rounds.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="text-center mb-4">
        <EleniCharacter
          pose={feedback === 'correct' ? 'celebrating' : 'excited'}
          size={80}
        />
        <p className="text-white font-[Nunito] text-lg mt-2 drop-shadow">
          What letter does this start with?
        </p>
      </div>

      {/* Picture display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={round}
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0, rotateY: -180 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto mb-6"
        >
          <div className="bg-white/90 rounded-[2rem] w-36 h-36 flex flex-col items-center justify-center shadow-2xl">
            <span className="text-7xl">{current.icon}</span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Letter choices */}
      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-4 max-w-xs w-full">
          {choices.map((letter, index) => {
            const isCorrect = letter === current.letter;
            const isBeingSpoken = activeOption === index;
            const revealThis = shouldReveal && isCorrect;

            return (
              <motion.button
                key={`${round}-${letter}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleChoice(letter)}
                disabled={!doneSpeaking || feedback !== null || shouldReveal}
                className={`h-24 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
                  feedback === 'correct' && isCorrect
                    ? 'bg-green-200 ring-4 ring-green-400'
                    : revealThis
                    ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                    : isBeingSpoken
                    ? 'bg-white ring-4 ring-blue-400 scale-105'
                    : 'bg-white/90'
                }`}
              >
                <span className="text-5xl font-bold font-[Fredoka] text-gray-800 lowercase">
                  {letter}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-3"
          >
            <p className="text-white font-[Fredoka] text-lg">
              {current.icon} {current.word} starts with {current.letter}!
            </p>
          </motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [-5, 5, -5, 5, 0] }}
            exit={{ opacity: 0 }}
            className="text-center py-3"
          >
            <span className="text-xl text-white font-bold">Not that one! Try again!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <CelebrationOverlay
        show={showCelebration}
        message="You know your beginning sounds!"
        onComplete={onComplete}
      />
    </div>
  );
}
