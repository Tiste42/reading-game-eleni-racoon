'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface PuzzlePiece {
  word: string;
  icon: string;
  distractors: string[];
}

// Show a picture, child must READ the word options and pick the right one
const PIECES: PuzzlePiece[] = [
  { word: 'sat', icon: getIcon('sat'), distractors: ['pin', 'net'] },
  { word: 'pet', icon: getIcon('pet'), distractors: ['tap', 'sip'] },
  { word: 'ten', icon: getIcon('ten'), distractors: ['pan', 'tip'] },
  { word: 'nap', icon: getIcon('nap'), distractors: ['let', 'set'] },
  { word: 'lip', icon: getIcon('lip'), distractors: ['pen', 'tin'] },
  { word: 'pen', icon: getIcon('pen'), distractors: ['nip', 'pat'] },
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

  // Shuffle word options (correct word + distractors as text)
  const wordChoices = useMemo(
    () => shuffle([current.word, ...current.distractors]),
    [current]
  );

  // Don't read the words — child must read them to find the match
  useGameSpeech(
    feedback ? null : 'Which word matches the picture? Read the words!',
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
    if (feedback || shouldReveal) return;
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
  }, [feedback, shouldReveal, current, round, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-400/90 to-orange-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-amber-600">{solved.length}/{PIECES.length}</span>
        </div>
      </div>

      {/* Puzzle grid showing progress */}
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-6">
        {PIECES.map((piece, i) => (
          <div key={i} className={`aspect-square rounded-xl ${
            solved.includes(i) ? 'bg-amber-200' : 'bg-white/20 border-2 border-dashed border-white/40'
          } flex items-center justify-center text-3xl`}>
            {solved.includes(i) ? piece.icon : ''}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        {/* Show the PICTURE — child must find the matching word */}
        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="bg-white/90 rounded-2xl px-10 py-6 shadow-xl flex flex-col items-center gap-2">
            <span className="text-6xl">{current.icon}</span>
            <p className="text-sm text-gray-400 font-[Nunito]">Which word is this?</p>
          </motion.div>
        </AnimatePresence>

        {/* Word options — child must READ these */}
        <div className="flex gap-3">
          {wordChoices.map((word) => (
            <motion.button key={word} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(word)}
              disabled={feedback !== null || shouldReveal}
              className={`px-6 py-4 rounded-2xl shadow-lg transition-all ${
                shouldReveal && word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : feedback === 'correct' && word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : 'bg-white/90'
              }`}>
              <span className="text-2xl font-bold font-[Fredoka] text-gray-800 lowercase">{word}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Puzzle complete!" onComplete={onComplete} />
    </div>
  );
}
