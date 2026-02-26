'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface DigraphWord {
  word: string;
  icon: string;
  digraph: 'sh' | 'ch' | 'th';
}

const DIGRAPH_WORDS: DigraphWord[] = [
  { word: 'ship', icon: '\uD83D\uDEA2', digraph: 'sh' },
  { word: 'shop', icon: '\uD83C\uDFEA', digraph: 'sh' },
  { word: 'shin', icon: '\uD83E\uDDB5', digraph: 'sh' },
  { word: 'shed', icon: '\uD83C\uDFE0', digraph: 'sh' },
  { word: 'chip', icon: '\uD83C\uDF5F', digraph: 'ch' },
  { word: 'chop', icon: '\uD83E\uDE93', digraph: 'ch' },
  { word: 'chin', icon: '\uD83D\uDE42', digraph: 'ch' },
  { word: 'chat', icon: '\uD83D\uDCAC', digraph: 'ch' },
  { word: 'thin', icon: '\uD83E\uDEF0', digraph: 'th' },
  { word: 'this', icon: '\uD83D\uDC49', digraph: 'th' },
  { word: 'that', icon: '\uD83D\uDC48', digraph: 'th' },
  { word: 'them', icon: '\uD83D\uDC65', digraph: 'th' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const DIGRAPH_COLORS: Record<string, string> = {
  sh: 'bg-blue-400',
  ch: 'bg-green-400',
  th: 'bg-purple-400',
};

const OPTIONS = ['sh', 'ch', 'th'] as const;

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function DigraphDiscovery({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(DIGRAPH_WORDS).slice(0, 9));
  const { completeGame, addCoins, masterPhoneme, masterWord } = useGameStore();

  const current = words[round];

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `The word is ${current.word}. Which two letters make the special sound? Is it sh, ch, or th?`,
    ['sh', 'ch', 'th'],
    [round]
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (!shouldReveal) return;
    speakReveal(current.digraph);
    const timer = setTimeout(() => {
      masterPhoneme(current.digraph);
      masterWord(current.word);
      if (round >= words.length - 1) {
        completeGame(worldId, 'digraph-discovery');
        addCoins(8);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, words, worldId, completeGame, addCoins, masterPhoneme, masterWord]);

  const handleChoice = useCallback(
    (chosen: string) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      if (chosen === current.digraph) {
        const isLastRound = round >= words.length - 1;
        setFeedback('correct');
        speakFeedback(isLastRound ? 'complete' : 'correct');
        masterPhoneme(current.digraph);
        masterWord(current.word);
        setTimeout(() => {
          setFeedback(null);
          if (isLastRound) {
            completeGame(worldId, 'digraph-discovery');
            addCoins(8);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        }, 1000);
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(chosen, current.digraph);
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, current, round, words, worldId, completeGame, addCoins, masterPhoneme, masterWord, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-400/90 to-amber-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">
          {'<'}
        </motion.button>
        <div className="flex gap-1">
          {words.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={80} />

        <p className="text-white font-[Nunito] text-center">
          Which two letters start this word?
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="bg-white/90 rounded-2xl px-8 py-6 shadow-xl text-center"
          >
            <span className="text-6xl block mb-2">{current.icon}</span>
            <span className="text-3xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.word}</span>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4">
          {OPTIONS.map((dg, i) => (
            <motion.button
              key={dg}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleChoice(dg)}
              disabled={feedback !== null || !doneSpeaking || shouldReveal}
              className={`w-24 h-20 rounded-2xl shadow-lg flex items-center justify-center text-2xl font-bold font-[Fredoka] lowercase text-white transition-all ${
                shouldReveal && dg === current.digraph
                  ? 'ring-4 ring-yellow-300 scale-105'
                  : feedback === 'correct' && dg === current.digraph
                    ? 'ring-4 ring-yellow-300'
                    : activeOption === i
                      ? 'ring-4 ring-blue-400 scale-105'
                      : ''
              } ${DIGRAPH_COLORS[dg]}`}
            >
              {dg}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {feedback === 'correct' && (
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}
              className="text-xl text-yellow-300 font-bold">
              {current.digraph} makes a special sound!
            </motion.p>
          )}
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">
              Try a different pair!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Digraph expert!" onComplete={onComplete} />
    </div>
  );
}
