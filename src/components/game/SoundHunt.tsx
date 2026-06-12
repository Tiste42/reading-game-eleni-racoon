'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakPhoneme, speakFeedback, speakReveal } from '@/lib/speech';
import { useComposedSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

interface HuntRound {
  targetSound: string;
  items: { word: string; startsWithTarget: boolean }[];
}

const ROUNDS: HuntRound[] = [
  { targetSound: 's', items: [
    { word: 'sun', startsWithTarget: true },
    { word: 'snake', startsWithTarget: true },
    { word: 'dog', startsWithTarget: false },
    { word: 'sock', startsWithTarget: true },
    { word: 'cat', startsWithTarget: false },
    { word: 'hat', startsWithTarget: false },
  ]},
  { targetSound: 'b', items: [
    { word: 'ball', startsWithTarget: true },
    { word: 'bird', startsWithTarget: true },
    { word: 'fish', startsWithTarget: false },
    { word: 'bus', startsWithTarget: true },
    { word: 'pen', startsWithTarget: false },
    { word: 'cup', startsWithTarget: false },
  ]},
  { targetSound: 'm', items: [
    { word: 'moon', startsWithTarget: true },
    { word: 'mouse', startsWithTarget: true },
    { word: 'tree', startsWithTarget: false },
    { word: 'milk', startsWithTarget: true },
    { word: 'bed', startsWithTarget: false },
    { word: 'van', startsWithTarget: false },
  ]},
  { targetSound: 't', items: [
    { word: 'tiger', startsWithTarget: true },
    { word: 'tent', startsWithTarget: true },
    { word: 'rain', startsWithTarget: false },
    { word: 'top', startsWithTarget: true },
    { word: 'leg', startsWithTarget: false },
    { word: 'egg', startsWithTarget: false },
  ]},
  { targetSound: 'p', items: [
    { word: 'pig', startsWithTarget: true },
    { word: 'pen', startsWithTarget: true },
    { word: 'dog', startsWithTarget: false },
    { word: 'pot', startsWithTarget: true },
    { word: 'net', startsWithTarget: false },
    { word: 'hat', startsWithTarget: false },
  ]},
];

// Scattered scene slots: % positions with playful rotation/scale variety
const SLOTS = [
  { left: 4, top: 4, rot: -8, scale: 1.0 },
  { left: 62, top: 2, rot: 7, scale: 1.1 },
  { left: 32, top: 26, rot: -4, scale: 0.95 },
  { left: 68, top: 44, rot: 9, scale: 1.05 },
  { left: 6, top: 50, rot: 5, scale: 1.08 },
  { left: 38, top: 66, rot: -7, scale: 1.0 },
];

// Long delay so the hint helps a stuck child without giving answers away
// (the naming sequence itself takes ~12s, so the hint must come well after)
const HINT_DELAY_MS = 22000;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoundHunt({ worldId, onComplete }: Props) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [wrongShake, setWrongShake] = useState<string | null>(null);
  const [hintWord, setHintWord] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() =>
    shuffle(ROUNDS).slice(0, 4).map((r) => ({ ...r, items: shuffle(r.items) })),
  );
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[roundIdx];
  const targetItems = current.items.filter((i) => i.startsWithTarget);
  const targetCount = targetItems.length;
  const roundDone = found.length >= targetCount;

  // Leni names every item (with its circle highlighted) so the child knows
  // what each picture is, then gives the target sound. The old cut-off-after-
  // one-word problem was the iOS audio-element leak, fixed in speech.ts.
  const { activeOption, replay } = useComposedSpeech(
    [
      { say: 'Tap everything that starts with this sound!' },
      { pause: 200 },
      { phoneme: current.targetSound },
      { pause: 350 },
      { options: current.items.map((i) => i.word) },
      { pause: 250 },
      { phoneme: current.targetSound },
    ],
    [roundIdx],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(roundIdx, 3);

  // Gentle idle hint: only after a LONG quiet stretch (don't give answers away)
  useEffect(() => {
    if (roundDone) return;
    setHintWord(null);
    const timer = setTimeout(() => {
      const remaining = targetItems.find((i) => !found.includes(i.word));
      if (remaining) setHintWord(remaining.word);
    }, HINT_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, roundIdx, roundDone]);

  // Too many wrong taps: reveal one target outright
  useEffect(() => {
    if (shouldReveal && !roundDone) {
      const remaining = targetItems.find((i) => !found.includes(i.word));
      if (remaining) {
        let cancelled = false;
        (async () => {
          await speakReveal(remaining.word);
          if (cancelled) return;
          setFound((f) => (f.includes(remaining.word) ? f : [...f, remaining.word]));
        })();
        return () => { cancelled = true; };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, roundDone]);

  useEffect(() => {
    if (roundDone && found.length > 0) {
      const timer = setTimeout(() => {
        if (roundIdx >= rounds.length - 1) {
          completeGame(worldId, 'sound-hunt');
          addCoins(8);
          setShowCelebration(true);
        } else {
          setRoundIdx((r) => r + 1);
          setFound([]);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [roundDone, found, roundIdx, rounds.length, worldId, completeGame, addCoins]);

  const handleTap = useCallback(
    (item: HuntRound['items'][0]) => {
      if (found.includes(item.word) || roundDone) return;

      if (item.startsWithTarget) {
        recordSoundAttempt(current.targetSound, true);
        incrementStreak();
        playSoundEffect('coin');
        setFound((f) => [...f, item.word]);
        setHintWord(null);
        const willBeDone = found.length + 1 >= targetCount;
        const isGameDone = willBeDone && roundIdx >= rounds.length - 1;
        speakFeedback(isGameDone ? 'complete' : 'correct');
      } else {
        recordSoundAttempt(current.targetSound, false);
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
    [found, roundDone, targetCount, roundIdx, rounds.length, current, recordWrong, resetStreak, incrementStreak, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={roundIdx}
      totalRounds={rounds.length}
      progressIcon="🔍"
      bgClassName="from-pink-500/75 to-orange-400/75"
    >
      {/* Header: target + basket counter */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={() => speakPhoneme(current.targetSound)}
          className="bg-white/90 rounded-2xl px-4 py-2 shadow-lg press-3d flex items-center gap-2"
        >
          <span className="text-base font-[Nunito] text-gray-600">Find</span>
          <span className="text-3xl font-bold font-[Fredoka] text-pink-600 lowercase">{current.targetSound}</span>
          <span>🔊</span>
        </button>
        <div className="bg-white/80 rounded-2xl px-3 py-1.5 shadow flex items-center gap-1">
          <span className="text-2xl">🧺</span>
          {Array.from({ length: targetCount }).map((_, i) => {
            const foundWord = found[i];
            return foundWord ? (
              <motion.span key={i} initial={{ scale: 2, y: -16 }} animate={{ scale: 1, y: 0 }}>
                <WordCard word={foundWord} size={28} />
              </motion.span>
            ) : (
              <span key={i} className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300" />
            );
          })}
        </div>
      </div>

      {/* Scattered scene */}
      <div className="flex-1 relative max-w-md w-full mx-auto min-h-[440px] my-1">
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[2px] rounded-3xl border-4 border-white/40 shadow-inner" />
        <AnimatePresence mode="wait">
          <motion.div key={roundIdx} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {current.items.map((item, index) => {
              const slot = SLOTS[index % SLOTS.length];
              const isFound = found.includes(item.word);
              const isBeingSpoken = activeOption === index;
              const hintThis = hintWord === item.word;

              return (
                <motion.button
                  key={item.word + index}
                  onClick={() => handleTap(item)}
                  disabled={isFound}
                  initial={{ scale: 0 }}
                  animate={
                    isFound
                      ? { scale: 0, opacity: 0, y: -40 }
                      : wrongShake === item.word
                        ? { x: [-8, 8, -8, 0], scale: slot.scale }
                        : { scale: slot.scale, x: 0, opacity: 1, y: 0 }
                  }
                  transition={
                    isFound
                      ? { duration: 0.45 }
                      : { scale: { delay: index * 0.07, type: 'spring', stiffness: 260, damping: 18 } }
                  }
                  className={`absolute w-[104px] h-[104px] rounded-full bg-white/95 shadow-xl flex items-center justify-center ${
                    isBeingSpoken ? 'ring-4 ring-blue-400 z-10' : ''
                  } ${hintThis ? 'animate-hint-pulse ring-4 ring-yellow-300 z-10' : ''}`}
                  style={{ left: `${slot.left}%`, top: `${slot.top}%`, rotate: `${slot.rot}deg` }}
                >
                  <WordCard word={item.word} size={70} />
                  {isFound && <span className="absolute text-3xl">✨</span>}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Eleni peeks from the corner */}
        <div className="absolute -bottom-4 -right-3 pointer-events-none">
          <EleniCharacter pose={roundDone ? 'celebrating' : 'standing'} size={132} />
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Great hunting!" onComplete={onComplete} />
    </GameShell>
  );
}
