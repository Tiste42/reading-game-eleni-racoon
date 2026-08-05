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
import { WORLD_4_PICTURE_ROUNDS, isWorld4PictureRoundSafe, isWorld4RoundDecodable } from '@/content/world4Content';

const FLOWERS = ['🌻', '🌷', '🌼', '🌸', '🌺', '🪻'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'won';

export default function GardenGrow({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [grown, setGrown] = useState<number>(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const taughtPhonemeSet = useMemo(() => new Set(taughtPhonemes), [taughtPhonemes]);
  const rounds = useMemo(() => shuffle(WORLD_4_PICTURE_ROUNDS.filter((candidate) =>
    isWorld4PictureRoundSafe(candidate) && isWorld4RoundDecodable(candidate, taughtPhonemeSet),
  )).slice(0, 6), [taughtPhonemeSet]);
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const word = rounds[round].word;
  const letters = word.split('');
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    setChoices(shuffle([rounds[round].word, ...rounds[round].distractors]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the seed! Which picture matches?' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const soundOut = useCallback(async () => {
    for (let i = 0; i < letters.length; i++) {
      await speakPhoneme(letters[i]);
      if (i < letters.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, [letters]);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'garden-grow');
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
        setGrown((g) => g + 1);
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
        setGrown((g) => g + 1);
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
      progressIcon="🌻"
      bgClassName="from-lime-300/60 to-emerald-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-emerald-900 font-[Fredoka] font-bold text-2xl text-center">
            {phase === 'won' ? 'It grew!' : 'Read the seed — pick its picture!'}
          </p>
        </div>

        {/* Seed packet with the word (letters tappable for help) */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-amber-100 border-4 border-amber-300 rounded-3xl px-5 py-4 shadow-xl flex flex-col items-center gap-1">
            <span className="text-2xl">🌱</span>
            <div className="flex gap-2">
              {letters.map((letter, i) => (
                <motion.button
                  key={`${round}-${i}`}
                  onClick={() => speakPhoneme(letter)}
                  whileTap={{ scale: 0.9 }}
                  className="w-[80px] h-[88px] rounded-2xl bg-white text-gray-800 text-6xl font-bold font-[Fredoka] lowercase shadow press-3d flex items-center justify-center"
                >
                  {letter}
                </motion.button>
              ))}
            </div>
          </div>
          <p className="text-emerald-900/70 font-[Fredoka] text-sm">Tap a letter to hear its sound</p>
        </div>

        {/* Picture choices */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
          {choices.map((w) => {
            const isAnswer = w === word;
            const highlight = (phase === 'won' || shouldReveal) && isAnswer;
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

        {/* The garden grows across rounds */}
        <div className="flex gap-2 items-end bg-gradient-to-t from-lime-200/80 to-transparent rounded-2xl px-5 pt-1 pb-2 min-h-[64px]">
          {rounds.map((_, i) => (
            <motion.span
              key={i}
              initial={false}
              animate={i < grown ? { scale: [0, 1.4, 1], opacity: 1 } : { scale: 1, opacity: 0.25 }}
              className="text-4xl"
            >
              {i < grown ? FLOWERS[i % FLOWERS.length] : '🌱'}
            </motion.span>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Beautiful garden!" onComplete={onComplete} />
    </GameShell>
  );
}
