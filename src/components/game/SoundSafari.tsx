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
import { getInitialSoundGroups, type ResolvedSoundGroup } from '@/content/registry';
import { buildChoiceSet, getBalancedAnswerIndex, shuffleSeeded } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { getPracticedPhonemes } from '@/content/progression';
import { canShareSoundChoices } from '@/content/phonemeConflicts';

interface Round {
  id: string;
  letter: string;
  phonemeId: string;
  word: string; // the correct picture
  choices: Array<{ letter: string; word: string }>;
}

const groupId = (group: ResolvedSoundGroup) => group.id;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'play' | 'won' | 'model';

export default function SoundSafari({ worldId, onComplete }: Props) {
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
  const session = useContentSession({ gameId: 'sound-safari', candidates: groups, count: 6, getId: groupId });
  const [rounds] = useState<Round[]>(() => session.items.map((group, index) => {
    const target = shuffleSeeded(group.words, `${session.seed}:${group.id}:target`)[0];
    const choiceGroups = buildChoiceSet(group, groups, {
      count: 3,
      seed: `${session.seed}:${group.id}:choices`,
      answerIndex: getBalancedAnswerIndex(index, 3, session.seed),
      getId: groupId,
      canUseDistractor: (answer, distractor) => canShareSoundChoices(answer.phonemeId, distractor.phonemeId),
    });
    return {
      id: group.id,
      letter: group.letter,
      phonemeId: group.phonemeId,
      word: target.text,
      choices: choiceGroups.map((choiceGroup) => ({
        letter: choiceGroup.letter,
        word: shuffleSeeded(choiceGroup.words, `${session.seed}:${group.id}:${choiceGroup.id}`)[0].text,
      })),
    };
  }));
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('play');
    setWrongPick(null);
  }, [round]);

  // Instruction + the REAL human letter sound (never TTS saying "sss")
  const { replay } = useComposedSpeech(
    [
      { say: 'Which picture starts with this sound?' },
      { pause: 250 },
      { phoneme: current.phonemeId },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'sound-safari');
      addCoins(8);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two misses → Leni models the answer (highlights the picture + says the word)
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        recordSoundAttempt(current.phonemeId, false);
        await speakReveal(current.word);
        await speakPhoneme(current.phonemeId);
        await new Promise((r) => setTimeout(r, 800));
        modeling.current = false;
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickPicture = useCallback(
    (choice: { letter: string; word: string }) => {
      if (phase !== 'play') return;
      if (choice.letter === current.letter) {
        recordSoundAttempt(current.phonemeId, true);
        incrementStreak();
        masterPhoneme(current.phonemeId);
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speakWord(choice.word);
          await speakPhoneme(current.phonemeId);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt(current.phonemeId, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(choice.word);
        // Re-teach: play the target sound again so she can re-listen
        (async () => {
          await speakPhoneme(current.phonemeId);
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
      progressIcon="🦁"
      bgClassName="from-emerald-300/60 to-lime-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-emerald-900 font-[Fredoka] font-bold text-2xl text-center">
            Which picture starts with this sound?
          </p>
        </div>

        {/* Big hear-the-sound button */}
        <PressButton
          silent
          onClick={() => speakPhoneme(current.phonemeId)}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl flex items-center justify-center"
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

        {/* The picture choices */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
          {current.choices.map((choice) => {
            const isAnswer = choice.letter === current.letter;
            const highlight = (phase !== 'play' || shouldReveal) && isAnswer;
            return (
              <motion.button
                key={`${round}-${choice.word}`}
                onClick={() => pickPicture(choice)}
                disabled={phase !== 'play'}
                animate={wrongPick === choice.word ? { x: [-8, 8, -8, 8, 0] } : highlight ? { scale: [1, 1.12, 1] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`rounded-3xl p-2 bg-white shadow-xl press-3d flex items-center justify-center transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse' : ''
                }`}
              >
                <WordCard word={choice.word} size={96} />
              </motion.button>
            );
          })}
        </div>

        {/* On win/model: show the letter so the sound connects to its symbol */}
        <div className="min-h-[130px] flex items-center justify-center">
          <AnimatePresence>
            {phase !== 'play' && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-[96px] h-[96px] rounded-3xl bg-white shadow-xl flex items-center justify-center text-6xl font-bold font-[Fredoka] text-gray-800 lowercase">
                  {current.letter}
                </div>
                <p className="text-2xl font-bold font-[Fredoka] text-emerald-800 lowercase mt-1">
                  {current.letter} — {current.word}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Sound safari star!" onComplete={onComplete} />
    </GameShell>
  );
}
