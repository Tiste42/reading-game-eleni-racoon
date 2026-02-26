'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface SyllableWord {
  word: string;
  syllables: number;
  icon: string;
}

const WORDS: SyllableWord[] = [
  { word: 'cat', syllables: 1, icon: '🐱' },
  { word: 'dog', syllables: 1, icon: '🐶' },
  { word: 'sun', syllables: 1, icon: '☀️' },
  { word: 'apple', syllables: 2, icon: '🍎' },
  { word: 'monkey', syllables: 2, icon: '🐵' },
  { word: 'table', syllables: 2, icon: '🪑' },
  { word: 'banana', syllables: 3, icon: '🍌' },
  { word: 'elephant', syllables: 3, icon: '🐘' },
  { word: 'tomato', syllables: 3, icon: '🍅' },
  { word: 'butterfly', syllables: 3, icon: '🦋' },
  { word: 'dinosaur', syllables: 3, icon: '🦕' },
  { word: 'watermelon', syllables: 4, icon: '🍉' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SyllableClap({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [claps, setClaps] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(WORDS).slice(0, 8));
  const { completeGame, addCoins, incrementStreak, resetStreak } = useGameStore();

  const current = words[round];

  const { doneSpeaking } = useGameSpeechWithOptions(
    `How many beats does this word have? Clap for each beat!`,
    [current.word],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      let cancelled = false;
      (async () => {
        await speakReveal(`${current.word} has ${current.syllables} beats`);
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;
        setFeedback(null);
        setSubmitted(false);
        setClaps(0);
        if (round >= words.length - 1) {
          completeGame(worldId, 'syllable-clap');
          addCoins(6);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [shouldReveal, current, round, words, worldId, completeGame, addCoins]);

  const handleClap = useCallback(() => {
    if (submitted || !doneSpeaking || shouldReveal) return;
    setClaps((c) => c + 1);
  }, [submitted, doneSpeaking, shouldReveal]);

  const handleSubmit = useCallback(() => {
    if (submitted || shouldReveal) return;
    setSubmitted(true);
    const isLast = round >= words.length - 1;
    if (claps === current.syllables) {
      setFeedback('correct');
      incrementStreak();
      (async () => {
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise(r => setTimeout(r, 400));
        setFeedback(null);
        setSubmitted(false);
        setClaps(0);
        if (isLast) {
          completeGame(worldId, 'syllable-clap');
          addCoins(6);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
    } else {
      setFeedback('wrong');
      recordWrong();
      speakFeedback('wrong');
      resetStreak();
      setTimeout(() => {
        setFeedback(null);
        setSubmitted(false);
        setClaps(0);
      }, 2000);
    }
  }, [submitted, shouldReveal, claps, current, round, words, worldId, completeGame, addCoins, incrementStreak, resetStreak, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-500/75 to-orange-400/75 px-4 py-6 flex flex-col">
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
        <EleniCharacter
          pose={feedback === 'correct' ? 'celebrating' : 'excited'}
          size={80}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-center"
          >
            <span className="text-8xl block mb-4">{current.icon}</span>
            <p className="text-3xl font-bold font-[Fredoka] text-white lowercase">
              {current.word}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Clap display */}
        <div className="flex gap-2 min-h-[60px] items-center justify-center">
          {Array.from({ length: claps }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-4xl"
            >
              👏
            </motion.span>
          ))}
        </div>

        <div className="flex gap-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleClap}
            disabled={submitted || !doneSpeaking || shouldReveal}
            className="w-24 h-24 rounded-full bg-white/90 shadow-xl text-5xl flex items-center justify-center"
          >
            👏
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSubmit}
            disabled={submitted || claps === 0 || shouldReveal}
            className={`w-24 h-24 rounded-full shadow-xl text-3xl flex items-center justify-center font-bold ${
              claps > 0 ? 'bg-green-400 text-white' : 'bg-white/30 text-white/50'
            }`}
          >
            ✓
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { if (!submitted && !shouldReveal) setClaps(0); }}
            disabled={submitted || shouldReveal}
            className="w-16 h-16 rounded-full bg-white/40 shadow-lg text-xl flex items-center justify-center self-center"
          >
            ↺
          </motion.button>
        </div>

        <AnimatePresence>
          {feedback === 'correct' && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-2xl font-bold text-yellow-300"
            >
              {current.syllables} claps!
            </motion.p>
          )}
          {feedback === 'wrong' && !shouldReveal && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1, x: [-4, 4, -4, 0] }}
              exit={{ opacity: 0 }}
              className="text-xl text-white font-bold"
            >
              Try {current.syllables} claps!
            </motion.p>
          )}
          {shouldReveal && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xl text-yellow-300 font-bold animate-pulse"
            >
              {current.word} has {current.syllables} beats!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message="Great clapping!"
        onComplete={onComplete}
      />
    </div>
  );
}
