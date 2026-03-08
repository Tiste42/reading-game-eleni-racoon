'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import ReplayButton from '@/components/ui/ReplayButton';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface SortItem {
  word: string;
  icon: string;
  startsWith: string;
}

interface SortRound {
  bucketA: string;
  bucketB: string;
  items: SortItem[];
}

const ROUNDS: SortRound[] = [
  { bucketA: 's', bucketB: 't', items: [
    { word: 'sun', icon: getIcon('sun'), startsWith: 's' },
    { word: 'top', icon: getIcon('top'), startsWith: 't' },
    { word: 'sock', icon: getIcon('sock'), startsWith: 's' },
    { word: 'tent', icon: getIcon('tent'), startsWith: 't' },
  ]},
  { bucketA: 'p', bucketB: 'n', items: [
    { word: 'pig', icon: getIcon('pig'), startsWith: 'p' },
    { word: 'net', icon: getIcon('net'), startsWith: 'n' },
    { word: 'pen', icon: getIcon('pen'), startsWith: 'p' },
    { word: 'nut', icon: getIcon('nut'), startsWith: 'n' },
  ]},
  { bucketA: 'a', bucketB: 'e', items: [
    { word: 'apple', icon: getIcon('apple'), startsWith: 'a' },
    { word: 'egg', icon: getIcon('egg'), startsWith: 'e' },
    { word: 'ant', icon: getIcon('ant'), startsWith: 'a' },
    { word: 'elf', icon: getIcon('elf'), startsWith: 'e' },
  ]},
  { bucketA: 'l', bucketB: 'i', items: [
    { word: 'lemon', icon: getIcon('lemon'), startsWith: 'l' },
    { word: 'igloo', icon: getIcon('igloo'), startsWith: 'i' },
    { word: 'lamp', icon: getIcon('lamp'), startsWith: 'l' },
    { word: 'ink', icon: getIcon('ink'), startsWith: 'i' },
  ]},
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoundSort({ worldId, onComplete }: Props) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [sorted, setSorted] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<SortItem | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [wrongBucketMsg, setWrongBucketMsg] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(ROUNDS).slice(0, 3));
  const { completeGame, addCoins } = useGameStore();

  const current = rounds[roundIdx];
  const unsorted = current.items.filter((i) => !sorted.has(i.word));

  const { activeOption, doneSpeaking, replay } = useGameSpeechWithOptions(
    `Sort the pictures! Does it start with ${current.bucketA} or ${current.bucketB}?`,
    current.items.map(i => i.word),
    [roundIdx],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(roundIdx);

  const firstUnsorted = unsorted[0];

  useEffect(() => {
    if (shouldReveal && firstUnsorted) {
      speakReveal(`${firstUnsorted.word} starts with ${firstUnsorted.startsWith}, put it in the ${firstUnsorted.startsWith} bucket`);
      const timer = setTimeout(() => {
        const next = new Set(sorted);
        next.add(firstUnsorted.word);
        setSorted(next);
        setFeedback(null);
        setSelectedItem(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, firstUnsorted, sorted]);

  useEffect(() => {
    if (sorted.size >= current.items.length && sorted.size > 0) {
      if (roundIdx >= rounds.length - 1) {
        completeGame(worldId, 'sound-sort');
        addCoins(8);
        setShowCelebration(true);
      } else {
        const timer = setTimeout(() => {
          setRoundIdx((r) => r + 1);
          setSorted(new Set());
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [sorted, current, roundIdx, rounds, worldId, completeGame, addCoins]);

  const handleItemTap = useCallback((item: SortItem) => {
    if (feedback || sorted.has(item.word) || !doneSpeaking || shouldReveal) return;
    setSelectedItem(item);
  }, [feedback, sorted, doneSpeaking, shouldReveal]);

  const handleBucketTap = useCallback((bucket: string) => {
    if (!selectedItem || feedback || shouldReveal) return;
    if (selectedItem.startsWith === bucket) {
      const isLastItem = (() => { const next = new Set(sorted); next.add(selectedItem.word); return next.size >= current.items.length && roundIdx >= rounds.length - 1; })();
      setFeedback('correct');
      speakFeedback(isLastItem ? 'complete' : 'correct');
      const next = new Set(sorted);
      next.add(selectedItem.word);
      setSorted(next);
      setTimeout(() => {
        setFeedback(null);
        setSelectedItem(null);
      }, 700);
    } else {
      setFeedback('wrong');
      recordWrong();
      const msg = `No, ${selectedItem.word} starts with ${selectedItem.startsWith}, put it in the ${selectedItem.startsWith} bucket!`;
      setWrongBucketMsg(msg);
      // Play pre-generated wrong feedback instead of dynamic browser TTS
      speakFeedback('wrong');
      setTimeout(() => { setFeedback(null); setSelectedItem(null); setWrongBucketMsg(null); }, 2000);
    }
  }, [selectedItem, feedback, shouldReveal, sorted, current, roundIdx, rounds, worldId, completeGame, addCoins, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/90 to-pink-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">

        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>

          <ReplayButton onReplay={replay} />

        </div>
        <span className="text-white font-[Fredoka]">Round {roundIdx + 1}/{rounds.length}</span>
      </div>

      <div className="text-center mb-4">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />
        <p className="text-white/80 font-[Nunito] text-sm mt-1">Tap a picture, then sort it!</p>
      </div>

      {/* Items to sort */}
      <div className="flex gap-3 justify-center mb-6">
        {unsorted.map((item, idx) => {
          const globalIdx = current.items.findIndex(i => i.word === item.word);
          const isBeingSpoken = activeOption === globalIdx;
          const revealThis = shouldReveal && item.word === firstUnsorted?.word;

          return (
            <motion.button key={item.word} whileTap={{ scale: 0.9 }} onClick={() => handleItemTap(item)}
              disabled={!doneSpeaking || shouldReveal}
              className={`w-20 h-20 rounded-2xl shadow-lg flex items-center justify-center text-4xl transition-all ${
                selectedItem?.word === item.word ? 'bg-yellow-200 ring-4 ring-yellow-400' :
                revealThis ? 'bg-green-200 ring-4 ring-green-400 animate-pulse' :
                isBeingSpoken ? 'bg-white ring-4 ring-blue-400 scale-105' :
                'bg-white/90'
              }`}>
              {item.icon}
            </motion.button>
          );
        })}
        {unsorted.length === 0 && (
          <p className="text-white font-[Fredoka] text-lg">All sorted!</p>
        )}
      </div>

      {/* Buckets */}
      <div className="flex gap-4 max-w-md mx-auto w-full flex-1">
        {[current.bucketA, current.bucketB].map((bucket) => {
          const bucketItems = current.items.filter((i) => i.startsWith === bucket && sorted.has(i.word));
          return (
            <motion.button key={bucket} whileTap={selectedItem ? { scale: 0.95 } : undefined}
              onClick={() => handleBucketTap(bucket)}
              className="flex-1 rounded-3xl bg-white/20 border-3 border-dashed border-white/50 flex flex-col items-center justify-start p-4 gap-2 min-h-[200px]">
              <span className="text-4xl font-bold font-[Fredoka] text-white lowercase">{bucket}</span>
              <div className="flex flex-wrap gap-2 justify-center">
                {bucketItems.map((i) => (
                  <span key={i.word} className="text-3xl">{i.icon}</span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {feedback === 'wrong' && wrongBucketMsg && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
            className="text-center text-white font-bold text-lg mt-3">{wrongBucketMsg}</motion.p>
        )}
      </AnimatePresence>

      <CelebrationOverlay show={showCelebration} message="Sorting star!" onComplete={onComplete} />
    </div>
  );
}
