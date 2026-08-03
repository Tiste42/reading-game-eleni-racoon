'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakPhoneme, speakFeedback } from '@/lib/speech';
import { useComposedSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getInitialSoundGroups } from '@/content/registry';
import { buildSoundPictureCandidates } from '@/content/earlyRoundBuilders';
import { useContentSession } from '@/lib/useContentSession';
import { shuffleSeeded } from '@/lib/roundSelector';

interface SortRound {
  targetLetter: string;
  items: Array<{ word: string; startsWithTarget: boolean }>;
}

interface FlyState {
  word: string;
  dx: number;
  dy: number;
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoundSorting({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [sorted, setSorted] = useState<string[]>([]);
  const [flying, setFlying] = useState<FlyState | null>(null);
  const [wrongShake, setWrongShake] = useState<string | null>(null);
  const [basketBounce, setBasketBounce] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const basketRef = useRef<HTMLDivElement>(null);
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt, enabledContentPackIds } = useGameStore();
  const candidates = useMemo(
    () => buildSoundPictureCandidates(getInitialSoundGroups(enabledContentPackIds), 3, 3, 3),
    [enabledContentPackIds],
  );
  const session = useContentSession({
    gameId: 'first-sound',
    historyKey: 'world1-initial-sounds',
    candidates,
    count: 3,
    getId: (candidate) => candidate.id,
  });
  const rounds: SortRound[] = useMemo(() => session.items.map((candidate, index) => ({
    targetLetter: candidate.targetLetter,
    items: shuffleSeeded([
      ...candidate.targetWords.map((word) => ({ word, startsWithTarget: true })),
      ...candidate.distractorWords.map((word) => ({ word, startsWithTarget: false })),
    ], `${session.seed}:items:${index}`),
  })), [session]);

  const current = rounds[round];
  const isLastRound = round >= rounds.length - 1;
  const targetCount = current.items.filter((i) => i.startsWithTarget).length;
  const roundComplete = sorted.length >= targetCount;

  // Leni names every item (with its card highlighted), then repeats the
  // target sound. Reliable now that the iOS audio-element leak is fixed.
  const { activeOption, replay } = useComposedSpeech(
    [
      { say: 'Tap everything that starts with this sound!' },
      { pause: 200 },
      { phoneme: current.targetLetter },
      { pause: 350 },
      { options: current.items.map((i) => i.word) },
      { pause: 250 },
      { phoneme: current.targetLetter },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  // After 2 misses, pulse the remaining correct items as a visual hint
  const hintActive = shouldReveal;

  useEffect(() => {
    if (roundComplete) {
      const timer = setTimeout(() => {
        if (isLastRound) {
          completeGame(worldId, 'first-sound');
          addCoins(5);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
          setSorted([]);
          setFlying(null);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [roundComplete, isLastRound, worldId, completeGame, addCoins]);

  const handleTap = useCallback(
    (item: SortRound['items'][0], e: React.MouseEvent<HTMLButtonElement>) => {
      if (flying || sorted.includes(item.word)) return;

      if (item.startsWithTarget) {
        recordSoundAttempt(current.targetLetter, true);
        incrementStreak();
        playSoundEffect('coin');
        // Compute the arc into the basket from where the item sits
        const itemRect = e.currentTarget.getBoundingClientRect();
        const basketRect = basketRef.current?.getBoundingClientRect();
        const dx = basketRect
          ? basketRect.left + basketRect.width / 2 - (itemRect.left + itemRect.width / 2)
          : 0;
        const dy = basketRect
          ? basketRect.top + basketRect.height / 2 - (itemRect.top + itemRect.height / 2)
          : 200;
        setFlying({ word: item.word, dx, dy });
      } else {
        recordSoundAttempt(current.targetLetter, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongShake(item.word);
        (async () => {
          await speak(item.word);
          await speakFeedback('wrong');
          setWrongShake(null);
        })();
      }
    },
    [flying, sorted, current, recordWrong, resetStreak, incrementStreak, recordSoundAttempt],
  );

  const handleLanded = useCallback(() => {
    if (!flying) return;
    const word = flying.word;
    setFlying(null);
    setSorted((prev) => [...prev, word]);
    setBasketBounce((b) => b + 1);
    const isGameDone = sorted.length + 1 >= targetCount && isLastRound;
    speakFeedback(isGameDone ? 'complete' : 'correct');
  }, [flying, sorted, targetCount, isLastRound]);

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🧺"
      bgClassName="from-blue-400/85 via-blue-200/85 to-cyan-100/85"
    >
      {/* Target sound header */}
      <div className="text-center mb-3">
        <motion.div key={round} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-base text-blue-800 font-[Fredoka] font-semibold">Put everything that starts with...</p>
          <button
            onClick={() => speakPhoneme(current.targetLetter)}
            className="inline-flex items-center gap-2 bg-white/90 rounded-2xl px-6 py-2 shadow-lg mt-1 press-3d"
          >
            <span className="text-4xl font-bold font-[Fredoka] text-purple-600 lowercase">
              {current.targetLetter}
            </span>
            <span className="text-lg">🔊</span>
          </button>
          <p className="text-base text-blue-800 font-[Fredoka] font-semibold mt-1">...into Leni&apos;s basket!</p>
        </motion.div>
      </div>

      {/* Items grid */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          key={round}
          className="grid grid-cols-3 gap-4 max-w-md w-full"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {current.items.map((item, index) => {
            const isSorted = sorted.includes(item.word);
            const isFlying = flying?.word === item.word;
            const isBeingSpoken = activeOption === index;
            const hintThis = hintActive && item.startsWithTarget && !isSorted && !isFlying;

            return (
              <motion.button
                key={item.word}
                variants={{ hidden: { scale: 0 }, visible: { scale: 1 } }}
                onClick={(e) => handleTap(item, e)}
                disabled={isSorted || !!flying}
                animate={
                  isFlying
                    ? { x: flying.dx, y: flying.dy, scale: 0.25, rotate: 25, opacity: 0.9, zIndex: 30 }
                    : wrongShake === item.word
                      ? { x: [-8, 8, -8, 8, 0] }
                      : isSorted
                        ? { scale: 0, opacity: 0 }
                        : {}
                }
                transition={isFlying ? { duration: 0.55, ease: 'easeIn' } : { duration: 0.4 }}
                onAnimationComplete={isFlying ? handleLanded : undefined}
                className={`
                  relative tap-target flex-col rounded-3xl p-3 shadow-lg min-h-[120px] bg-white/95
                  ${isBeingSpoken ? 'ring-4 ring-blue-400 scale-105' : ''}
                  ${hintThis ? 'animate-hint-pulse ring-4 ring-yellow-300' : ''}
                `}
              >
                <WordCard word={item.word} size={72} />
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Leni + basket */}
      <div className="flex items-end justify-center gap-3 pb-2">
        <EleniCharacter pose={roundComplete ? 'celebrating' : 'standing'} size={130} />
        <div className="flex flex-col items-center">
          <motion.div
            ref={basketRef}
            key={basketBounce}
            initial={{ scale: 1 }}
            animate={basketBounce > 0 ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative text-8xl"
          >
            🧺
            <span className="absolute -top-2 -right-3 bg-purple-500 text-white font-[Fredoka] text-xl w-9 h-9 rounded-full flex items-center justify-center shadow lowercase">
              {current.targetLetter}
            </span>
          </motion.div>
          {/* fill stars */}
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: targetCount }).map((_, i) => (
              <motion.span
                key={i}
                initial={false}
                animate={i < sorted.length ? { scale: [0, 1.6, 1] } : {}}
                className={`text-lg ${i < sorted.length ? '' : 'opacity-30 grayscale'}`}
              >
                ⭐
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Super sorting!" onComplete={onComplete} />
    </GameShell>
  );
}
