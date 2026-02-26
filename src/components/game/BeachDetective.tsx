'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface ClueRound {
  passage: string;
  question: string;
  correct: string;
  options: { label: string; icon: string }[];
}

const CLUE_ROUNDS: ClueRound[] = [
  { passage: 'The shell is red. It is big. It is on the sand.',
    question: 'What color is the shell?',
    correct: 'red',
    options: [{ label: 'red', icon: '\uD83D\uDD34' }, { label: 'blue', icon: '\uD83D\uDD35' }, { label: 'green', icon: '\uD83D\uDFE2' }] },
  { passage: 'A crab has a hat. The hat is blue. The crab is happy.',
    question: 'What color is the hat?',
    correct: 'blue',
    options: [{ label: 'red', icon: '\uD83D\uDD34' }, { label: 'blue', icon: '\uD83D\uDD35' }, { label: 'yellow', icon: '\uD83D\uDFE1' }] },
  { passage: 'The fish is in the net. The net is big. A man has the net.',
    question: 'Who has the net?',
    correct: 'a man',
    options: [{ label: 'a dog', icon: '\uD83D\uDC36' }, { label: 'a man', icon: '\uD83D\uDC68' }, { label: 'a cat', icon: '\uD83D\uDC31' }] },
  { passage: 'She has a pet dog. The dog can run fast. The dog is on the sand.',
    question: 'Where is the dog?',
    correct: 'on the sand',
    options: [{ label: 'in the van', icon: '\uD83D\uDE90' }, { label: 'on the bed', icon: '\uD83D\uDECF\uFE0F' }, { label: 'on the sand', icon: '\uD83C\uDFD6\uFE0F' }] },
  { passage: 'I can see a big ship. The ship is on the sea. It has a red flag.',
    question: 'What does the ship have?',
    correct: 'a red flag',
    options: [{ label: 'a blue hat', icon: '\uD83E\uDDE2' }, { label: 'a red flag', icon: '\uD83D\uDEA9' }, { label: 'a big net', icon: '\uD83E\uDD45' }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function BeachDetective({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(CLUE_ROUNDS).slice(0, 4));
  const { completeGame, addCoins } = useGameStore();

  const current = rounds[round];
  const optionLabels = useMemo(() => current.options.map(o => o.label), [current]);

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `${current.passage} ${current.question}`,
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
    speakReveal(current.correct);
    const timer = setTimeout(() => {
      setShowQuestion(false);
      if (round >= rounds.length - 1) {
        completeGame(worldId, 'beach-detective');
        addCoins(12);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, rounds, worldId, completeGame, addCoins]);

  const handleAnswer = useCallback((answer: string) => {
    if (feedback || !doneSpeaking || shouldReveal) return;
    if (answer === current.correct) {
      const isLastRound = round >= rounds.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      setTimeout(() => {
        setFeedback(null);
        setShowQuestion(false);
        if (isLastRound) {
          completeGame(worldId, 'beach-detective');
          addCoins(12);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(answer, current.correct);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, current, round, rounds, worldId, completeGame, addCoins, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400/90 to-green-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {rounds.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />
        <span className="text-4xl">{'\uD83D\uDD0E'}</span>

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="bg-amber-50 border-4 border-amber-700 rounded-2xl px-6 py-5 shadow-xl max-w-sm w-full">
            <p className="text-lg font-bold font-[Fredoka] text-gray-800 leading-relaxed text-center">{current.passage}</p>
          </motion.div>
        </AnimatePresence>

        {showQuestion && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm">
            <p className="text-white font-[Nunito] text-center mb-3 text-lg">{current.question}</p>
            <div className="flex flex-col gap-3">
              {current.options.map((opt, i) => (
                <motion.button key={opt.label} whileTap={{ scale: 0.95 }} onClick={() => handleAnswer(opt.label)}
                  disabled={feedback !== null || !doneSpeaking || shouldReveal}
                  className={`w-full py-4 px-6 rounded-2xl text-lg font-bold font-[Fredoka] shadow-md flex items-center gap-3 transition-all ${
                    shouldReveal && opt.label === current.correct
                      ? 'bg-green-300 text-green-800 ring-4 ring-green-400 scale-105'
                      : feedback === 'correct' && opt.label === current.correct
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

      <CelebrationOverlay show={showCelebration} message="Mystery solved!" onComplete={onComplete} />
    </div>
  );
}
