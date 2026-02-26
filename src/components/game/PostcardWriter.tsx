'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface PostcardRound {
  template: string;
  icon: string;
  correct: string;
  options: string[];
}

const POSTCARDS: PostcardRound[] = [
  { template: 'I can see a ___.', icon: '\uD83D\uDC1F', correct: 'fish', options: ['fish', 'cat', 'log'] },
  { template: 'I have a big ___.', icon: '\uD83E\uDDE2', correct: 'hat', options: ['hat', 'net', 'cup'] },
  { template: 'The ___ is red.', icon: '\uD83D\uDE8C', correct: 'bus', options: ['dog', 'bus', 'pen'] },
  { template: 'She sat on a ___.', icon: '\uD83E\uDEB5', correct: 'log', options: ['log', 'mug', 'bat'] },
  { template: 'He got a pet ___.', icon: '\uD83D\uDC36', correct: 'dog', options: ['hen', 'dog', 'rat'] },
  { template: 'We can run to the ___.', icon: '\u26F5', correct: 'ship', options: ['ship', 'shop', 'shed'] },
  { template: 'I put it in the ___.', icon: '\uD83C\uDF72', correct: 'pot', options: ['pot', 'dot', 'cot'] },
  { template: 'The ___ is on the mat.', icon: '\uD83D\uDC31', correct: 'cat', options: ['bat', 'cat', 'hat'] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function PostcardWriter({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [postcards] = useState(() => shuffle(POSTCARDS).slice(0, 6));
  const { completeGame, addCoins } = useGameStore();

  const current = postcards[round];
  const stableOptions = useMemo(() => current.options, [current]);

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    current.template.replace('___', 'blank'),
    stableOptions,
    [round]
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (!shouldReveal) return;
    speakReveal(current.correct);
    const timer = setTimeout(() => {
      if (round >= postcards.length - 1) {
        completeGame(worldId, 'postcard-writer');
        addCoins(12);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, postcards, worldId, completeGame, addCoins]);

  const handleChoice = useCallback((chosen: string) => {
    if (feedback || !doneSpeaking || shouldReveal) return;
    if (chosen === current.correct) {
      const isLastRound = round >= postcards.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      setTimeout(() => {
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'postcard-writer');
          addCoins(12);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(chosen, current.correct);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, current, round, postcards, worldId, completeGame, addCoins, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400/90 to-green-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {postcards.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'waving'} size={70} />

        {/* Postcard */}
        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: -90, opacity: 0 }}
            className="bg-white rounded-2xl border-4 border-gray-300 px-6 py-8 shadow-2xl max-w-sm w-full text-center">
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl">{current.icon}</span>
              <div className="w-12 h-12 bg-red-100 border-2 border-red-300 rounded-lg flex items-center justify-center">
                <span className="text-sm text-red-400">{'\u2709\uFE0F'}</span>
              </div>
            </div>
            <p className="text-xl font-bold font-[Fredoka] text-gray-800 leading-relaxed">
              {current.template.replace('___', '____')}
            </p>
          </motion.div>
        </AnimatePresence>

        <p className="text-white/80 font-[Nunito] text-sm">Pick the right word!</p>

        <div className="flex gap-3">
          {stableOptions.map((opt, i) => (
            <motion.button key={opt} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(opt)}
              disabled={feedback !== null || !doneSpeaking || shouldReveal}
              className={`px-6 py-4 rounded-2xl text-lg font-bold font-[Fredoka] lowercase shadow-lg transition-all ${
                shouldReveal && opt === current.correct
                  ? 'bg-green-300 text-green-800 ring-4 ring-green-400 scale-105'
                  : feedback === 'correct' && opt === current.correct
                    ? 'bg-green-300 text-green-800'
                    : activeOption === i
                      ? 'bg-white/90 text-gray-700 ring-4 ring-blue-400 scale-105'
                      : 'bg-white/90 text-gray-700'
              }`}>{opt}</motion.button>
          ))}
        </div>

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">Read the postcard again!</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Postcards sent!" onComplete={onComplete} />
    </div>
  );
}
