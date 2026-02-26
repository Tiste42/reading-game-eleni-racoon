'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWord, speakWrongExplanation } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';

interface BuildWord {
  letters: string[];
  word: string;
  icon: string;
}

const BUILD_WORDS: BuildWord[] = [
  { letters: ['s', 'a', 't'], word: 'sat', icon: '🪑' },
  { letters: ['p', 'i', 'n'], word: 'pin', icon: '📌' },
  { letters: ['t', 'a', 'p'], word: 'tap', icon: '🚰' },
  { letters: ['n', 'e', 't'], word: 'net', icon: '🥅' },
  { letters: ['p', 'e', 't'], word: 'pet', icon: '🐶' },
  { letters: ['l', 'e', 't'], word: 'let', icon: '✅' },
  { letters: ['t', 'i', 'n'], word: 'tin', icon: '🥫' },
  { letters: ['s', 'i', 'p'], word: 'sip', icon: '🥤' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function MarketBuilder({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(BUILD_WORDS).slice(0, 6));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = words[round];
  const trayLetters = useMemo(() => shuffle([...current.letters]), [current]);

  const { recordWrong } = useWrongAttempts(round);

  useGameSpeech(
    `Build the word ${current.word}! Tap the letters in order!`,
    [round]
  );

  const handlePlace = useCallback((letter: string) => {
    if (feedback) return;
    const expected = current.letters[placed.length];
    if (letter === expected) {
      const next = [...placed, letter];
      setPlaced(next);
      if (next.length === current.letters.length) {
        setFeedback('correct');
        speakWord(current.word);
        masterWord(current.word);
        setTimeout(() => {
          setFeedback(null);
          setPlaced([]);
          if (round >= words.length - 1) {
            completeGame(worldId, 'market-builder');
            addCoins(10);
            setShowCelebration(true);
            speakFeedback('complete');
          } else {
            setRound((r) => r + 1);
          }
        }, 1200);
      }
    } else {
      setFeedback('wrong');
      recordWrong();
      const builtSoFar = [...placed, letter].join('');
      speakWrongExplanation(builtSoFar, current.word, 'blend');
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, placed, current, round, words, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-400/90 to-orange-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {words.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={placed.length === current.letters.length ? 'celebrating' : 'excited'} size={70} />
        <div className="text-center">
          <span className="text-6xl">{current.icon}</span>
          <p className="text-white/80 font-[Nunito] text-sm mt-2">Build the word to buy it!</p>
        </div>

        <div className="flex gap-3">
          {current.letters.map((_, i) => (
            <div key={i} className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold font-[Fredoka] lowercase shadow-lg ${
              placed[i] ? 'bg-white text-gray-800' : 'bg-white/20 border-2 border-dashed border-white/40'
            }`}>
              {placed[i] || ''}
            </div>
          ))}
        </div>

        {placed.length < current.letters.length && (
          <div className="flex gap-3">
            {trayLetters.map((letter, i) => {
              const usedCount = placed.filter((p) => p === letter).length;
              const totalCount = current.letters.filter((l) => l === letter).length;
              const disabled = usedCount >= totalCount;
              return (
                <motion.button key={`${letter}-${i}`} whileTap={{ scale: 0.85 }}
                  onClick={() => handlePlace(letter)} disabled={disabled}
                  className={`w-20 h-20 rounded-2xl text-4xl font-bold font-[Fredoka] lowercase shadow-lg ${
                    disabled ? 'bg-white/20 text-white/30' : 'bg-white/90 text-gray-800'
                  }`}>{letter}</motion.button>
              );
            })}
          </div>
        )}

        {placed.length === current.letters.length && feedback === 'correct' && (
          <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="text-2xl font-bold font-[Fredoka] text-white lowercase">{current.word}!</motion.p>
        )}

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">Try a different letter!</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Market master!" onComplete={onComplete} />
    </div>
  );
}
