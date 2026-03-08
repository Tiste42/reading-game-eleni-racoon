'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import ReplayButton from '@/components/ui/ReplayButton';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakPhoneme, speakWrongExplanation, speakReveal, PHONEME_PRONUNCIATIONS } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface LetterData {
  letter: string;
  icon: string;
  word: string;
}

const LETTERS: LetterData[] = [
  { letter: 's', icon: '🐍', word: 'snake' },
  { letter: 'a', icon: '🐜', word: 'ant' },
  { letter: 't', icon: '🐯', word: 'tiger' },
  { letter: 'p', icon: '🐧', word: 'penguin' },
  { letter: 'i', icon: '🦎', word: 'iguana' },
  { letter: 'n', icon: '🥜', word: 'nut' },
  { letter: 'e', icon: '🥚', word: 'egg' },
  { letter: 'l', icon: '🍋', word: 'lemon' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function makeChoices(target: LetterData): LetterData[] {
  return shuffle(
    LETTERS.filter((l) => l.letter !== target.letter)
  ).slice(0, 3).concat([target]).sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function LetterIntro({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(LETTERS));
  const [choicesByRound] = useState(() => rounds.map(makeChoices));
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak } = useGameStore();

  const current = rounds[round];
  const choices = choicesByRound[round];
  const pronunciation = PHONEME_PRONUNCIATIONS[current.letter] || current.letter;

  const { activeOption, doneSpeaking, replay } = useGameSpeechWithOptions(
    `What letter makes the ${pronunciation} sound? Tap it!`,
    choices.map(c => c.letter),
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(`The letter ${current.letter} makes the ${pronunciation} sound, like ${current.word}`);
      const timer = setTimeout(() => {
        setFeedback(null);
        if (round >= rounds.length - 1) {
          completeGame(worldId, 'letter-intro');
          addCoins(8);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current, pronunciation, round, rounds, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (chosen: LetterData) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      if (chosen.letter === current.letter) {
        const isLast = round >= rounds.length - 1;
        setFeedback('correct');
        incrementStreak();
        masterPhoneme(chosen.letter);
        speakFeedback(isLast ? 'complete' : 'correct');
        setTimeout(() => {
          setFeedback(null);
          if (isLast) {
            completeGame(worldId, 'letter-intro');
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
        speakWrongExplanation(chosen.letter, current.letter);
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, current, round, rounds, worldId, completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordWrong]
  );

  const handleReplay = () => {
    if (doneSpeaking && !feedback) speakPhoneme(current.letter);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/90 to-pink-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md"
        >
          {'<'}
        </motion.button>

          <ReplayButton onReplay={replay} />

        </div>
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
          What letter makes this sound?
        </p>
      </div>

      {/* Sound replay button */}
      <motion.button
        key={round}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleReplay}
        className="mx-auto mb-6 w-24 h-24 rounded-full bg-white/90 shadow-xl flex items-center justify-center"
      >
        <span className="text-5xl">🔊</span>
      </motion.button>

      {/* Letter choices */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="grid grid-cols-2 gap-4 max-w-xs w-full"
          >
            {choices.map((choice, index) => {
              const isCorrect = choice.letter === current.letter;
              const isBeingSpoken = activeOption === index;
              const revealThis = shouldReveal && isCorrect;

              return (
                <motion.button
                  key={`${round}-${choice.letter}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.08 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleChoice(choice)}
                  disabled={!doneSpeaking || feedback !== null || shouldReveal}
                  className={`h-28 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
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
                    {choice.letter}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
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
            <span className="text-4xl">{current.icon}</span>
            <p className="text-white font-[Fredoka] text-lg">
              {current.letter} is for {current.word}!
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
            <span className="text-xl text-white font-bold">Not quite! Try again!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <CelebrationOverlay
        show={showCelebration}
        message="Sound Spotter star!"
        onComplete={onComplete}
      />
    </div>
  );
}
