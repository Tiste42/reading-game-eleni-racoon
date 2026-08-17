'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakClip, speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeechWithOptions } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getRhymeFamilies } from '@/content/registry';
import { buildRhymeCandidates } from '@/content/earlyRoundBuilders';
import { useContentSession } from '@/lib/useContentSession';
import { shuffleSeeded } from '@/lib/roundSelector';

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

export default function RhymeBeach({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'play' | 'burst'>('play');
  const [candies, setCandies] = useState(0);
  const [burstAt, setBurstAt] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const feedbackRunRef = useRef(0);
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt, enabledContentPackIds } = useGameStore();
  const candidates = useMemo(
    () => buildRhymeCandidates(getRhymeFamilies(enabledContentPackIds)),
    [enabledContentPackIds],
  );
  const session = useContentSession({
    gameId: 'rhyme-match',
    candidates,
    count: 6,
    getId: (candidate) => candidate.id,
  });
  const rounds = useMemo(() => session.items.map((candidate, index) => ({
    ...candidate,
    choices: shuffleSeeded([candidate.match, ...candidate.distractors], `${session.seed}:choices:${index}`),
  })), [session]);

  const current = rounds[round];
  const isLastRound = round >= rounds.length - 1;

  const { activeOption, replay, cancel } = useGameSpeechWithOptions(
    // Use the already-recorded target word instead of browser TTS for a
    // dynamically assembled sentence. The screen supplies the question; the
    // audio reliably speaks the target and each choice on every phone.
    current.target,
    current.choices,
    [round],
  );

  useEffect(() => () => {
    feedbackRunRef.current += 1;
  }, []);

  const advance = useCallback(() => {
    setPhase('play');
    setBurstAt(null);
    if (isLastRound) {
      completeGame(worldId, 'rhyme-match');
      addCoins(5);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLastRound, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (word: string, index: number) => {
      if (phase !== 'play') return;
      const feedbackRun = ++feedbackRunRef.current;
      cancel();

      if (word === current.match) {
        recordSoundAttempt('rhyme', true);
        incrementStreak();
        setPhase('burst');
        setBurstAt(index);
        playSoundEffect('celebrate');
        setCandies((c) => c + 1);
        // Progression is driven by a bounded UI timer, never by an audio
        // `ended` event that an iPhone media session may fail to deliver.
        void speakFeedback(isLastRound ? 'complete' : 'correct');
        setTimeout(advance, 700);
      } else {
        recordSoundAttempt('rhyme', false);
        resetStreak();
        playSoundEffect('wrong');
        // Re-say only the target and the child's selection. The correct option
        // remains available and is never singled out during retry feedback.
        void (async () => {
          await speakClip('rhyme-hint', 'Listen! Rhyming words sound the same at the end!');
          if (feedbackRunRef.current !== feedbackRun) return;
          await speakWord(current.target);
          if (feedbackRunRef.current !== feedbackRun) return;
          await speakWord(word);
          if (feedbackRunRef.current !== feedbackRun) return;
          await speak(`What rhymes with ${current.target}?`);
        })();
      }
    },
    [phase, cancel, current, isLastRound, advance, resetStreak, incrementStreak, recordSoundAttempt],
  );

  const handleReplay = useCallback(() => {
    feedbackRunRef.current += 1;
    replay();
  }, [replay]);

  const handleBack = useCallback(() => {
    feedbackRunRef.current += 1;
    cancel();
    onComplete();
  }, [cancel, onComplete]);

  return (
    <GameShell
      onBack={handleBack}
      onReplay={handleReplay}
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
            data-testid="rhyme-target"
            onClick={() => {
              feedbackRunRef.current += 1;
              cancel();
              void speak(current.target);
            }}
            className="inline-flex items-center gap-3 bg-white/90 rounded-2xl px-6 py-3 shadow-lg press-3d"
          >
            <WordCard word={current.target} size={64} />
            {phase !== 'play' && (
              <span className="text-4xl font-bold font-[Fredoka] text-purple-600 lowercase">
                {current.target}
              </span>
            )}
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
              const isBurst = phase === 'burst' && burstAt === index;
              const isBeingSpoken = activeOption === index;

              return (
                <div key={`${round}-${word}`} className="relative flex flex-col items-center">
                  {/* string */}
                  <div className="w-0.5 h-6 bg-amber-800/60" />

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
                    data-testid="rhyme-choice"
                    onClick={() => handleChoice(word, index)}
                    disabled={phase !== 'play'}
                    initial={{ y: -60, opacity: 0 }}
                    animate={
                      isBurst
                          ? { scale: [1, 1.35, 0], rotate: [0, -12, 12] }
                          : {
                              y: 0,
                              opacity: 1,
                              rotate: isBeingSpoken ? [0, -5, 5, 0] : 0,
                            }
                    }
                    transition={
                      isBurst
                          ? { duration: 0.55 }
                          : {
                              y: { type: 'spring', stiffness: 200, damping: 16, delay: index * 0.12 },
                              rotate: { duration: 0.5, ease: 'easeInOut' },
                            }
                    }
                    whileTap={{ scale: 0.92 }}
                    className={`
                      relative w-full min-h-[150px] rounded-3xl p-3 shadow-xl flex flex-col items-center justify-center gap-1
                      bg-gradient-to-br ${PINATA_STYLES[index % PINATA_STYLES.length]}
                      ${isBeingSpoken ? 'ring-4 ring-white' : ''}
                    `}
                    style={{ transformOrigin: 'top center' }}
                  >
                    <span className="bg-white/90 rounded-2xl p-2 shadow-inner flex flex-col items-center">
                      <WordCard word={word} size={68} />
                      {phase !== 'play' && (
                        <span className="text-lg font-bold font-[Fredoka] text-gray-600 lowercase">{word}</span>
                      )}
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
