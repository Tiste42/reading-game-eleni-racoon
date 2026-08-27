'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getWordsForActivity } from '@/content/registry';
import type { ContentWord } from '@/content/types';
import { buildChoiceSet, getBalancedAnswerIndex } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { getPracticedPhonemes } from '@/content/progression';
import { canSharePictureChoices } from '@/content/pictureConflicts';

const wordId = (entry: ContentWord) => entry.id;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'look' | 'choose' | 'won';

export default function SoundTelescope({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('look');
  const [revealed, setRevealed] = useState(0); // letters revealed through the telescope
  const [looking, setLooking] = useState(false);
  const [choices, setChoices] = useState<ContentWord[]>([]);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const practicedPhonemes = useMemo(() => getPracticedPhonemes(enabledContentPackIds, taughtPhonemes), [enabledContentPackIds, taughtPhonemes]);
  const pool = useMemo(() => getWordsForActivity(enabledContentPackIds, 'blend-to-picture', practicedPhonemes), [enabledContentPackIds, practicedPhonemes]);
  const session = useContentSession({ gameId: 'sound-telescope', historyKey: 'world3-blending-words', candidates: pool, count: 6, getId: wordId });
  const words = session.items;
  const { completeGame, addCoins, incrementStreak, resetStreak, masterWord, recordSoundAttempt } = useGameStore();

  const entry = words[round];
  const word = entry.text;
  const units = entry.units;
  const isLast = round >= words.length - 1;

  useEffect(() => {
    setPhase('look');
    setRevealed(0);
    setLooking(false);
    setChoices([]);
    setWrongPick(null);
  }, [round]);

  const { shouldReveal, recordWrong } = useWrongAttempts(`${round}-choose`, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'sound-telescope');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Sound the word out with the human letter sounds (optionally revealing each
  // letter as its sound plays). Each sound plays to COMPLETION — a fixed timer
  // truncates the recordings and the sounds never get to "blend".
  const soundOut = useCallback(
    async (reveal = false) => {
      for (let i = 0; i < units.length; i++) {
        if (reveal) setRevealed(i + 1);
        await speakPhoneme(units[i].phonemeId);
        if (i < units.length - 1) await new Promise((r) => setTimeout(r, 120));
      }
    },
    [units],
  );

  const handleLook = useCallback(() => {
    if (phase !== 'look' || looking) return;
    setLooking(true);
    (async () => {
      await soundOut(true); // reveal the letters one at a time as each sound plays
      setChoices(buildChoiceSet(entry, pool, {
        count: 3,
        seed: `${session.seed}:${entry.id}:choices`,
      answerIndex: getBalancedAnswerIndex(round, 3, session.seed),
          getId: wordId,
          canUseDistractor: (answer, distractor) => canSharePictureChoices(answer.text, distractor.text),
      }));
      setPhase('choose');
      setLooking(false);
    })();
  }, [phase, looking, soundOut, entry, pool, round, session.seed]);

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
        (async () => {
          await soundOut();
          setWrongPick(null);
        })();
      }
    },
    [phase, entry.id, word, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={phase === 'look' ? undefined : () => soundOut()}
      round={round}
      totalRounds={words.length}
      progressIcon="🔭"
      bgClassName="from-indigo-500/60 via-purple-400/40 to-amber-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center gap-1">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={130} />
          <p className="text-indigo-900 font-[Fredoka] font-bold text-2xl text-center px-4">
            {phase === 'look'
              ? 'Look through the telescope!'
              : phase === 'won'
                ? 'You read it!'
                : 'What word is it?'}
          </p>
        </div>

        {phase === 'look' ? (
          <div className="flex flex-col items-center gap-5">
            <motion.div
              animate={{ rotate: [-4, 4, -4], y: [0, -6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[7rem] leading-none"
            >
              🔭
            </motion.div>

            {/* Letters appear one at a time as their sounds play */}
            <div className="flex gap-3 min-h-[80px] items-center">
              {looking
                ? units.map((unit, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={i < revealed ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                      className="w-[72px] h-[80px] rounded-2xl bg-yellow-300 text-gray-800 text-6xl font-bold font-[Fredoka] lowercase shadow-lg flex items-center justify-center"
                    >
                      {unit.text}
                    </motion.span>
                  ))
                : null}
            </div>

            {!looking && (
              <PressButton
                onClick={handleLook}
                className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka] flex items-center gap-2"
              >
                <span className="text-3xl">🔭</span> Look!
              </PressButton>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* The word — big tappable letters, tap to hear each sound again */}
            <div className="flex justify-center gap-3">
              {units.map((unit, i) => (
                <motion.button
                  key={i}
                  onClick={() => speakPhoneme(unit.phonemeId)}
                  whileTap={{ scale: 0.9 }}
                  className="w-[80px] h-[88px] rounded-3xl bg-yellow-300 text-gray-800 text-6xl font-bold font-[Fredoka] lowercase shadow-lg press-3d flex items-center justify-center"
                >
                  {unit.text}
                </motion.button>
              ))}
            </div>
            <p className="text-indigo-900/80 font-[Fredoka] text-sm text-center">
              Tap a letter — or 🔊 Again — to hear it
            </p>

            {/* Big picture choices */}
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

      <CelebrationOverlay show={showCelebration} message="Eagle eyes!" onComplete={onComplete} />
    </GameShell>
  );
}
