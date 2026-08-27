'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useComposedSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getInitialSoundGroups, type ResolvedSoundGroup } from '@/content/registry';
import { getPracticedPhonemes } from '@/content/progression';
import { shuffleSeeded } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';

interface SortItem {
  word: string;
  letter: string;
}

interface SortRound {
  letters: [string, string];
  items: SortItem[];
}

interface SortCandidate {
  id: string;
  groups: [ResolvedSoundGroup, ResolvedSoundGroup];
}

const SAFE_PAIRINGS = [['s', 't'], ['p', 'n'], ['e', 'l'], ['b', 'm'], ['c', 'f'], ['d', 'r'], ['h', 'j']] as const;
const candidateId = (candidate: SortCandidate) => candidate.id;

interface FlyState {
  dx: number;
  dy: number;
  basketIdx: number;
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'play' | 'model';

export default function SoundSort({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [flying, setFlying] = useState<FlyState | null>(null);
  const [wrongBasket, setWrongBasket] = useState<number | null>(null);
  const [bounce, setBounce] = useState<{ idx: number; key: number } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const practicedPhonemes = useMemo(
    () => getPracticedPhonemes(enabledContentPackIds, taughtPhonemes),
    [enabledContentPackIds, taughtPhonemes],
  );
  const groups = useMemo(
    () => getInitialSoundGroups(enabledContentPackIds, practicedPhonemes),
    [enabledContentPackIds, practicedPhonemes],
  );
  const candidates = useMemo(() => {
    const byLetter = new Map(groups.map((group) => [group.letter, group]));
    return SAFE_PAIRINGS.flatMap(([left, right]) => {
      const leftGroup = byLetter.get(left);
      const rightGroup = byLetter.get(right);
      return leftGroup && rightGroup && leftGroup.words.length >= 2 && rightGroup.words.length >= 2
        ? [{ id: `${left}-${right}`, groups: [leftGroup, rightGroup] as [ResolvedSoundGroup, ResolvedSoundGroup] }]
        : [];
    });
  }, [groups]);
  const session = useContentSession({ gameId: 'sound-sort', candidates, count: 3, getId: candidateId });
  const [rounds] = useState<SortRound[]>(() => session.items.map((candidate) => ({
    letters: [candidate.groups[0].letter, candidate.groups[1].letter],
    items: shuffleSeeded(candidate.groups.flatMap((group) =>
      shuffleSeeded(group.words, `${session.seed}:${candidate.id}:${group.id}`).slice(0, 2).map((word) => ({
        word: word.text,
        letter: group.letter,
      })),
    ), `${session.seed}:${candidate.id}:items`),
  })));
  const itemRef = useRef<HTMLDivElement>(null);
  const basketRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { completeGame, addCoins, incrementStreak, resetStreak, masterPhoneme, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const item = current.items[itemIdx];
  const totalItems = rounds.reduce((n, r) => n + r.items.length, 0);
  const sortedCount = rounds.slice(0, round).reduce((n, r) => n + r.items.length, 0) + itemIdx;
  const isLastItem = sortedCount >= totalItems - 1;

  useEffect(() => {
    setPhase('play');
    setWrongBasket(null);
  }, [round, itemIdx]);

  // Instruction (real recorded line) + the item word (real recorded word audio)
  const { replay } = useComposedSpeech(
    [
      { say: 'What letter does it start with?' },
      { pause: 200 },
      { options: [item.word] },
    ],
    [round, itemIdx],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(`${round}-${itemIdx}`, 2);

  const advance = useCallback(() => {
    if (itemIdx < current.items.length - 1) {
      setItemIdx((i) => i + 1);
    } else if (round < rounds.length - 1) {
      setRound((r) => r + 1);
      setItemIdx(0);
    } else {
      completeGame(worldId, 'sound-sort');
      addCoins(8);
      setShowCelebration(true);
    }
  }, [itemIdx, round, current.items.length, rounds.length, worldId, completeGame, addCoins]);

  const flyToBasket = useCallback((basketIdx: number) => {
    const itemRect = itemRef.current?.getBoundingClientRect();
    const basketRect = basketRefs.current[basketIdx]?.getBoundingClientRect();
    const dx =
      itemRect && basketRect
        ? basketRect.left + basketRect.width / 2 - (itemRect.left + itemRect.width / 2)
        : 0;
    const dy =
      itemRect && basketRect
        ? basketRect.top + basketRect.height / 2 - (itemRect.top + itemRect.height / 2)
        : 220;
    setFlying({ dx, dy, basketIdx });
  }, []);

  // Two misses → Leni reveals: "Not quite, the answer is... /s/", highlights the
  // basket, and the item flies in by itself. Never a dead end.
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current && !flying) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        recordSoundAttempt(item.letter, false);
        await speakReveal(item.letter);
        await speakWord(item.word);
        flyToBasket(current.letters.indexOf(item.letter));
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const handleLanded = useCallback(() => {
    if (!flying) return;
    setFlying(null);
    setBounce({ idx: flying.basketIdx, key: Date.now() });
    playSoundEffect('coin');
    if (phase === 'play') {
      speakFeedback(isLastItem ? 'complete' : 'correct');
    }
    modeling.current = false;
    setTimeout(() => advance(), 400);
  }, [flying, phase, isLastItem, advance]);

  const tapBasket = useCallback(
    (basketIdx: number) => {
      if (phase !== 'play' || flying) return;
      const basketLetter = current.letters[basketIdx];
      if (basketLetter === item.letter) {
        recordSoundAttempt(item.letter, true);
        incrementStreak();
        masterPhoneme(item.letter);
        speakPhoneme(basketLetter);
        flyToBasket(basketIdx);
      } else {
        recordSoundAttempt(item.letter, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongBasket(basketIdx);
        // Re-teach: that basket's sound, then the item word so she re-hears its start
        (async () => {
          await speakPhoneme(basketLetter);
          await speakWord(item.word);
          setWrongBasket(null);
        })();
      }
    },
    [phase, flying, current.letters, item, flyToBasket, incrementStreak, masterPhoneme, resetStreak, recordWrong, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={sortedCount}
      totalRounds={totalItems}
      progressIcon="🧺"
      bgClassName="from-purple-400/60 to-pink-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={flying && phase === 'play' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-purple-900 font-[Fredoka] font-bold text-2xl text-center">
            What letter does it start with?
          </p>
        </div>

        {/* Current item — big card, tap to re-hear the word */}
        <div ref={itemRef}>
          <motion.div
            key={`${round}-${itemIdx}`}
            initial={{ scale: 0 }}
            animate={
              flying
                ? { x: flying.dx, y: flying.dy, scale: 0.22, rotate: 20, opacity: 0.9 }
                : { scale: 1, x: 0, y: 0 }
            }
            transition={flying ? { duration: 0.55, ease: 'easeIn' } : { type: 'spring', stiffness: 260, damping: 18 }}
            onAnimationComplete={flying ? handleLanded : undefined}
            className="relative z-30"
          >
            <PressButton
              onClick={() => speakWord(item.word)}
              className="bg-white rounded-3xl p-4 shadow-xl flex items-center justify-center"
              aria-label={`Hear ${item.word}`}
            >
              <WordCard word={item.word} size={150} />
            </PressButton>
          </motion.div>
        </div>

        {/* The two letter baskets */}
        <div className="flex gap-8 items-end pb-1">
          {current.letters.map((letter, i) => {
            const sortedHere = current.items
              .slice(0, itemIdx)
              .filter((it) => it.letter === letter);
            const highlight = phase === 'model' && letter === item.letter;
            return (
              <div key={`${round}-${letter}`} className="flex flex-col items-center">
                <motion.button
                  ref={(el) => {
                    basketRefs.current[i] = el;
                  }}
                  onClick={() => tapBasket(i)}
                  disabled={phase !== 'play' || !!flying}
                  whileTap={{ scale: 0.92 }}
                  animate={
                    wrongBasket === i
                      ? { x: [-8, 8, -8, 8, 0] }
                      : bounce?.idx === i
                        ? { scale: [1, 1.25, 1], rotate: [0, -6, 6, 0] }
                        : {}
                  }
                  key={bounce?.idx === i ? bounce.key : `basket-${i}`}
                  transition={{ duration: 0.4 }}
                  className={`relative text-8xl rounded-3xl p-2 ${
                    highlight ? 'ring-4 ring-green-400 animate-hint-pulse rounded-3xl' : ''
                  }`}
                  aria-label={`${letter} basket`}
                >
                  🧺
                  <span className="absolute -top-1 -right-2 bg-purple-500 text-white font-[Fredoka] font-bold text-3xl w-14 h-14 rounded-full flex items-center justify-center shadow-lg lowercase">
                    {letter}
                  </span>
                </motion.button>
                {/* items already sorted into this basket */}
                <div className="flex gap-1 mt-1 min-h-[36px]">
                  {sortedHere.map((it) => (
                    <motion.div key={it.word} initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <WordCard word={it.word} size={34} />
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Super sorting!" onComplete={onComplete} />
    </GameShell>
  );
}
