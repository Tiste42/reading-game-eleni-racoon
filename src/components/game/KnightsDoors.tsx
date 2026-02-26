'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface DoorRound {
  target: string;
  doors: { word: string; icon: string; funny?: string }[];
  correctIndex: number;
}

const DOOR_ROUNDS: DoorRound[] = [
  { target: 'cat', doors: [
    { word: 'cat', icon: '🐱' },
    { word: 'hat', icon: '🧢', funny: 'A hat, not a cat!' },
    { word: 'bat', icon: '🦇', funny: 'A bat flew out!' },
  ], correctIndex: 0 },
  { target: 'dog', doors: [
    { word: 'log', icon: '🪵', funny: 'Just a log!' },
    { word: 'dog', icon: '🐶' },
    { word: 'fog', icon: '🌫️', funny: 'So foggy!' },
  ], correctIndex: 1 },
  { target: 'cup', doors: [
    { word: 'pup', icon: '🐶', funny: 'A puppy said hi!' },
    { word: 'cut', icon: '✂️', funny: 'Scissors!' },
    { word: 'cup', icon: '☕' },
  ], correctIndex: 2 },
  { target: 'hen', doors: [
    { word: 'hen', icon: '🐔' },
    { word: 'pen', icon: '🖊️', funny: 'Just a pen!' },
    { word: 'ten', icon: '🔟', funny: 'The number ten!' },
  ], correctIndex: 0 },
  { target: 'bed', doors: [
    { word: 'red', icon: '🔴', funny: 'Red paint!' },
    { word: 'bed', icon: '🛏️' },
    { word: 'fed', icon: '🍽️', funny: 'Dinner time!' },
  ], correctIndex: 1 },
  { target: 'van', doors: [
    { word: 'man', icon: '👨', funny: 'A man waved!' },
    { word: 'fan', icon: '🌬️', funny: 'Breezy!' },
    { word: 'van', icon: '🚐' },
  ], correctIndex: 2 },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function KnightsDoors({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [openedDoor, setOpenedDoor] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [funnyMsg, setFunnyMsg] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(DOOR_ROUNDS).slice(0, 5));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = rounds[round];

  const doorWords = useMemo(() => current.doors.map(d => d.word), [current]);

  const instruction = feedback
    ? null
    : `Find the door that says ${current.target}!`;

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    instruction,
    doorWords,
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(current.target);
      const timer = setTimeout(() => {
        setFeedback(null);
        setOpenedDoor(null);
        setFunnyMsg('');
        if (round >= rounds.length - 1) {
          completeGame(worldId, 'knights-doors');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current.target, round, rounds.length, worldId, completeGame, addCoins]);

  const handleDoor = useCallback((idx: number) => {
    if (feedback !== null || !doneSpeaking || shouldReveal) return;
    setOpenedDoor(idx);
    if (idx === current.correctIndex) {
      const isLastRound = round >= rounds.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      masterWord(current.target);
      setTimeout(() => {
        setFeedback(null);
        setOpenedDoor(null);
        if (isLastRound) {
          completeGame(worldId, 'knights-doors');
          addCoins(10);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1200);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(current.doors[idx].word, current.target);
      setFunnyMsg(current.doors[idx].funny || 'Not this door!');
      setTimeout(() => {
        setFeedback(null);
        setOpenedDoor(null);
        setFunnyMsg('');
      }, 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, current, round, rounds, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500/90 to-teal-400/90 px-4 py-6 flex flex-col">
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
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'waving'} size={70} />
        <div className="bg-white/90 rounded-2xl px-6 py-3 shadow-lg text-center">
          <p className="text-sm font-[Nunito] text-gray-500">Find the door that says:</p>
          <p className="text-3xl font-bold font-[Fredoka] text-emerald-700 lowercase">{current.target}</p>
        </div>

        <div className="flex gap-4">
          {current.doors.map((door, i) => (
            <motion.button key={i} whileTap={{ scale: 0.9 }} onClick={() => handleDoor(i)}
              disabled={!doneSpeaking || feedback !== null || shouldReveal}
              className={`w-28 h-36 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-2 transition-all ${
                shouldReveal && i === current.correctIndex
                  ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : openedDoor === i
                  ? feedback === 'correct' ? 'bg-green-200 ring-4 ring-green-400' : 'bg-red-100'
                  : activeOption === i
                  ? 'bg-amber-700 ring-4 ring-blue-400 scale-105'
                  : 'bg-amber-700'
              }`}>
              {openedDoor === i || (shouldReveal && i === current.correctIndex) ? (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl">{door.icon}</motion.span>
              ) : (
                <>
                  <span className="text-3xl">🚪</span>
                  <span className="text-lg font-bold font-[Fredoka] text-white lowercase">{door.word}</span>
                </>
              )}
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {funnyMsg && (
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold text-center">{funnyMsg}</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="All doors opened!" onComplete={onComplete} />
    </div>
  );
}
