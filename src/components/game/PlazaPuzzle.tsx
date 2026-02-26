'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface PuzzlePiece {
  word: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const PIECES: PuzzlePiece[] = [
  { word: 'sat', icon: '🪑', distractors: [{ word: 'pin', icon: '📌' }, { word: 'net', icon: '🥅' }] },
  { word: 'pet', icon: '🐶', distractors: [{ word: 'tap', icon: '🚰' }, { word: 'sip', icon: '🥤' }] },
  { word: 'ten', icon: '🔟', distractors: [{ word: 'pan', icon: '🍳' }, { word: 'tip', icon: '📌' }] },
  { word: 'nap', icon: '💤', distractors: [{ word: 'let', icon: '✅' }, { word: 'set', icon: '✅' }] },
  { word: 'lip', icon: '👄', distractors: [{ word: 'pen', icon: '🖊️' }, { word: 'tin', icon: '🥫' }] },
  { word: 'pen', icon: '🖊️', distractors: [{ word: 'nip', icon: '❄️' }, { word: 'pat', icon: '👋' }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function PlazaPuzzle({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [solved, setSolved] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = PIECES[round];

  const choices = useMemo(
    () => shuffle([{ word: current.word, icon: current.icon }, ...current.distractors]),
    [current]
  );

  const optionNames = useMemo(() => choices.map(c => c.word), [choices]);

  const instruction = feedback
    ? null
    : `Read the word: ${current.word}. Which picture matches?`;

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    instruction,
    optionNames,
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(current.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        setSolved(s => [...s, round]);
        if (round >= PIECES.length - 1) {
          completeGame(worldId, 'plaza-puzzle');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current.word, round, worldId, completeGame, addCoins]);

  const handleChoice = useCallback((chosen: string) => {
    if (feedback || !doneSpeaking || shouldReveal) return;
    if (chosen === current.word) {
      const isLastRound = round >= PIECES.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      masterWord(current.word);
      setSolved((s) => [...s, round]);
      setTimeout(() => {
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'plaza-puzzle');
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
  }, [feedback, doneSpeaking, shouldReveal, current, round, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-400/90 to-orange-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-amber-600">{solved.length}/{PIECES.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-6">
        {PIECES.map((_, i) => (
          <div key={i} className={`aspect-square rounded-xl ${
            solved.includes(i) ? 'bg-amber-200' : 'bg-white/20 border-2 border-dashed border-white/40'
          } flex items-center justify-center text-3xl`}>
            {solved.includes(i) ? PIECES[i].icon : ''}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="bg-white/90 rounded-2xl px-10 py-6 shadow-xl">
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.word}</span>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4">
          {choices.map((choice, idx) => (
            <motion.button key={choice.word} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(choice.word)}
              disabled={!doneSpeaking || feedback !== null || shouldReveal}
              className={`w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
                shouldReveal && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : feedback === 'correct' && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : activeOption === idx
                  ? 'bg-white/90 ring-4 ring-blue-400 scale-105'
                  : 'bg-white/90'
              }`}>
              <span className="text-4xl">{choice.icon}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Puzzle complete!" onComplete={onComplete} />
    </div>
  );
}
