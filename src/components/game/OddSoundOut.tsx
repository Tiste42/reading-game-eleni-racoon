'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakPhoneme, speakFeedback, speakReveal } from '@/lib/speech';
import { useComposedSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getInitialSoundGroups } from '@/content/registry';
import { buildSoundPictureCandidates } from '@/content/earlyRoundBuilders';
import { useContentSession } from '@/lib/useContentSession';
import { shuffleSeeded } from '@/lib/roundSelector';

interface BuiltRound {
  words: string[];
  oddIndex: number;
  commonSound: string;
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function OddSoundOut({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<'play' | 'won' | 'model'>('play');
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt, enabledContentPackIds } = useGameStore();
  const candidates = useMemo(
    () => buildSoundPictureCandidates(getInitialSoundGroups(enabledContentPackIds), 2, 1, 2),
    [enabledContentPackIds],
  );
  const session = useContentSession({
    gameId: 'odd-one-out',
    historyKey: 'world1-initial-sounds',
    candidates,
    count: 6,
    getId: (candidate) => candidate.id,
  });
  const rounds: BuiltRound[] = useMemo(() => session.items.map((candidate, index) => {
    const oddWord = candidate.distractorWords[0];
    const words = shuffleSeeded([...candidate.targetWords, oddWord], `${session.seed}:items:${index}`);
    return { words, oddIndex: words.indexOf(oddWord), commonSound: candidate.targetLetter };
  }), [session]);

  const current = rounds[round];
  const oddWord = current.words[current.oddIndex];
  const isLast = round >= rounds.length - 1;

  // Crystal-clear directions: hear each word first, then the question + the sound
  const { activeOption, replay } = useComposedSpeech(
    [
      { say: 'Listen first... then tap the one that is different!' },
      { pause: 250 },
      { options: current.words },
      { pause: 300 },
      { say: 'Which one does not start with this sound?' },
      { pause: 200 },
      { phoneme: current.commonSound },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    setPhase('play');
    setWrongIdx(null);
    if (isLast) {
      completeGame(worldId, 'odd-one-out');
      addCoins(8);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // After 2 misses: spotlight the odd one, Leni says the answer, move on
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        await speakReveal(oddWord);
        await new Promise((r) => setTimeout(r, 700));
        modeling.current = false;
        advance();
      })();
    }
  }, [shouldReveal, phase, oddWord, advance]);

  const handleChoice = useCallback(
    (index: number) => {
      if (phase !== 'play') return;

      if (index === current.oddIndex) {
        recordSoundAttempt(current.commonSound, true);
        incrementStreak();
        setPhase('won');
        playSoundEffect('correct');
        (async () => {
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 600));
          advance();
        })();
      } else {
        recordSoundAttempt(current.commonSound, false);
        recordWrong();
        resetStreak();
        setWrongIdx(index);
        playSoundEffect('wrong');
        // Teach, don't scold: replay the tapped word and the shared sound
        (async () => {
          await speak(current.words[index]);
          await speakPhoneme(current.commonSound);
          setWrongIdx(null);
        })();
      }
    },
    [phase, current, isLast, advance, recordWrong, resetStreak, incrementStreak, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🎺"
      bgClassName="from-pink-500/75 to-orange-400/75"
    >
      <div className="flex-1 flex flex-col items-center justify-evenly py-2">
        <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'waving'} size={150} />
        <div className="text-center px-2">
          <p className="text-pink-800 font-[Fredoka] font-bold text-2xl leading-snug">
            Which one does <span className="underline decoration-4 decoration-pink-400">NOT</span> start with...
          </p>
          <button
            onClick={() => speakPhoneme(current.commonSound)}
            className="mt-1 inline-flex items-center gap-2 bg-white/90 rounded-full px-5 py-2 shadow press-3d"
          >
            <span className="text-4xl font-bold font-[Fredoka] text-pink-600 lowercase">{current.commonSound}</span>
            <span className="text-2xl">🔊</span>
          </button>
        </div>

        {/* Stage — sized to fit phones (3 cards always fit the width) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="relative w-full"
          >
            <div className="flex gap-3 items-end justify-center w-full px-1">
              {current.words.map((word, i) => {
                const isOdd = i === current.oddIndex;
                const isBeingSpoken = activeOption === i;
                const revealThis = phase === 'model' && isOdd;
                const wonThis = phase === 'won' && isOdd;
                const isWrongTap = wrongIdx === i;

                return (
                  <div key={`${round}-${word}-${i}`} className="flex flex-col items-center flex-1 max-w-[136px] min-w-0">
                    <motion.button
                      onClick={() => handleChoice(i)}
                      disabled={phase !== 'play'}
                      animate={
                        wonThis
                          ? { y: [0, -24, 0], rotate: [0, -12, 12, 0], scale: 1.15 }
                          : isWrongTap
                            ? { x: [-7, 7, -7, 0] }
                            : isBeingSpoken
                              ? { y: [0, -10, 0], scale: 1.08 }
                              : {}
                      }
                      transition={
                        wonThis
                          ? { duration: 0.5, repeat: 2 }
                          : isBeingSpoken
                            ? { duration: 0.4, repeat: Infinity }
                            : { duration: 0.35 }
                      }
                      whileTap={{ scale: 0.9 }}
                      className={`w-full aspect-[8/9] rounded-3xl shadow-xl flex flex-col items-center justify-center gap-1 bg-white/95 press-3d ${
                        wonThis || revealThis
                          ? 'ring-4 ring-green-400'
                          : isBeingSpoken
                            ? 'ring-4 ring-blue-400'
                            : ''
                      } ${revealThis ? 'animate-hint-pulse' : ''}`}
                    >
                      <WordCard word={word} size={76} />
                      {(wonThis || revealThis) && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xl">
                          🌟
                        </motion.span>
                      )}
                    </motion.button>
                    {/* podium */}
                    <div className="w-3/4 h-3 mt-1 rounded bg-amber-700/50" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'won' && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-xl text-yellow-200 font-bold font-[Fredoka]"
            >
              {oddWord} starts with a different sound!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Great listening!" onComplete={onComplete} />
    </GameShell>
  );
}
