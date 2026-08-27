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
import { getInitialSoundGroups } from '@/content/registry';
import { getPracticedPhonemes } from '@/content/progression';
import { buildChoiceSet, getBalancedAnswerIndex } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { canShareSoundChoices } from '@/content/phonemeConflicts';

// Every word here has a pre-generated "What letter does X start with?" narration line
interface PictureRound {
  id: string;
  word: string;
  letter: string;
  phonemeId: string;
}

const pictureId = (picture: PictureRound) => picture.id;
const letterId = (letter: string) => letter;

// World 2 letter set — distractors only ever come from taught letters

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'play' | 'won' | 'model';

export default function LetterTrace({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const practicedPhonemes = useMemo(
    () => getPracticedPhonemes(enabledContentPackIds, taughtPhonemes),
    [enabledContentPackIds, taughtPhonemes],
  );
  const groups = useMemo(
    () => getInitialSoundGroups(enabledContentPackIds, practicedPhonemes),
    [enabledContentPackIds, practicedPhonemes],
  );
  const pictures = useMemo<PictureRound[]>(() => groups.flatMap((group) => group.words.map((word) => ({
    id: `${group.id}:${word.id}`,
    word: word.text,
    letter: group.letter,
    phonemeId: group.phonemeId,
  }))), [groups]);
  const session = useContentSession({ gameId: 'letter-trace', candidates: pictures, count: 6, getId: pictureId });
  const rounds = session.items;
  const availableLetters = useMemo(() => [...new Set(groups.map((group) => group.letter))], [groups]);
  const phonemeByLetter = useMemo(() => new Map(groups.map((group) => [group.letter, group.phonemeId])), [groups]);
  const [choicesByRound] = useState(() => rounds.map((current, index) =>
    buildChoiceSet(current.letter, availableLetters, {
      count: 3,
      seed: `${session.seed}:${current.id}:choices`,
      answerIndex: getBalancedAnswerIndex(index, 3, session.seed),
      getId: letterId,
      canUseDistractor: (answer, distractor) => canShareSoundChoices(
        phonemeByLetter.get(answer) || answer,
        phonemeByLetter.get(distractor) || distractor,
      ),
    }),
  ));
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const choices = choicesByRound[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('play');
    setWrongPick(null);
  }, [round]);

  // Per-word instruction line — every one exists as a pre-generated narration file
  const { replay } = useComposedSpeech(
    [
      { say: 'What letter does it start with?' },
      { pause: 200 },
      { options: [current.word] },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'letter-trace');
      addCoins(8);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two misses → Leni models: "Not quite, the answer is... /s/" + the word,
  // with the right tile glowing green. Then auto-advance — never a dead end.
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        recordSoundAttempt(current.phonemeId, false);
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
        // Re-teach: replay the word so she re-hears its first sound, then retry
        (async () => {
          await speakWord(current.word);
          setWrongPick(null);
        })();
      }
    },
    [phase, current, isLast, advance, incrementStreak, masterPhoneme, resetStreak, recordWrong, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🌻"
      bgClassName="from-purple-400/60 to-pink-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p
            data-testid="letter-trace-prompt"
            className="text-purple-900 font-[Fredoka] font-bold text-2xl text-center"
          >
            What letter does it start with?
          </p>
        </div>

        {/* Big picture — tap to re-hear the word */}
        <motion.div
          key={round}
          initial={{ scale: 0, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 16 }}
        >
          <PressButton
            onClick={() => speakWord(current.word)}
            className="bg-white rounded-[2rem] p-4 shadow-xl flex items-center justify-center"
            aria-label={`Hear ${current.word}`}
          >
            <WordCard word={current.word} size={170} />
          </PressButton>
        </motion.div>

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

        {/* On win/model: connect the letter to the word */}
        <div className="min-h-[48px] flex items-center justify-center">
          <AnimatePresence>
            {phase !== 'play' && (
              <motion.p
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-3xl font-bold font-[Fredoka] text-purple-700 lowercase"
              >
                {current.letter} — {current.word}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Beginning sounds star!" onComplete={onComplete} />
    </GameShell>
  );
}
