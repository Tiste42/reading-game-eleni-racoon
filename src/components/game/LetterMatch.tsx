'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakPhoneme, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface MatchPair {
  letter: string;
  icon: string;
  word: string;
}

const PAIRS: MatchPair[] = [
  { letter: 's', icon: '🐍', word: 'snake' },
  { letter: 'a', icon: '🍎', word: 'apple' },
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

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function LetterMatch({ worldId, onComplete }: Props) {
  const gamePairs = useMemo(() => shuffle(PAIRS).slice(0, 6), []);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, masterPhoneme } = useGameStore();

  const shuffledLetters = useMemo(() => shuffle(gamePairs.map((p) => p.letter)), [gamePairs]);
  const shuffledPictures = useMemo(() => shuffle([...gamePairs]), [gamePairs]);

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `Match each letter to its picture! Tap a letter, then tap the picture that starts with it!`,
    gamePairs.map(p => p.word),
    [],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(matched.size);

  useEffect(() => {
    if (shouldReveal && selectedLetter) {
      const correctPair = gamePairs.find(p => p.letter === selectedLetter);
      if (correctPair) {
        speakReveal(correctPair.word);
        const timer = setTimeout(() => {
          setFeedback('correct');
          masterPhoneme(correctPair.letter);
          const next = new Set(matched);
          next.add(correctPair.letter);
          setMatched(next);
          setTimeout(() => {
            setFeedback(null);
            setSelectedLetter(null);
            if (next.size >= gamePairs.length) {
              completeGame(worldId, 'letter-match');
              addCoins(8);
              setShowCelebration(true);
            }
          }, 800);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [shouldReveal, selectedLetter, gamePairs, matched, worldId, completeGame, addCoins, masterPhoneme]);

  const handleLetterTap = useCallback((letter: string) => {
    if (feedback || matched.has(letter) || !doneSpeaking) return;
    setSelectedLetter(letter);
    speakPhoneme(letter);
  }, [feedback, matched, doneSpeaking]);

  const handlePictureTap = useCallback((pair: MatchPair) => {
    if (feedback || !selectedLetter || matched.has(pair.letter) || shouldReveal) return;
    if (pair.letter === selectedLetter) {
      const isLastMatch = (() => { const next = new Set(matched); next.add(pair.letter); return next.size >= gamePairs.length; })();
      setFeedback('correct');
      speakFeedback(isLastMatch ? 'complete' : 'correct');
      masterPhoneme(pair.letter);
      const next = new Set(matched);
      next.add(pair.letter);
      setMatched(next);
      setTimeout(() => {
        setFeedback(null);
        setSelectedLetter(null);
        if (next.size >= gamePairs.length) {
          completeGame(worldId, 'letter-match');
          addCoins(8);
          setShowCelebration(true);
        }
      }, 800);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(pair.word, selectedLetter, 'starts-with');
      setTimeout(() => {
        setFeedback(null);
        setSelectedLetter(null);
      }, 2000);
    }
  }, [feedback, selectedLetter, matched, shouldReveal, gamePairs, worldId, completeGame, addCoins, masterPhoneme, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/90 to-pink-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-purple-600">{matched.size}/{gamePairs.length}</span>
        </div>
      </div>

      <div className="text-center mb-3">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'waving'} size={70} />
        <p className="text-white/80 font-[Nunito] text-sm mt-1">Tap a letter, then tap its picture!</p>
      </div>

      <div className="flex-1 flex gap-4 max-w-md mx-auto w-full">
        <div className="flex-1 flex flex-col gap-2">
          {shuffledLetters.map((letter) => (
            <motion.button key={letter} whileTap={{ scale: 0.9 }}
              onClick={() => handleLetterTap(letter)} disabled={matched.has(letter) || !doneSpeaking}
              className={`flex-1 rounded-2xl shadow-lg flex items-center justify-center text-3xl font-bold font-[Fredoka] lowercase transition-all ${
                matched.has(letter) ? 'bg-green-200 text-green-600 opacity-50'
                : selectedLetter === letter ? 'bg-yellow-200 ring-4 ring-yellow-400 scale-105' : 'bg-white/90 text-gray-800'
              }`}>
              {letter}
            </motion.button>
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-2">
          {shuffledPictures.map((pair, index) => {
            const isBeingSpoken = activeOption === gamePairs.findIndex(p => p.letter === pair.letter);
            const isCorrectReveal = shouldReveal && selectedLetter === pair.letter;

            return (
              <motion.button key={pair.letter} whileTap={{ scale: 0.9 }}
                onClick={() => handlePictureTap(pair)} disabled={matched.has(pair.letter) || shouldReveal}
                className={`flex-1 rounded-2xl shadow-lg flex items-center justify-center text-4xl transition-all ${
                  matched.has(pair.letter) ? 'bg-green-200 opacity-50'
                  : feedback === 'correct' && pair.letter === selectedLetter ? 'bg-green-200 ring-4 ring-green-400'
                  : isCorrectReveal ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : isBeingSpoken ? 'bg-white ring-4 ring-blue-400 scale-105'
                  : 'bg-white/90'
                }`}>
                {pair.icon}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {feedback === 'wrong' && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
            className="text-center text-white font-bold text-lg mt-3">Not a match! Try again</motion.p>
        )}
      </AnimatePresence>

      <CelebrationOverlay show={showCelebration} message="All matched!" onComplete={onComplete} />
    </div>
  );
}
