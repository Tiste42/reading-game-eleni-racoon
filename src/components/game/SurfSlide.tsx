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
import { getWordsForActivity } from '@/content/registry';
import type { ContentWord } from '@/content/types';
import { buildChoiceSet, getBalancedAnswerIndex } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';

/** Dedicated surfing-Leni artwork with a defensive fallback. */
function SurfingLeni({ size, done }: { size: number; done: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <EleniCharacter costume="surfer" pose={done ? 'celebrating' : 'excited'} size={size} animate={false} />;
  }
  return (
    <img
      src="/images/generated/eleni/eleni-surfer.png"
      width={size}
      height={size}
      alt="Leni surfing"
      draggable={false}
      className="object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.3)]"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

const wordId = (entry: ContentWord) => entry.id;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'blend' | 'choose' | 'won';

export default function SurfSlide({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [step, setStep] = useState(0); // letters surfed so far
  const [phase, setPhase] = useState<Phase>('blend');
  const [choices, setChoices] = useState<ContentWord[]>([]);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const pool = useMemo(() => getWordsForActivity(enabledContentPackIds, 'blend-to-picture'), [enabledContentPackIds]);
  const session = useContentSession({ gameId: 'surf-slide', candidates: pool, count: 6, getId: wordId });
  const words = session.items;
  const { completeGame, addCoins, incrementStreak, resetStreak, masterWord, recordSoundAttempt } = useGameStore();

  const entry = words[round];
  const word = entry.text;
  const units = entry.units;
  const n = units.length;
  const isLast = round >= words.length - 1;

  useEffect(() => {
    setStep(0);
    setPhase('blend');
    setChoices([]);
    setWrongPick(null);
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'blend' ? 'Blend the sounds together! What word do the letters make?' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(`${round}-choose`, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'surf-slide');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Sound the word out using the SAME human letter sounds. Each sound must
  // play to COMPLETION (await) — a fixed timer cuts the recordings off and
  // the sounds never get to "blend".
  const soundOut = useCallback(async () => {
    for (let i = 0; i < units.length; i++) {
      await speakPhoneme(units[i].phonemeId);
      if (i < units.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, [units]);

  // After the last letter is surfed: move to the choosing step and sound the
  // whole word out once so she can hear the letters blend together.
  const startChoose = useCallback(() => {
    setChoices(buildChoiceSet(entry, pool, {
      count: 3,
      seed: `${session.seed}:${entry.id}:choices`,
      answerIndex: getBalancedAnswerIndex(round, 3, session.seed),
      getId: wordId,
    }));
    setPhase('choose');
    soundOut();
  }, [entry, pool, round, session.seed, soundOut]);

  const surfTo = useCallback(
    (i: number) => {
      if (phase !== 'blend' || i !== step) return; // only the next glowing letter responds
      playSoundEffect('tap');
      speakPhoneme(units[i].phonemeId);
      const ns = i + 1;
      setStep(ns);
      if (ns === n) setTimeout(startChoose, 800);
    },
    [phase, step, units, n, startChoose],
  );

  // Two wrong picks → model the answer and move on (never a dead end)
  useEffect(() => {
    if (shouldReveal && phase === 'choose') {
      (async () => {
        recordSoundAttempt(word, false);
        await speakReveal(word);
        setPhase('won');
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickChoice = useCallback(
    (choice: ContentWord) => {
      if (phase !== 'choose') return;
      if (choice.id === entry.id) {
        recordSoundAttempt(word, true);
        incrementStreak();
        masterWord(word);
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speakWord(word);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt(word, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(choice.id);
        // Re-teach: sound the real word out again (human voice) so she can retry
        (async () => {
          await soundOut();
          setWrongPick(null);
        })();
      }
    },
    [phase, entry.id, word, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  // The 🔊 Again button: replay the instruction while blending, or sound the
  // word out again (in the human letter-sound voice) while she's choosing.
  const handleReplay = useCallback(() => {
    if (phase === 'blend') {
      replay();
    } else {
      soundOut();
    }
  }, [phase, replay, soundOut]);

  return (
    <GameShell
      onBack={onComplete}
      onReplay={handleReplay}
      round={round}
      totalRounds={words.length}
      progressIcon="🏄"
      bgClassName="from-sky-400/70 via-cyan-300/40 to-amber-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-2">
        {/* Leni + the prompt */}
        <div className="flex flex-col items-center gap-1">
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SurfingLeni size={150} done={phase === 'won'} />
          </motion.div>
          <p className="text-cyan-800 font-[Fredoka] font-bold text-2xl text-center">
            {phase === 'blend' ? 'Surf the sounds!' : phase === 'won' ? 'You read it!' : 'Which one is it?'}
          </p>
        </div>

        {phase === 'blend' ? (
          <>
            {/* Big tappable letters */}
            <div className="flex justify-center gap-3">
              {units.map((unit, i) => {
                const surfed = i < step;
                const isNext = i === step;
                return (
                  <motion.button
                    key={i}
                    onClick={() => surfTo(i)}
                    disabled={!isNext}
                    animate={surfed ? { scale: [1, 1.25, 1] } : isNext ? { y: [0, -8, 0] } : { scale: 1 }}
                    transition={isNext ? { y: { duration: 0.9, repeat: Infinity } } : {}}
                    whileTap={isNext ? { scale: 0.92 } : {}}
                    className={`w-[100px] h-[110px] rounded-3xl flex items-center justify-center text-7xl font-bold font-[Fredoka] lowercase shadow-lg press-3d transition-all ${
                      isNext
                        ? 'bg-white text-gray-800 ring-4 ring-yellow-300 animate-hint-pulse'
                        : surfed
                          ? 'bg-yellow-300 text-gray-800'
                          : 'bg-white/70 text-gray-500'
                    }`}
                  >
                    {unit.text}
                  </motion.button>
                );
              })}
            </div>
            <p className="text-cyan-800/90 font-[Fredoka] font-semibold text-lg text-center px-6">
              Tap the glowing letter to hear its sound!
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* The word — big tappable letters, tap to hear each sound again */}
            <div className="flex justify-center gap-3">
              {units.map((unit, i) => (
                <motion.button
                  key={i}
                  onClick={() => speakPhoneme(unit.phonemeId)}
                  whileTap={{ scale: 0.9 }}
                  className="w-[88px] h-[96px] rounded-3xl bg-yellow-300 text-gray-800 text-7xl font-bold font-[Fredoka] lowercase shadow-lg press-3d flex items-center justify-center"
                >
                  {unit.text}
                </motion.button>
              ))}
            </div>
            <p className="text-cyan-800/80 font-[Fredoka] text-sm text-center">
              Tap a letter — or 🔊 Again — to hear it
            </p>

            {/* Picture choices */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1 mt-1"
            >
              {choices.map((choice) => {
                const isAnswer = choice.id === entry.id;
                const revealAnswer = (phase === 'won' || shouldReveal) && isAnswer;
                return (
                  <motion.button
                    key={choice.id}
                    onClick={() => pickChoice(choice)}
                    disabled={phase === 'won'}
                    animate={wrongPick === choice.id ? { x: [-8, 8, -8, 8, 0] } : {}}
                    whileTap={{ scale: 0.92 }}
                    className={`rounded-3xl p-2 shadow-xl bg-white press-3d flex items-center justify-center transition-all ${
                      revealAnswer ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                    }`}
                  >
                    <WordCard word={choice.text} size={96} />
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Super surfer!" onComplete={onComplete} />
    </GameShell>
  );
}
