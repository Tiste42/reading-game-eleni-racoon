'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

// Each round: pick the word that belongs to the family (recorded lines exist)
const FAMILIES: Array<{ pattern: string; member: string; outsiders: string[] }> = [
  { pattern: '-at', member: 'cat', outsiders: ['dog', 'pen'] },
  { pattern: '-at', member: 'hat', outsiders: ['bug', 'net'] },
  { pattern: '-an', member: 'van', outsiders: ['hen', 'log'] },
  { pattern: '-an', member: 'pan', outsiders: ['cup', 'win'] },
  { pattern: '-in', member: 'pin', outsiders: ['bat', 'mug'] },
  { pattern: '-og', member: 'dog', outsiders: ['rat', 'ten'] },
  { pattern: '-og', member: 'log', outsiders: ['fan', 'bed'] },
  { pattern: '-ug', member: 'bug', outsiders: ['hat', 'fin'] },
  { pattern: '-ug', member: 'mug', outsiders: ['jet', 'van'] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'won';

export default function WordTowers({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [tower, setTower] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(FAMILIES).slice(0, 6));
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const { pattern, member } = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    setChoices(shuffle([rounds[round].member, ...rounds[round].outsiders]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Recorded line: "Find words in the -at family! Which word belongs?"
  const { replay } = useGameSpeech(
    phase === 'read' ? `Find words in the ${pattern} family! Which word belongs?` : null,
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
      completeGame(worldId, 'word-towers');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'read') {
      (async () => {
        recordSoundAttempt(member, false);
        await speakReveal(member);
        setPhase('won');
        setTower((t) => [...t, member]);
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback(
    (w: string) => {
      if (phase !== 'read') return;
      if (w === member) {
        recordSoundAttempt(member, true);
        incrementStreak();
        masterWord(member);
        playSoundEffect('coin');
        setPhase('won');
        setTower((t) => [...t, member]);
        (async () => {
          await speakWord(member);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt(member, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        // Re-teach: sound out the word she picked — she hears it doesn't end right
        (async () => {
          await soundOut(w);
          await speakWord(w);
          setWrongPick(null);
        })();
      }
    },
    [phase, member, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🗼"
      bgClassName="from-emerald-400/60 to-teal-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + family pattern */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-emerald-900 font-[Fredoka] font-bold text-2xl text-center">
            Which word is in the family?
          </p>
          <div className="bg-white rounded-2xl px-8 py-2 shadow-lg mt-1">
            <span className="text-6xl font-bold font-[Fredoka] text-emerald-700 lowercase">{pattern}</span>
          </div>
        </div>

        {/* Word choices — she READS them */}
        <div className="flex gap-4 flex-wrap justify-center">
          {choices.map((w) => {
            const highlight = (phase === 'won' || shouldReveal) && w === member;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pick(w)}
                disabled={phase !== 'read'}
                animate={wrongPick === w ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`px-7 py-5 rounded-3xl shadow-xl bg-white press-3d transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                }`}
              >
                <span className="text-5xl font-bold font-[Fredoka] text-gray-800 lowercase">{w}</span>
              </motion.button>
            );
          })}
        </div>

        {/* The tower grows */}
        <div className="flex flex-col-reverse items-center min-h-[170px] justify-start">
          <div className="w-40 h-3 bg-stone-500/60 rounded" />
          {tower.map((w, i) => (
            <motion.div
              key={i}
              initial={{ y: -40, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="bg-amber-200 border-2 border-amber-400 rounded-xl px-6 py-1 -mb-0.5 shadow"
            >
              <span className="text-2xl font-bold font-[Fredoka] text-amber-800 lowercase">{w}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Tower built!" onComplete={onComplete} />
    </GameShell>
  );
}
