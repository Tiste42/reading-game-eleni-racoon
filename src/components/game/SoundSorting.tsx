'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import ReplayButton from '@/components/ui/ReplayButton';
import { useGameStore } from '@/lib/store';
import { speak, speakPhoneme, speakFeedback, speakWrongExplanation, speakReveal, stopSpeaking } from '@/lib/speech';
import { useWrongAttempts } from '@/lib/useGameSpeech';

interface SortRound {
  targetSound: string;
  targetLetter: string;
  items: Array<{ word: string; icon: string; startsWithTarget: boolean }>;
}

const SORT_ROUNDS: SortRound[] = [
  {
    targetSound: 'sss',
    targetLetter: 's',
    items: [
      { word: 'sun', icon: '☀️', startsWithTarget: true },
      { word: 'sock', icon: '🧦', startsWithTarget: true },
      { word: 'ball', icon: '🏀', startsWithTarget: false },
      { word: 'star', icon: '⭐', startsWithTarget: true },
      { word: 'dog', icon: '🐶', startsWithTarget: false },
      { word: 'snake', icon: '🐍', startsWithTarget: true },
    ],
  },
  {
    targetSound: 'mmm',
    targetLetter: 'm',
    items: [
      { word: 'moon', icon: '🌙', startsWithTarget: true },
      { word: 'cat', icon: '🐱', startsWithTarget: false },
      { word: 'mouse', icon: '🐭', startsWithTarget: true },
      { word: 'milk', icon: '🥛', startsWithTarget: true },
      { word: 'tree', icon: '🌳', startsWithTarget: false },
      { word: 'map', icon: '🗺️', startsWithTarget: true },
    ],
  },
  {
    targetSound: 'ttt',
    targetLetter: 't',
    items: [
      { word: 'tiger', icon: '🐯', startsWithTarget: true },
      { word: 'tent', icon: '⛺', startsWithTarget: true },
      { word: 'fish', icon: '🐟', startsWithTarget: false },
      { word: 'top', icon: '🔝', startsWithTarget: true },
      { word: 'hat', icon: '🎩', startsWithTarget: false },
      { word: 'turtle', icon: '🐢', startsWithTarget: true },
    ],
  },
];

interface Props {
  worldId: number;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function SoundSorting({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [sorted, setSorted] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, incrementStreak, resetStreak } = useGameStore();

  // Shuffle round order and item positions within each round
  const [rounds] = useState(() =>
    shuffle(SORT_ROUNDS).map(r => ({ ...r, items: shuffle(r.items) }))
  );

  const currentRound = rounds[round];
  const isLastRound = round >= rounds.length - 1;
  const targetCount = currentRound.items.filter((i) => i.startsWithTarget).length;
  const roundComplete = sorted.length >= targetCount;

  // Custom speech: generic prompt → phoneme sound → option words
  const [activeOption, setActiveOption] = useState(-1);
  const runIdRef = useRef(0);

  useEffect(() => {
    const thisRun = ++runIdRef.current;
    setActiveOption(-1);

    const run = async () => {
      if (thisRun !== runIdRef.current) return;
      await speak('Tap everything that starts with this sound!');
      if (thisRun !== runIdRef.current) return;
      await new Promise(r => setTimeout(r, 200));
      if (thisRun !== runIdRef.current) return;
      await speakPhoneme(currentRound.targetLetter);
      if (thisRun !== runIdRef.current) return;
      await new Promise(r => setTimeout(r, 400));

      const items = currentRound.items;
      for (let i = 0; i < items.length; i++) {
        if (thisRun !== runIdRef.current) return;
        setActiveOption(i);
        await speak(items[i].word);
        if (thisRun !== runIdRef.current) return;
        await new Promise(r => setTimeout(r, 350));
      }
      if (thisRun !== runIdRef.current) return;
      setActiveOption(-1);
    };

    const timer = setTimeout(run, 500);
    return () => {
      clearTimeout(timer);
      runIdRef.current++;
      stopSpeaking();
    };
  }, [round]);
  const doneSpeaking = true;

  const handleReplay = useCallback(() => {
    const thisRun = ++runIdRef.current;
    setActiveOption(-1);
    stopSpeaking();
    const run = async () => {
      if (thisRun !== runIdRef.current) return;
      await speak('Tap everything that starts with this sound!');
      if (thisRun !== runIdRef.current) return;
      await new Promise(r => setTimeout(r, 200));
      if (thisRun !== runIdRef.current) return;
      await speakPhoneme(currentRound.targetLetter);
      if (thisRun !== runIdRef.current) return;
      await new Promise(r => setTimeout(r, 400));
      const items = currentRound.items;
      for (let i = 0; i < items.length; i++) {
        if (thisRun !== runIdRef.current) return;
        setActiveOption(i);
        await speak(items[i].word);
        if (thisRun !== runIdRef.current) return;
        await new Promise(r => setTimeout(r, 350));
      }
      if (thisRun !== runIdRef.current) return;
      setActiveOption(-1);
    };
    run();
  }, [currentRound]);

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  const correctItems = currentRound.items.filter(i => i.startsWithTarget);
  const firstUnsortedCorrect = correctItems.find(i => !sorted.includes(i.word));

  useEffect(() => {
    if (shouldReveal && firstUnsortedCorrect) {
      speakReveal(firstUnsortedCorrect.word);
      const timer = setTimeout(() => {
        setSorted(prev => [...prev, firstUnsortedCorrect.word]);
        setFeedback(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, firstUnsortedCorrect]);

  useEffect(() => {
    if (roundComplete) {
      if (isLastRound) {
        completeGame(worldId, 'first-sound');
        addCoins(5);
        setShowCelebration(true);
      } else {
        const timer = setTimeout(() => {
          setRound((r) => r + 1);
          setSorted([]);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [roundComplete, isLastRound, worldId, completeGame, addCoins]);

  const handleTap = useCallback((item: typeof currentRound.items[0]) => {
    if (feedback || sorted.includes(item.word) || !doneSpeaking || shouldReveal) return;

    if (item.startsWithTarget) {
      const isLastItem = sorted.length + 1 >= targetCount && isLastRound;
      setFeedback('correct');
      speakFeedback(isLastItem ? 'complete' : 'correct');
      setSorted((prev) => [...prev, item.word]);
      incrementStreak();
      setTimeout(() => {
        setFeedback(null);
      }, 800);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(item.word, currentRound.targetLetter, 'starts-with');
      resetStreak();
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, sorted, targetCount, isLastRound, round, doneSpeaking, shouldReveal, currentRound, completeGame, addCoins, incrementStreak, resetStreak, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400/90 via-blue-200/90 to-cyan-100/90 px-4 py-6 flex flex-col">
      {/* Back button */}
      <div className="flex items-center gap-2">

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onComplete}
        className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md self-start mb-4"
        aria-label="Back"
      >
        ◀
      </motion.button>

        <ReplayButton onReplay={handleReplay} />

      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-4">
        {rounds.map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < round ? 'bg-green-400' :
              i === round ? 'bg-white scale-125 ring-2 ring-pink-400' :
              'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Instruction area */}
      <div className="text-center mb-4">
        <EleniCharacter
          pose={feedback === 'correct' ? 'celebrating' : 'excited'}
          size={90}
        />
        <motion.div key={round} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm text-white font-[Nunito] mt-1">
            Tap everything that starts with...
          </p>
          <div className="inline-flex items-center bg-white/80 rounded-2xl px-6 py-3 shadow-lg mt-2">
            <span className="text-4xl font-bold font-[Fredoka] text-purple-600 lowercase">
              {currentRound.targetLetter}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Items grid */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          key={round}
          className="grid grid-cols-3 gap-3 max-w-md w-full"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          {currentRound.items.map((item, index) => {
            const isSorted = sorted.includes(item.word);
            const isBeingSpoken = activeOption === index;
            const revealThis = shouldReveal && item.startsWithTarget && !isSorted;

            return (
              <motion.button
                key={item.word}
                variants={{
                  hidden: { scale: 0 },
                  visible: { scale: 1 },
                }}
                whileTap={!isSorted ? { scale: 0.9 } : undefined}
                onClick={() => handleTap(item)}
                disabled={isSorted || !doneSpeaking || shouldReveal}
                className={`
                  tap-target flex-col rounded-3xl p-3 shadow-lg min-h-[100px]
                  transition-all
                  ${isSorted
                    ? 'bg-green-200 ring-3 ring-green-400 opacity-80'
                    : revealThis
                    ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                    : isBeingSpoken
                    ? 'bg-white ring-4 ring-blue-400 scale-105'
                    : 'bg-white/90 hover:bg-white active:bg-pink-50'
                  }
                `}
              >
                <span className="text-4xl">{item.icon}</span>
                {isSorted && <span className="text-lg mt-1">✅</span>}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback === 'wrong' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1, x: [-5, 5, -5, 5, 0] }}
            exit={{ y: 50, opacity: 0 }}
            className="text-center py-3"
          >
            <span className="text-3xl">🤔</span>
            <p className="text-sm text-white mt-1">That doesn&apos;t start with &quot;{currentRound.targetLetter}&quot;</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sorted count */}
      <div className="text-center py-3">
        <div className="inline-flex gap-1">
          {Array.from({ length: targetCount }).map((_, i) => (
            <span key={i} className="text-2xl">{i < sorted.length ? '⭐' : '☆'}</span>
          ))}
        </div>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message="Amazing!"
        onComplete={onComplete}
      />
    </div>
  );
}
