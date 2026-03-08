'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';

interface RaceWord {
  word: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const RACE_WORDS: RaceWord[] = [
  { word: 'sat', icon: '🪑', distractors: [{ word: 'pin', icon: '📌' }, { word: 'net', icon: '🥅' }] },
  { word: 'pan', icon: '🍳', distractors: [{ word: 'sit', icon: '🪑' }, { word: 'let', icon: '✅' }] },
  { word: 'tip', icon: '📌', distractors: [{ word: 'nap', icon: '💤' }, { word: 'set', icon: '✅' }] },
  { word: 'pen', icon: '🖊️', distractors: [{ word: 'tap', icon: '🚰' }, { word: 'tin', icon: '🥫' }] },
  { word: 'pet', icon: '🐶', distractors: [{ word: 'nip', icon: '❄️' }, { word: 'sip', icon: '🥤' }] },
  { word: 'ten', icon: '🔟', distractors: [{ word: 'pat', icon: '👋' }, { word: 'lip', icon: '👄' }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SailboatRace({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [boatProgress, setBoatProgress] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(RACE_WORDS).slice(0, 5));
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak } = useGameStore();

  const current = words[round];

  const choices = useMemo(
    () => shuffle([{ word: current.word, icon: current.icon }, ...current.distractors]),
    [current]
  );

  // Don't say the word — child must READ it and match to the picture
  useGameSpeech(
    feedback ? null : 'Read the word! Sail to the right island!',
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(current.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        if (round >= words.length - 1) {
          completeGame(worldId, 'sailboat-race');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current.word, round, words.length, worldId, completeGame, addCoins]);

  const handleChoice = useCallback((chosen: string) => {
    if (feedback || shouldReveal) return;
    if (chosen === current.word) {
      const isLastRound = round >= words.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      incrementStreak();
      masterWord(current.word);
      setBoatProgress((p) => p + 20);
      setTimeout(() => {
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'sailboat-race');
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
      resetStreak();
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, shouldReveal, current, round, words, worldId, completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordWrong]);

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

      <div className="bg-blue-400/30 rounded-full h-8 mx-4 mb-6 overflow-hidden relative">
        <motion.div animate={{ width: `${boatProgress}%` }} className="bg-blue-400 h-full rounded-full" />
        <motion.span animate={{ left: `${boatProgress}%` }} className="absolute top-0 text-2xl" style={{ marginLeft: -12 }}>
          ⛵
        </motion.span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }} className="bg-white/90 rounded-2xl px-10 py-6 shadow-xl text-center">
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.word}</span>
          </motion.div>
        </AnimatePresence>

        <p className="text-white/80 font-[Nunito] text-sm">Read the word and sail to the right island!</p>

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

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">Wrong island! Try again!</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Race won!" onComplete={onComplete} />
    </div>
  );
}
