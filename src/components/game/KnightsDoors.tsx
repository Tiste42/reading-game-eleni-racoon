'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { WORLD_4_DOOR_ROUNDS, isWorld4RoundDecodable } from '@/content/world4Content';
import { useContentSession } from '@/lib/useContentSession';

const doorRoundId = (candidate: (typeof WORLD_4_DOOR_ROUNDS)[number]) => candidate.target;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'won';

export default function KnightsDoors({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [openDoor, setOpenDoor] = useState<string | null>(null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const taughtPhonemeSet = useMemo(() => new Set(taughtPhonemes), [taughtPhonemes]);
  const candidates = useMemo(() => WORLD_4_DOOR_ROUNDS.filter((candidate) =>
    isWorld4RoundDecodable(candidate, taughtPhonemeSet),
  ), [taughtPhonemeSet]);
  const session = useContentSession({ gameId: 'knights-doors', candidates, count: 6, getId: doorRoundId });
  const rounds = useMemo(
    () => session.items.map((candidate) => ({ ...candidate, doors: shuffle(candidate.doors) })),
    [session.items],
  );
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const { target, doors } = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setOpenDoor(null);
    setWrongPick(null);
  }, [round]);

  // Recorded per-round line: "Find the door that says cat!"
  const { replay } = useGameSpeech(
    phase === 'read' ? `Find the door that says ${target}!` : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const soundOut = useCallback(async (w: string) => {
    const ls = w.split('');
    for (let i = 0; i < ls.length; i++) {
      await speakPhoneme(ls[i]);
      if (i < ls.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, []);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'knights-doors');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'read') {
      (async () => {
        recordSoundAttempt(target, false);
        await speakReveal(target);
        setPhase('won');
        setOpenDoor(target);
        playSoundEffect('celebrate');
        await new Promise((r) => setTimeout(r, 1300));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickDoor = useCallback(
    (w: string) => {
      if (phase !== 'read') return;
      if (w === target) {
        recordSoundAttempt(target, true);
        incrementStreak();
        masterWord(target);
        playSoundEffect('coin');
        setPhase('won');
        setOpenDoor(w);
        (async () => {
          await speakWord(target);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt(target, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        // Re-teach: sound out the word on the door she knocked on
        (async () => {
          await soundOut(w);
          await speakWord(w);
          setWrongPick(null);
        })();
      }
    },
    [phase, target, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🏰"
      bgClassName="from-emerald-400/60 to-teal-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni knight + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter costume="knight" pose={phase === 'won' ? 'celebrating' : 'excited'} size={130} animate={false} />
          <p className="text-emerald-900 font-[Fredoka] font-bold text-2xl text-center">
            Listen, then read each door!
          </p>
          <div className="bg-white rounded-full px-6 py-3 shadow-lg mt-1 text-4xl" aria-hidden="true">🔊</div>
        </div>

        {/* The doors */}
        <div className="flex justify-center gap-2 items-end w-full px-1">
          {doors.map((w) => {
            const isOpen = openDoor === w;
            const highlight = (phase === 'won' || shouldReveal) && w === target;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pickDoor(w)}
                disabled={phase !== 'read'}
                animate={wrongPick === w ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center flex-1 min-w-0 max-w-[132px]"
              >
                <div
                  className={`relative w-full h-[180px] rounded-t-[60px] shadow-xl flex flex-col items-center justify-center transition-all press-3d ${
                    isOpen
                      ? 'bg-emerald-100 ring-4 ring-green-400'
                      : highlight
                        ? 'bg-amber-700 ring-4 ring-green-400 animate-hint-pulse'
                        : 'bg-amber-700'
                  }`}
                >
                  {isOpen ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}>
                      <WordCard word={w} size={88} />
                    </motion.div>
                  ) : (
                    <>
                      {/* door planks + handle */}
                      <span className="absolute left-3 top-1/2 w-3 h-3 rounded-full bg-yellow-400 shadow" />
                      <span className="text-4xl font-bold font-[Fredoka] text-amber-100 lowercase drop-shadow">
                        {w}
                      </span>
                    </>
                  )}
                </div>
                <div className="w-full h-3 bg-stone-500/60 rounded-b-lg" />
              </motion.button>
            );
          })}
        </div>

        <p className="text-emerald-900/70 font-[Fredoka] text-base min-h-[28px]">
          {phase === 'won' ? `${target}! You opened the right door!` : 'Read each door, then knock on the right one!'}
        </p>
      </div>

      <CelebrationOverlay show={showCelebration} message="Brave knight!" onComplete={onComplete} />
    </GameShell>
  );
}
