'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakClip, speakFeedback } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

interface RhymeRound {
  target: string;
  match: string;
  distractors: string[];
}

const RHYME_ROUNDS: RhymeRound[] = [
  { target: 'cat', match: 'hat', distractors: ['dog', 'sun'] },
  { target: 'bug', match: 'mug', distractors: ['fish', 'pen'] },
  { target: 'log', match: 'dog', distractors: ['cat', 'bed'] },
  { target: 'hen', match: 'ten', distractors: ['cup', 'map'] },
  { target: 'pin', match: 'bin', distractors: ['car', 'egg'] },
];

const PINATA_STYLES = [
  'from-pink-400 via-yellow-300 to-purple-400',
  'from-cyan-400 via-lime-300 to-pink-400',
  'from-orange-400 via-fuchsia-300 to-blue-400',
];

const CANDY = ['🍬', '🍭', '🍫', '🍪', '⭐'];

interface Props {
  worldId: number;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function RhymeBeach({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'play' | 'burst' | 'model'>('play');
  const [fallen, setFallen] = useState<string[]>([]);
  const [candies, setCandies] = useState(0);
  const [burstAt, setBurstAt] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const [rounds] = useState(() =>
    shuffle(RHYME_ROUNDS).map((r) => ({
      ...r,
      choices: shuffle([r.match, ...r.distractors]),
    })),
  );

  const current = rounds[round];
  const isLastRound = round >= rounds.length - 1;

  const { activeOption, replay } = useGameSpeechWithOptions(
    `What rhymes with ${current.target}?`,
    current.choices,
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    setPhase('play');
    setFallen([]);
    setBurstAt(null);
    if (isLastRound) {
      completeGame(worldId, 'rhyme-match');
      addCoins(5);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLastRound, worldId, completeGame, addCoins]);

  // After 2 misses: Leni models the rhyme pair, then we move on (no dead ends)
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        await speak(`${current.target} and ${current.match} rhyme! Listen: ${current.target}... ${current.match}!`);
        await new Promise((r) => setTimeout(r, 700));
        modeling.current = false;
        advance();
      })();
    }
  }, [shouldReveal, phase, current, advance]);

  const handleChoice = useCallback(
    (word: string, index: number) => {
      if (phase !== 'play' || fallen.includes(word)) return;

      if (word === current.match) {
        recordSoundAttempt('rhyme', true);
        incrementStreak();
        setPhase('burst');
        setBurstAt(index);
        playSoundEffect('celebrate');
        setCandies((c) => c + 1);
        (async () => {
          await speakFeedback(isLastRound ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 500));
          advance();
        })();
      } else {
        recordSoundAttempt('rhyme', false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        // Scaffold down: the wrong piñata falls off its rope, fewer choices remain
        setFallen((f) => [...f, word]);
        speakClip('rhyme-hint', 'Listen! Rhyming words sound the same at the end!');
      }
    },
    [phase, fallen, current, isLastRound, advance, recordWrong, resetStreak, incrementStreak, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🪅"
      bgClassName="from-pink-400/80 via-orange-300/80 to-amber-200/80"
    >
      {/* Eleni + target word */}
      <div className="text-center pt-2 pb-1">
        <EleniCharacter
          pose={phase === 'burst' ? 'celebrating' : 'excited'}
          size={148}
        />
        <motion.div
          key={round}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="mt-1"
        >
          <p className="text-base text-pink-800 font-[Fredoka] font-semibold mb-1">Find what rhymes with...</p>
          <button
            onClick={() => speak(current.target)}
            className="inline-flex items-center gap-3 bg-white/90 rounded-2xl px-6 py-3 shadow-lg press-3d"
          >
            <WordCard word={current.target} size={64} />
            <span className="text-4xl font-bold font-[Fredoka] text-purple-600 lowercase">
              {current.target}
            </span>
            <span className="text-2xl">🔊</span>
          </button>
        </motion.div>
      </div>

      {/* Piñatas hanging from a rope */}
      <div className="flex-1 flex flex-col justify-evenly py-2">
        <div className="relative max-w-md w-full mx-auto">
          {/* rope */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-700/70 rounded-full" />

          <div className="grid grid-cols-3 gap-4 pt-2">
            {current.choices.map((word, index) => {
              const hasFallen = fallen.includes(word);
              const isCorrect = word === current.match;
              const isBurst = phase === 'burst' && burstAt === index;
              const isBeingSpoken = activeOption === index;
              const revealThis = phase === 'model' && isCorrect;

              return (
                <div key={`${round}-${word}`} className="relative flex flex-col items-center">
                  {/* string */}
                  <div className={`w-0.5 h-6 bg-amber-800/60 ${hasFallen ? 'opacity-0' : ''}`} />

                  <AnimatePresence>
                    {isBurst && (
                      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                        {CANDY.map((c, ci) => (
                          <motion.span
                            key={ci}
                            className="absolute text-3xl"
                            initial={{ x: 0, y: 0, scale: 0 }}
                            animate={{
                              x: (ci - 2) * 38 + (ci % 2 ? 14 : -14),
                              y: [0, -50 - ci * 8, 90],
                              scale: [0, 1.3, 1],
                              rotate: (ci - 2) * 90,
                              opacity: [1, 1, 0],
                            }}
                            transition={{ duration: 1.0, ease: 'easeOut' }}
                          >
                            {c}
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={() => handleChoice(word, index)}
                    disabled={phase !== 'play' || hasFallen}
                    initial={{ y: -60, opacity: 0 }}
                    animate={
                      hasFallen
                        ? { y: 220, rotate: 35, opacity: 0 }
                        : isBurst
                          ? { scale: [1, 1.35, 0], rotate: [0, -12, 12] }
                          : {
                              y: 0,
                              opacity: 1,
                              rotate: isBeingSpoken ? [0, -5, 5, 0] : [0, -2.5, 2.5, 0],
                            }
                    }
                    transition={
                      hasFallen
                        ? { duration: 0.7, ease: 'easeIn' }
                        : isBurst
                          ? { duration: 0.55 }
                          : {
                              y: { type: 'spring', stiffness: 200, damping: 16, delay: index * 0.12 },
                              rotate: { duration: isBeingSpoken ? 0.5 : 2.4, repeat: Infinity, ease: 'easeInOut' },
                            }
                    }
                    whileTap={{ scale: 0.92 }}
                    className={`
                      relative w-full min-h-[150px] rounded-3xl p-3 shadow-xl flex flex-col items-center justify-center gap-1
                      bg-gradient-to-br ${PINATA_STYLES[index % PINATA_STYLES.length]}
                      ${isBeingSpoken ? 'ring-4 ring-white' : ''}
                      ${revealThis ? 'ring-4 ring-green-400 animate-hint-pulse' : ''}
                    `}
                    style={{ transformOrigin: 'top center' }}
                  >
                    <span className="bg-white/90 rounded-2xl p-2 shadow-inner flex flex-col items-center">
                      <WordCard word={word} size={68} />
                      <span className="text-lg font-bold font-[Fredoka] text-gray-600 lowercase">{word}</span>
                    </span>
                    {/* piñata fringe */}
                    <div className="absolute -bottom-1 left-4 right-4 flex justify-between pointer-events-none">
                      {Array.from({ length: 5 }).map((_, fi) => (
                        <span key={fi} className="w-2 h-3 rounded-b-full bg-white/70" />
                      ))}
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Candy jar */}
        <div className="flex justify-center mt-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-5 py-2 shadow-lg flex items-center gap-1.5 min-h-[44px]">
            <span className="text-xl">🫙</span>
            {Array.from({ length: rounds.length }).map((_, i) => (
              <motion.span
                key={i}
                className="text-2xl"
                initial={false}
                animate={i < candies ? { scale: [0, 1.5, 1], opacity: 1 } : { opacity: 0.25, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                🍬
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Rhyme Champion!" onComplete={onComplete} />
    </GameShell>
  );
}
