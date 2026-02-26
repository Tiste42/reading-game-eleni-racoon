'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakPhoneme, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface LetterData {
  letter: string;
  icon: string;
  word: string;
  color: string;
}

const LETTERS: LetterData[] = [
  { letter: 's', icon: '🐍', word: 'snake', color: 'from-green-400 to-emerald-300' },
  { letter: 'a', icon: '🐜', word: 'ant', color: 'from-red-400 to-orange-300' },
  { letter: 't', icon: '🐯', word: 'tiger', color: 'from-amber-400 to-yellow-300' },
  { letter: 'p', icon: '🐧', word: 'penguin', color: 'from-blue-400 to-cyan-300' },
  { letter: 'i', icon: '🦎', word: 'iguana', color: 'from-lime-400 to-green-300' },
  { letter: 'n', icon: '🥜', word: 'nut', color: 'from-amber-500 to-amber-300' },
  { letter: 'e', icon: '🥚', word: 'egg', color: 'from-yellow-300 to-amber-200' },
  { letter: 'l', icon: '🍋', word: 'lemon', color: 'from-yellow-400 to-lime-300' },
];

function makeChoices(target: LetterData): LetterData[] {
  return LETTERS
    .filter((l) => l.letter !== target.letter)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .concat([target])
    .sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function LetterIntro({ worldId, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'intro' | 'quiz'>('intro');
  const [quizRound, setQuizRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [quizChoices, setQuizChoices] = useState<LetterData[]>([]);
  const { completeGame, addCoins, masterPhoneme } = useGameStore();

  const currentLetter = LETTERS[currentIndex];
  const quizLetters = useMemo(() => LETTERS.slice(0, 4), []);
  const quizCurrent = quizLetters[quizRound];

  // Intro phase: keep simple speech
  useGameSpeech(
    phase === 'intro' && !feedback
      ? `This is the letter ${currentLetter.letter}. Tap it to hear its sound!`
      : null,
    [currentIndex],
  );

  // Quiz phase: speak instruction + letter options
  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    phase === 'quiz' ? `Which letter makes this sound?` : null,
    quizChoices.map(c => c.letter),
    [quizRound],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(
    phase === 'quiz' ? quizRound : -1,
  );

  useEffect(() => {
    if (phase === 'quiz' && shouldReveal && quizCurrent) {
      speakReveal(quizCurrent.letter);
      const timer = setTimeout(() => {
        setFeedback(null);
        if (quizRound >= quizLetters.length - 1) {
          completeGame(worldId, 'letter-intro');
          addCoins(8);
          setShowCelebration(true);
        } else {
          const next = quizLetters[quizRound + 1];
          setQuizRound((r) => r + 1);
          if (next) setQuizChoices(makeChoices(next));
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, phase, quizCurrent, quizRound, quizLetters, worldId, completeGame, addCoins]);

  const handleNextLetter = useCallback(() => {
    if (currentIndex < LETTERS.length - 1) {
      setCurrentIndex((i) => i + 1);
      speakPhoneme(LETTERS[currentIndex + 1].letter);
    } else {
      setPhase('quiz');
      setQuizChoices(makeChoices(quizLetters[0]));
    }
  }, [currentIndex, quizLetters]);

  const handleQuizChoice = useCallback(
    (chosen: LetterData) => {
      if (feedback || !quizCurrent || !doneSpeaking || shouldReveal) return;
      if (chosen.letter === quizCurrent.letter) {
        const isLastRound = quizRound >= quizLetters.length - 1;
        setFeedback('correct');
        speakFeedback(isLastRound ? 'complete' : 'correct');
        masterPhoneme(chosen.letter);
        setTimeout(() => {
          setFeedback(null);
          if (quizRound >= quizLetters.length - 1) {
            completeGame(worldId, 'letter-intro');
            addCoins(8);
            setShowCelebration(true);
          } else {
            const next = quizLetters[quizRound + 1];
            setQuizRound((r) => r + 1);
            if (next) setQuizChoices(makeChoices(next));
          }
        }, 1000);
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(chosen.letter, quizCurrent.letter);
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, quizCurrent, quizRound, quizLetters, doneSpeaking, shouldReveal, worldId, completeGame, addCoins, masterPhoneme, recordWrong]
  );

  if (phase === 'intro') {
    return (
      <div
        className={`min-h-screen bg-gradient-to-b ${currentLetter.color}/90 px-4 py-6 flex flex-col items-center justify-between`}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md self-start"
          aria-label="Back"
        >
          {'<'}
        </motion.button>

        <div className="flex gap-2">
          {LETTERS.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i <= currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ scale: 0, rotateY: 180 }}
            animate={{ scale: 1, rotateY: 0 }}
            exit={{ scale: 0, rotateY: -180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-center"
          >
            <div className="bg-white/90 rounded-[2rem] w-48 h-48 flex items-center justify-center shadow-2xl mb-4 mx-auto cursor-pointer" onClick={() => speakPhoneme(currentLetter.letter)}>
              <span className="text-[8rem] font-bold font-[Fredoka] text-gray-800 lowercase leading-none">
                {currentLetter.letter}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="text-6xl">{currentLetter.icon}</span>
              <span className="text-2xl font-bold font-[Fredoka] text-white lowercase">
                {currentLetter.word}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-4 mb-8">
          <EleniCharacter pose="excited" size={80} />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNextLetter}
            className="game-button bg-white/90 text-purple-600 px-10 py-5 rounded-full shadow-xl text-xl"
          >
            <span className="text-3xl">
              {currentIndex < LETTERS.length - 1 ? '>' : '!'}
            </span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/90 to-pink-300/90 px-4 py-6 flex flex-col">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onComplete}
        className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md self-start mb-4"
        aria-label="Back"
      >
        {'<'}
      </motion.button>

      <div className="text-center mb-6">
        <EleniCharacter
          pose={feedback === 'correct' ? 'celebrating' : 'waving'}
          size={90}
        />
        <p className="text-white font-[Nunito] text-sm mt-2">
          Which letter makes this sound?
        </p>
        <motion.div
          key={quizRound}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-3 bg-white/80 rounded-2xl px-6 py-3 shadow-lg mt-3"
        >
          <span className="text-5xl">{quizCurrent?.icon}</span>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-4 max-w-md w-full">
          {quizChoices.map((choice, index) => {
            const isCorrect = choice.letter === quizCurrent?.letter;
            const isBeingSpoken = activeOption === index;
            const revealThis = shouldReveal && isCorrect;

            return (
              <motion.button
                key={`${quizRound}-${choice.letter}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleQuizChoice(choice)}
                disabled={!doneSpeaking || feedback !== null || shouldReveal}
                className={`letter-tile shadow-lg transition-all ${
                  feedback === 'correct' && isCorrect
                    ? 'bg-green-200 ring-4 ring-green-400'
                    : revealThis
                    ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                    : isBeingSpoken
                    ? 'bg-white ring-4 ring-blue-400 scale-105'
                    : 'bg-white/90'
                }`}
              >
                {choice.letter}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {feedback === 'wrong' && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1, x: [-5, 5, -5, 5, 0] }}
            exit={{ y: 30, opacity: 0 }}
            className="text-center py-3"
          >
            <span className="text-3xl">Try again!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <CelebrationOverlay
        show={showCelebration}
        message="You know your letters!"
        onComplete={onComplete}
      />
    </div>
  );
}
