'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface GardenWord {
  word: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const GARDEN_WORDS: GardenWord[] = [
  { word: 'pan', icon: getIcon('pan'), distractors: [{ word: 'pen', icon: getIcon('pen') }, { word: 'pin', icon: getIcon('pin') }] },
  { word: 'bug', icon: getIcon('bug'), distractors: [{ word: 'mug', icon: getIcon('mug') }, { word: 'rug', icon: getIcon('rug') }] },
  { word: 'hot', icon: getIcon('hot'), distractors: [{ word: 'pot', icon: getIcon('pot') }, { word: 'dot', icon: getIcon('dot') }] },
  { word: 'jet', icon: getIcon('jet'), distractors: [{ word: 'wet', icon: getIcon('wet') }, { word: 'net', icon: getIcon('net') }] },
  { word: 'rat', icon: getIcon('rat'), distractors: [{ word: 'hat', icon: getIcon('hat') }, { word: 'bat', icon: getIcon('bat') }] },
  { word: 'fin', icon: getIcon('fin'), distractors: [{ word: 'bin', icon: getIcon('bin') }, { word: 'win', icon: getIcon('win') }] },
  { word: 'hug', icon: getIcon('hug'), distractors: [{ word: 'mug', icon: getIcon('mug') }, { word: 'bug', icon: getIcon('bug') }] },
  { word: 'red', icon: getIcon('red'), distractors: [{ word: 'bed', icon: getIcon('bed') }, { word: 'fed', icon: getIcon('fed') }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function GardenGrow({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [grown, setGrown] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(GARDEN_WORDS).slice(0, 8));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = words[round];

  const choices = useMemo(
    () => shuffle([{ word: current.word, icon: current.icon }, ...current.distractors]),
    [current]
  );

  // Don't say the word — child must READ the seed packet
  useGameSpeech(
    feedback ? null : 'Read the seed! Which picture matches?',
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(current.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        setGrown(g => [...g, current.icon]);
        if (round >= words.length - 1) {
          completeGame(worldId, 'garden-grow');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current.word, current.icon, round, words.length, worldId, completeGame, addCoins]);

  const handleChoice = useCallback((chosen: string) => {
    if (feedback || shouldReveal) return;
    if (chosen === current.word) {
      const isLastRound = round >= words.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      masterWord(current.word);
      setGrown((g) => [...g, current.icon]);
      setTimeout(() => {
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'garden-grow');
          addCoins(10);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(chosen, current.word);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, shouldReveal, current, round, words, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500/90 to-teal-400/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-emerald-600">{grown.length}/{words.length}</span>
        </div>
      </div>

      <div className="bg-amber-800/30 rounded-2xl p-3 flex flex-wrap gap-2 justify-center mb-4 min-h-[80px]">
        {grown.map((icon, i) => (
          <motion.span key={i} initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-4xl">{icon}</motion.span>
        ))}
        {grown.length === 0 && <p className="text-white/50 font-[Nunito] text-sm self-center">Your garden is empty!</p>}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="bg-white/90 rounded-2xl px-10 py-6 shadow-xl text-center">
            <p className="text-sm font-[Nunito] text-gray-500 mb-1">Read the seed packet:</p>
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.word}</span>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4">
          {choices.map((choice) => (
            <motion.button key={choice.word} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(choice.word)}
              disabled={feedback !== null || shouldReveal}
              className={`w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
                shouldReveal && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : feedback === 'correct' && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : 'bg-white/90'
              }`}>
              <span className="text-4xl">{choice.icon}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Garden is full!" onComplete={onComplete} />
    </div>
  );
}
