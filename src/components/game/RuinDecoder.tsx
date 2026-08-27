'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { WORLD_5_DECODER_ROUNDS } from '@/content/world5Content';
import { useContentSession } from '@/lib/useContentSession';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'won';
const decoderRoundId = (round: (typeof WORLD_5_DECODER_ROUNDS)[number]) => round.word;

export default function RuinDecoder({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [decoded, setDecoded] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();
  const session = useContentSession({
    gameId: 'ruin-decoder',
    candidates: WORLD_5_DECODER_ROUNDS,
    count: 3,
    getId: decoderRoundId,
  });
  const rounds = session.items;

  const current = rounds[round];
  const { word, units } = current;
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    setChoices(shuffle([rounds[round].word, ...rounds[round].distractors]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the ancient word! Which picture matches?' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  // Sound out using the digraph UNITS (sh = one sound)
  const soundOut = useCallback(async () => {
    for (let i = 0; i < units.length; i++) {
      await speakPhoneme(units[i]);
      if (i < units.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, [units]);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'ruin-decoder');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'read') {
      (async () => {
        recordSoundAttempt(word, false);
        await speakReveal(word);
        setPhase('won');
        setDecoded((d) => [...d, word]);
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback(
    (w: string) => {
      if (phase !== 'read') return;
      if (w === word) {
        recordSoundAttempt(word, true);
        incrementStreak();
        masterWord(word);
        playSoundEffect('coin');
        setPhase('won');
        setDecoded((d) => [...d, word]);
        (async () => {
          await speakWord(word);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt(word, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        (async () => {
          await soundOut();
          setWrongPick(null);
        })();
      }
    },
    [phase, word, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🏺"
      bgClassName="from-amber-400/60 to-red-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter costume="explorer" pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} animate={false} />
          <p className="text-amber-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            Read the ancient word!
          </p>
        </div>

        {/* Stone tablet with the word — digraph is ONE tile */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-stone-200 border-8 border-stone-400 rounded-3xl px-5 py-4 shadow-xl flex gap-2">
            {units.map((u, i) => (
              <motion.button
                key={`${round}-${i}`}
                onClick={() => speakPhoneme(u)}
                whileTap={{ scale: 0.9 }}
                className={`h-[96px] rounded-2xl text-6xl font-bold font-[Fredoka] lowercase shadow press-3d flex items-center justify-center ${
                  u.length === 2 ? 'bg-violet-200 text-violet-800 px-4' : 'bg-stone-50 text-gray-800 w-[80px]'
                }`}
              >
                {u}
              </motion.button>
            ))}
          </div>
          <p className="text-amber-900/70 font-[Fredoka] text-sm">Tap the stones to hear their sounds</p>
        </div>

        {/* Picture choices */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
          {choices.map((w) => {
            const highlight = (phase === 'won' || shouldReveal) && w === word;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pick(w)}
                disabled={phase !== 'read'}
                animate={wrongPick === w ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`rounded-3xl p-2 shadow-xl bg-white press-3d flex items-center justify-center transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                }`}
              >
                <WordCard word={w} size={96} />
              </motion.button>
            );
          })}
        </div>

        {/* Decoded treasures */}
        <div className="flex gap-2 bg-white/50 rounded-2xl px-4 py-1.5 shadow-inner min-h-[44px] items-center">
          {rounds.map((r, i) => (
            <span key={i} className={`text-3xl ${i < decoded.length ? '' : 'opacity-25 grayscale'}`}>
              🏺
            </span>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Ruins decoded!" onComplete={onComplete} />
    </GameShell>
  );
}
