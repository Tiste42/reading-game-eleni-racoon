'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface RescueRound {
  sentence: string;
  question: string;
  correctAction: string;
  options: { label: string; icon: string }[];
  correctIndex: number;
}

const RESCUE_ROUNDS: RescueRound[] = [
  { sentence: 'The big net is on the fin.', question: 'What should we do?', correctAction: 'Remove the net',
    options: [{ label: 'Remove the net', icon: '\uD83E\uDD45' }, { label: 'Add more net', icon: '\u274C' }, { label: 'Swim away', icon: '\uD83C\uDFC4' }], correctIndex: 0 },
  { sentence: 'The log is in the path.', question: 'What should we do?', correctAction: 'Move the log',
    options: [{ label: 'Sit on it', icon: '\uD83E\uDE91' }, { label: 'Move the log', icon: '\uD83E\uDEB5' }, { label: 'Jump on it', icon: '\uD83E\uDD98' }], correctIndex: 1 },
  { sentence: 'The cup fell in the pond.', question: 'What should we do?', correctAction: 'Pick it up',
    options: [{ label: 'Leave it', icon: '\u274C' }, { label: 'Push it deeper', icon: '\u274C' }, { label: 'Pick it up', icon: '\u2615' }], correctIndex: 2 },
  { sentence: 'A can is on the sand.', question: 'What should we do?', correctAction: 'Put it in the bin',
    options: [{ label: 'Put it in the bin', icon: '\uD83D\uDDD1\uFE0F' }, { label: 'Kick it', icon: '\u274C' }, { label: 'Hide it', icon: '\u274C' }], correctIndex: 0 },
  { sentence: 'The fish is in a net.', question: 'How do we help?', correctAction: 'Free the fish',
    options: [{ label: 'Cook it', icon: '\u274C' }, { label: 'Free the fish', icon: '\uD83D\uDC1F' }, { label: 'Watch it', icon: '\u274C' }], correctIndex: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function ManateeRescue({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [rescued, setRescued] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(RESCUE_ROUNDS).slice(0, 4));
  const { completeGame, addCoins } = useGameStore();

  const current = rounds[round];
  const optionLabels = useMemo(() => current.options.map(o => o.label), [current]);

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `The manatee needs help! ${current.sentence} ${current.question}`,
    optionLabels,
    [round]
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (doneSpeaking && !showQuestion && !feedback) {
      setShowQuestion(true);
    }
  }, [doneSpeaking, showQuestion, feedback]);

  useEffect(() => {
    if (!shouldReveal) return;
    speakReveal(current.correctAction);
    const timer = setTimeout(() => {
      setRescued((r) => r + 1);
      setShowQuestion(false);
      if (round >= rounds.length - 1) {
        completeGame(worldId, 'manatee-rescue');
        addCoins(12);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, rounds, worldId, completeGame, addCoins]);

  const handleChoice = useCallback((idx: number) => {
    if (feedback || !doneSpeaking || shouldReveal) return;
    if (idx === current.correctIndex) {
      const isLastRound = round >= rounds.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      setRescued((r) => r + 1);
      setTimeout(() => {
        setFeedback(null);
        setShowQuestion(false);
        if (isLastRound) {
          completeGame(worldId, 'manatee-rescue');
          addCoins(12);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(current.options[idx].label, current.correctAction);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, current, round, rounds, worldId, completeGame, addCoins, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400/90 to-green-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow flex gap-1">
          {Array.from({ length: rescued }).map((_, i) => (
            <span key={i} className="text-lg">{'\uD83D\uDC33'}</span>
          ))}
          {rescued === 0 && <span className="font-[Fredoka] text-cyan-600 text-sm">0 rescued</span>}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="bg-amber-50 border-4 border-amber-700 rounded-2xl px-6 py-5 shadow-xl max-w-sm w-full text-center">
            <span className="text-5xl block mb-2">{'\uD83D\uDC33'}</span>
            <p className="text-xl font-bold font-[Fredoka] text-gray-800 leading-relaxed">{current.sentence}</p>
          </motion.div>
        </AnimatePresence>

        {showQuestion && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm">
            <p className="text-white font-[Nunito] text-center mb-3">{current.question}</p>
            <div className="flex flex-col gap-3">
              {current.options.map((opt, i) => (
                <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => handleChoice(i)}
                  disabled={feedback !== null || !doneSpeaking || shouldReveal}
                  className={`w-full py-4 px-6 rounded-2xl text-lg font-bold font-[Fredoka] shadow-md flex items-center gap-3 transition-all ${
                    shouldReveal && i === current.correctIndex
                      ? 'bg-green-300 text-green-800 ring-4 ring-green-400 scale-105'
                      : feedback === 'correct' && i === current.correctIndex
                        ? 'bg-green-300 text-green-800'
                        : activeOption === i
                          ? 'bg-white/90 text-gray-700 ring-4 ring-blue-400 scale-105'
                          : 'bg-white/90 text-gray-700'
                  }`}>
                  <span className="text-2xl">{opt.icon}</span> {opt.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Manatees saved!" onComplete={onComplete} />
    </div>
  );
}
