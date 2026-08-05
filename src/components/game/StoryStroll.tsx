'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speak, speakFeedback } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getStories } from '@/content/registry';
import type { StoryRound } from '@/content/types';
import { buildChoiceSet, getBalancedAnswerIndex } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';

const storyId = (story: StoryRound) => story.id;
const textId = (text: string) => text;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'answer' | 'won';

export default function StoryStroll({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const storyPool = useMemo(() => getStories(enabledContentPackIds), [enabledContentPackIds]);
  const session = useContentSession({ gameId: 'story-stroll', candidates: storyPool, count: 6, getId: storyId });
  const rounds = session.items;
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    setChoices(buildChoiceSet(current.correct, current.options, {
      count: current.options.length,
      seed: `${session.seed}:${current.id}:choices`,
      answerIndex: getBalancedAnswerIndex(round, current.options.length, session.seed),
      getId: textId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the sentence!' : phase === 'answer' ? current.question : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'story-stroll');
      addCoins(12);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'answer') {
      (async () => {
        recordSoundAttempt('sentences', false);
        await speak(current.correct);
        setPhase('won');
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const startAnswer = useCallback(() => {
    playSoundEffect('tap');
    setPhase('answer');
  }, []);

  const pick = useCallback(
    (opt: string) => {
      if (phase !== 'answer') return;
      if (opt === current.correct) {
        recordSoundAttempt('sentences', true);
        incrementStreak();
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speak(opt);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt('sentences', false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(opt);
        (async () => {
          await speak(current.question); // re-ask
          setWrongPick(null);
        })();
      }
    },
    [phase, current, isLast, advance, incrementStreak, resetStreak, recordWrong, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🛶"
      bgClassName="from-cyan-300/60 to-green-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={118} />
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'read' ? 'Read the sign!' : phase === 'answer' ? 'Now answer the question!' : 'Great reading!'}
          </p>
        </div>

        {/* The river sign with the sentence + picture revealed on win */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-amber-50 border-8 border-amber-700 rounded-3xl px-7 py-6 shadow-xl max-w-lg">
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800 leading-snug">{current.text}</span>
          </div>
          {phase === 'won' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-2 shadow-xl">
              <WordCard word={current.correct} size={104} />
            </motion.div>
          )}
        </div>

        {/* Read-it gate, then the answer options */}
        {phase === 'read' ? (
          <PressButton
            silent
            onClick={startAnswer}
            className="bg-gradient-to-br from-cyan-500 to-green-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
          >
            ✋ I read it!
          </PressButton>
        ) : (
          <div className="flex gap-3 flex-wrap justify-center">
            {choices.map((opt) => {
              const highlight = (phase === 'won' || shouldReveal) && opt === current.correct;
              return (
                <motion.button
                  key={`${round}-${opt}`}
                  data-testid="story-picture-choice"
                  onClick={() => pick(opt)}
                  disabled={phase !== 'answer'}
                  animate={wrongPick === opt ? { x: [-8, 8, -8, 8, 0] } : {}}
                  whileTap={{ scale: 0.92 }}
                  className={`p-3 rounded-3xl shadow-xl bg-white press-3d transition-all ${
                    highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                  }`}
                >
                  <WordCard word={opt} size={96} />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Story explorer!" onComplete={onComplete} />
    </GameShell>
  );
}
