'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface HuntRound {
  targetSound: string;
  items: { word: string; icon: string; startsWithTarget: boolean }[];
}

const ROUNDS: HuntRound[] = [
  { targetSound: 's', items: [
    { word: 'sun', icon: '☀️', startsWithTarget: true },
    { word: 'snake', icon: '🐍', startsWithTarget: true },
    { word: 'dog', icon: '🐶', startsWithTarget: false },
    { word: 'sock', icon: '🧦', startsWithTarget: true },
    { word: 'cat', icon: '🐱', startsWithTarget: false },
    { word: 'hat', icon: '🧢', startsWithTarget: false },
  ]},
  { targetSound: 'b', items: [
    { word: 'ball', icon: '⚽', startsWithTarget: true },
    { word: 'bird', icon: '🐦', startsWithTarget: true },
    { word: 'fish', icon: '🐟', startsWithTarget: false },
    { word: 'bus', icon: '🚌', startsWithTarget: true },
    { word: 'pen', icon: '🖊️', startsWithTarget: false },
    { word: 'cup', icon: '☕', startsWithTarget: false },
  ]},
  { targetSound: 'm', items: [
    { word: 'moon', icon: '🌙', startsWithTarget: true },
    { word: 'mouse', icon: '🐭', startsWithTarget: true },
    { word: 'tree', icon: '🌳', startsWithTarget: false },
    { word: 'milk', icon: '🥛', startsWithTarget: true },
    { word: 'bed', icon: '🛏️', startsWithTarget: false },
    { word: 'van', icon: '🚐', startsWithTarget: false },
  ]},
  { targetSound: 't', items: [
    { word: 'tiger', icon: '🐯', startsWithTarget: true },
    { word: 'tent', icon: '⛺', startsWithTarget: true },
    { word: 'rain', icon: '🌧️', startsWithTarget: false },
    { word: 'top', icon: '🪀', startsWithTarget: true },
    { word: 'leg', icon: '🦵', startsWithTarget: false },
    { word: 'egg', icon: '🥚', startsWithTarget: false },
  ]},
  { targetSound: 'p', items: [
    { word: 'pig', icon: '🐷', startsWithTarget: true },
    { word: 'pen', icon: '🖊️', startsWithTarget: true },
    { word: 'dog', icon: '🐶', startsWithTarget: false },
    { word: 'pot', icon: '🍲', startsWithTarget: true },
    { word: 'net', icon: '🥅', startsWithTarget: false },
    { word: 'hat', icon: '🧢', startsWithTarget: false },
  ]},
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoundHunt({ worldId, onComplete }: Props) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [wrongWord, setWrongWord] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(ROUNDS).slice(0, 4));
  const { completeGame, addCoins, incrementStreak, resetStreak } = useGameStore();

  const current = rounds[roundIdx];
  const targetCount = current.items.filter((i) => i.startsWithTarget).length;

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `Find everything that starts with ${current.targetSound}! Tap them all!`,
    current.items.map(i => i.word),
    [roundIdx],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(roundIdx);

  const correctItems = current.items.filter(i => i.startsWithTarget);
  const firstUnfound = correctItems.find(i => !found.has(i.word));

  useEffect(() => {
    if (shouldReveal && firstUnfound) {
      let cancelled = false;
      const run = async () => {
        await speakReveal(firstUnfound.word);
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;
        const next = new Set(found);
        next.add(firstUnfound.word);
        setFound(next);
        setFeedback(null);
      };
      run();
      return () => { cancelled = true; };
    }
  }, [shouldReveal, firstUnfound, found]);

  useEffect(() => {
    if (found.size >= targetCount && found.size > 0) {
      const timer = setTimeout(() => {
        if (roundIdx >= rounds.length - 1) {
          completeGame(worldId, 'sound-hunt');
          addCoins(8);
          setShowCelebration(true);
        } else {
          setRoundIdx((r) => r + 1);
          setFound(new Set());
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [found, targetCount, roundIdx, rounds, worldId, completeGame, addCoins]);

  const handleTap = useCallback(
    (item: HuntRound['items'][0]) => {
      if (feedback || found.has(item.word) || !doneSpeaking || shouldReveal) return;
      if (item.startsWithTarget) {
        const next = new Set(found);
        next.add(item.word);
        setFound(next);
        setFeedback('correct');
        const isGameDone = next.size >= targetCount && roundIdx >= rounds.length - 1;
        incrementStreak();
        (async () => {
          await speakFeedback(isGameDone ? 'complete' : 'correct');
          await new Promise(r => setTimeout(r, 400));
          setFeedback(null);
        })();
      } else {
        setFeedback('wrong');
        setWrongWord(item.word);
        recordWrong();
        speakWrongExplanation(item.word, current.targetSound, 'starts-with');
        resetStreak();
        setTimeout(() => { setFeedback(null); setWrongWord(null); }, 2000);
      }
    },
    [feedback, found, targetCount, roundIdx, rounds, doneSpeaking, shouldReveal, current, worldId, completeGame, addCoins, incrementStreak, resetStreak, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-500/75 to-orange-400/75 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-pink-600 text-lg">{found.size}/{targetCount}</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />
        <div className="bg-white/90 rounded-2xl px-6 py-3 shadow-lg inline-block mt-2">
          <span className="text-lg font-[Nunito] text-gray-600">Find things that start with </span>
          <span className="text-3xl font-bold font-[Fredoka] text-pink-600 lowercase">{current.targetSound}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-3 max-w-md w-full">
          {current.items.map((item, index) => {
            const isFound = found.has(item.word);
            const isBeingSpoken = activeOption === index;
            const revealThis = shouldReveal && item.startsWithTarget && !isFound;

            return (
              <motion.button
                key={item.word}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleTap(item)}
                disabled={isFound || feedback !== null || !doneSpeaking || shouldReveal}
                className={`aspect-square rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
                  isFound ? 'bg-green-200 ring-4 ring-green-400 scale-95' :
                  revealThis ? 'bg-green-200 ring-4 ring-green-400 animate-pulse' :
                  isBeingSpoken ? 'bg-white ring-4 ring-blue-400 scale-105' :
                  'bg-white/90'
                }`}
              >
                <span className="text-5xl">{item.icon}</span>
                {isFound && <span className="text-green-600 font-bold text-xs lowercase">{item.word}</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {feedback === 'wrong' && wrongWord && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
            className="text-center text-white font-bold text-lg mb-4">
            No, {wrongWord} starts with &quot;{wrongWord[0]}&quot;, not &quot;{current.targetSound}&quot;!
          </motion.p>
        )}
      </AnimatePresence>

      <CelebrationOverlay show={showCelebration} message="Great hunting!" onComplete={onComplete} />
    </div>
  );
}
