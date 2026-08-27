'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useComposedSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getLetterExamples } from '@/content/registry';
import type { LetterExample } from '@/content/types';
import { buildChoiceSet, getBalancedAnswerIndex } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { canShareSoundChoices } from '@/content/phonemeConflicts';

const exampleId = (example: LetterExample) => example.letter;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'play' | 'won' | 'model';

export default function LetterIntro({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const examples = useMemo(() => getLetterExamples(enabledContentPackIds), [enabledContentPackIds]);
  const candidates = useMemo(() => {
    const untaught = examples.filter((example) => !taughtPhonemes.includes(example.phonemeId));
    return untaught.length >= 6
      ? untaught
      : [...untaught, ...examples.filter((example) => taughtPhonemes.includes(example.phonemeId))];
  }, [examples, taughtPhonemes]);
  const session = useContentSession({ gameId: 'letter-intro', candidates, count: 6, getId: exampleId });
  const rounds = session.items;
  const [choicesByRound] = useState(() => rounds.map((current, index) =>
    buildChoiceSet(current, examples, {
      count: 3,
      seed: `${session.seed}:${current.letter}:choices`,
      answerIndex: getBalancedAnswerIndex(index, 3, session.seed),
      getId: exampleId,
      canUseDistractor: (answer, distractor) => canShareSoundChoices(answer.phonemeId, distractor.phonemeId),
    }).map((example) => example.letter),
  ));
  const { completeGame, addCoins, masterPhoneme, teachPhoneme, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const choices = choicesByRound[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('play');
    setWrongPick(null);
  }, [round]);

  // Instruction + the REAL human letter sound (never TTS saying "sss")
  const { replay } = useComposedSpeech(
    [
      { say: 'What letter makes this sound?' },
      { pause: 250 },
      { phoneme: current.phonemeId },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'letter-intro');
      addCoins(8);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two misses → Leni models the answer (highlights letter + plays its sound)
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        recordSoundAttempt(current.phonemeId, false);
        teachPhoneme(current.phonemeId);
        await speakReveal(current.phonemeId);
        await speakWord(current.word);
        await new Promise((r) => setTimeout(r, 800));
        modeling.current = false;
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickLetter = useCallback(
    (letter: string) => {
      if (phase !== 'play') return;
      if (letter === current.letter) {
        recordSoundAttempt(current.phonemeId, true);
        incrementStreak();
        teachPhoneme(current.phonemeId);
        masterPhoneme(current.phonemeId);
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speakPhoneme(current.phonemeId);
          await speakWord(current.word);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt(current.phonemeId, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(letter);
        // Re-teach: play the target sound again so she can re-listen
        (async () => {
          await speakPhoneme(current.phonemeId);
          setWrongPick(null);
        })();
      }
    },
    [phase, current, isLast, advance, incrementStreak, masterPhoneme, teachPhoneme, resetStreak, recordWrong, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🔊"
      bgClassName="from-purple-400/60 to-pink-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={130} />
          <p className="text-purple-900 font-[Fredoka] font-bold text-2xl text-center">
            What letter makes this sound?
          </p>
        </div>

        {/* Big hear-the-sound button */}
        <PressButton
          onClick={() => speakPhoneme(current.phonemeId)}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl flex items-center justify-center"
          aria-label="Hear the sound"
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-6xl"
          >
            🔊
          </motion.span>
        </PressButton>

        {/* The letter choices */}
        <div className="flex gap-4">
          {choices.map((letter) => {
            const isAnswer = letter === current.letter;
            const highlight = (phase !== 'play' || shouldReveal) && isAnswer;
            return (
              <motion.button
                key={`${round}-${letter}`}
                onClick={() => pickLetter(letter)}
                disabled={phase !== 'play'}
                animate={wrongPick === letter ? { x: [-8, 8, -8, 8, 0] } : highlight ? { scale: [1, 1.15, 1] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`w-[104px] h-[112px] rounded-3xl bg-white shadow-xl press-3d flex items-center justify-center text-7xl font-bold font-[Fredoka] text-gray-800 lowercase transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse' : ''
                }`}
              >
                {letter}
              </motion.button>
            );
          })}
        </div>

        {/* On win/model: show the example word so the sound connects to a thing */}
        <div className="min-h-[150px] flex items-center justify-center">
          <AnimatePresence>
            {phase !== 'play' && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="bg-white rounded-3xl p-3 shadow-xl">
                  <WordCard word={current.word} size={110} />
                </div>
                <p className="text-2xl font-bold font-[Fredoka] text-purple-700 lowercase mt-1">
                  {current.letter} — {current.word}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Letter detective!" onComplete={onComplete} />
    </GameShell>
  );
}
