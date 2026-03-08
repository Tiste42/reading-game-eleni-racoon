'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';

interface PhraseRound {
  phrase: string;
  icon: string;
  correct: string;
  options: string[];
}

const PHRASES: PhraseRound[] = [
  { phrase: 'the cat', icon: '🐱', correct: 'a cat', options: ['a cat', 'a dog', 'a hat'] },
  { phrase: 'a big hat', icon: '🧢', correct: 'a hat', options: ['a hat', 'a cup', 'a net'] },
  { phrase: 'she is sad', icon: '😢', correct: 'sad', options: ['sad', 'happy', 'big'] },
  { phrase: 'he can run', icon: '🏃', correct: 'run', options: ['run', 'sit', 'nap'] },
  { phrase: 'the red cup', icon: '☕', correct: 'red', options: ['red', 'big', 'hot'] },
  { phrase: 'I have a dog', icon: '🐶', correct: 'a dog', options: ['a dog', 'a cat', 'a bug'] },
  { phrase: 'we can go', icon: '🚶', correct: 'go', options: ['go', 'no', 'do'] },
  { phrase: 'my big van', icon: '🚐', correct: 'van', options: ['van', 'man', 'fan'] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoukSentences({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [phrases] = useState(() => shuffle(PHRASES).slice(0, 6));
  const { completeGame, addCoins } = useGameStore();

  const current = phrases[round];
  const stableOptions = useMemo(() => current.options, [current]);

  // Don't read the phrase — child must decode it. Just give direction.
  useGameSpeech(
    feedback ? null : 'Read the sign! What does it say?',
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (!shouldReveal) return;
    speakReveal(current.correct);
    const timer = setTimeout(() => {
      if (round >= phrases.length - 1) {
        completeGame(worldId, 'souk-sentences');
        addCoins(10);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, phrases, worldId, completeGame, addCoins]);

  const handleAnswer = useCallback((answer: string) => {
    if (feedback || shouldReveal) return;
    if (answer === current.correct) {
      const isLastRound = round >= phrases.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      setTimeout(() => {
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'souk-sentences');
          addCoins(10);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(answer, current.correct);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, shouldReveal, current, round, phrases, worldId, completeGame, addCoins, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-400/90 to-amber-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {phrases.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'waving'} size={70} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="bg-amber-50 border-4 border-amber-700 rounded-2xl px-6 py-5 shadow-xl text-center max-w-sm w-full">
            <span className="text-5xl block mb-2">{current.icon}</span>
            <p className="text-2xl font-bold font-[Fredoka] text-gray-800">{current.phrase}</p>
          </motion.div>
        </AnimatePresence>

        <p className="text-white/80 font-[Nunito] text-sm">Read the sign! What does it say?</p>

        <div className="flex flex-col gap-3 max-w-xs w-full">
          {stableOptions.map((opt) => (
            <motion.button key={opt} whileTap={{ scale: 0.95 }} onClick={() => handleAnswer(opt)}
              disabled={feedback !== null || shouldReveal}
              className={`w-full py-4 px-6 rounded-2xl text-lg font-bold font-[Fredoka] shadow-md transition-all ${
                shouldReveal && opt === current.correct
                  ? 'bg-green-300 text-green-800 ring-4 ring-green-400 scale-105'
                  : feedback === 'correct' && opt === current.correct
                    ? 'bg-green-300 text-green-800'
                    : 'bg-white/90 text-gray-700'
              }`}>{opt}</motion.button>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Souk explored!" onComplete={onComplete} />
    </div>
  );
}
