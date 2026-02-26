'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWord, speakPhoneme } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';

interface PlantLetter {
  letter: string;
  word: string;
  icon: string;
  color: string;
}

const LETTERS: PlantLetter[] = [
  { letter: 's', word: 'sunflower', icon: '\uD83C\uDF3B', color: 'bg-yellow-400' },
  { letter: 'a', word: 'acorn', icon: '\uD83C\uDF42', color: 'bg-orange-400' },
  { letter: 't', word: 'tulip', icon: '\uD83C\uDF37', color: 'bg-pink-400' },
  { letter: 'p', word: 'pansy', icon: '\uD83C\uDF3C', color: 'bg-purple-400' },
  { letter: 'i', word: 'ivy', icon: '\uD83C\uDF3F', color: 'bg-green-400' },
  { letter: 'n', word: 'nettle', icon: '\uD83C\uDF31', color: 'bg-lime-400' },
  { letter: 'e', word: 'elderberry', icon: '\uD83E\uDED0', color: 'bg-indigo-400' },
  { letter: 'l', word: 'lily', icon: '\uD83C\uDF3A', color: 'bg-rose-400' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function LetterTrace({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [tapped, setTapped] = useState(false);
  const [grown, setGrown] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [letters] = useState(() => shuffle(LETTERS).slice(0, 6));
  const { completeGame, addCoins, masterPhoneme } = useGameStore();

  const current = letters[round];

  useGameSpeech(
    tapped ? null : `This is the letter ${current.letter}! Tap plant to grow it!`,
    [round],
  );

  const handlePlant = useCallback(() => {
    if (tapped) return;
    const isLastRound = round >= letters.length - 1;
    setTapped(true);
    if (isLastRound) {
      speakFeedback('complete');
    } else {
      speakPhoneme(current.letter);
    }
    masterPhoneme(current.letter);
    setGrown((g) => [...g, current.letter]);
    setTimeout(() => {
      setTapped(false);
      if (round >= letters.length - 1) {
        completeGame(worldId, 'letter-trace');
        addCoins(8);
        setShowCelebration(true);
      } else {
        setRound((r) => r + 1);
      }
    }, 1500);
  }, [tapped, current, round, letters, worldId, completeGame, addCoins, masterPhoneme]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/90 to-pink-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {letters.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      {/* Garden of grown letters */}
      <div className="flex gap-2 justify-center mb-4 min-h-[50px]">
        {grown.map((l, i) => (
          <motion.div key={i} initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="text-3xl">{LETTERS.find((p) => p.letter === l)?.icon}</motion.div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={tapped ? 'celebrating' : 'excited'} size={80} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }} className="text-center">
            <div className={`w-32 h-32 rounded-3xl ${current.color} flex items-center justify-center shadow-2xl mx-auto mb-3`}>
              <span className="text-7xl font-bold font-[Fredoka] text-white lowercase">{current.letter}</span>
            </div>
            {tapped && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
                <span className="text-6xl block">{current.icon}</span>
                <p className="text-white font-[Fredoka] text-lg mt-1 lowercase">{current.word}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {!tapped && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={handlePlant}
            className="game-button bg-green-500 text-white px-10 py-5 rounded-full shadow-xl text-lg">
            <span className="text-3xl">{'\uD83C\uDF31'}</span>
            <span className="font-[Fredoka]"> Plant it!</span>
          </motion.button>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Beautiful garden!" onComplete={onComplete} />
    </div>
  );
}
