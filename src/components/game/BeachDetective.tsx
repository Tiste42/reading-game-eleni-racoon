'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speak, speakFeedback } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { BEACH_COMPREHENSION_ROUNDS, type IconComprehensionOption } from '@/content/connectedText';
import { useContentSession } from '@/lib/useContentSession';

const beachRoundId = (candidate: (typeof BEACH_COMPREHENSION_ROUNDS)[number]) => `${candidate.sentence}:${candidate.question}`;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'answer' | 'won';

export default function BeachDetective({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<IconComprehensionOption[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const session = useContentSession({
    gameId: 'beach-detective',
    candidates: BEACH_COMPREHENSION_ROUNDS,
    count: 5,
    getId: beachRoundId,
  });
  const rounds = session.items;
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    setChoices(shuffle([...current.options]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the clue!' : phase === 'answer' ? current.question : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'beach-detective');
      addCoins(12);
      setShowCelebration(true);
    } else {
      setRound((value) => value + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'answer') {
      (async () => {
        recordSoundAttempt('sentences', false);
        setPhase('won');
        await new Promise((resolve) => setTimeout(resolve, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback((label: string) => {
    if (phase !== 'answer') return;
    if (label === current.correct) {
      recordSoundAttempt('sentences', true);
      incrementStreak();
      playSoundEffect('coin');
      setPhase('won');
      (async () => {
        await speak(label);
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise((resolve) => setTimeout(resolve, 700));
        advance();
      })();
    } else {
      recordSoundAttempt('sentences', false);
      recordWrong();
      resetStreak();
      playSoundEffect('wrong');
      setWrongPick(label);
      (async () => {
        await speak(current.question);
        setWrongPick(null);
      })();
    }
  }, [phase, current, isLast, advance, incrementStreak, resetStreak, recordWrong, recordSoundAttempt]);

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🔎"
      bgClassName="from-cyan-300/60 to-amber-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={116} />
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'read' ? '🔎 Read the clue, detective!' : phase === 'answer' ? 'Solve the mystery!' : 'Case closed!'}
          </p>
        </div>

        <div className="bg-amber-50 border-4 border-amber-300 rounded-3xl px-7 py-6 shadow-xl max-w-lg">
          <span className="text-3xl font-bold font-[Fredoka] text-gray-800 leading-relaxed">{current.sentence}</span>
        </div>

        {phase === 'read' ? (
          <PressButton
            onClick={() => { setPhase('answer'); }}
            className="bg-gradient-to-br from-cyan-500 to-amber-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
          >
            ✋ I read it!
          </PressButton>
        ) : (
          <div className="flex gap-3 flex-wrap justify-center">
            {choices.map((option) => {
              const highlight = (phase === 'won' || shouldReveal) && option.label === current.correct;
              return (
                <motion.button
                  key={`${round}-${option.label}`}
                  data-testid="beach-picture-choice"
                  onClick={() => pick(option.label)}
                  disabled={phase !== 'answer'}
                  aria-label="Picture choice"
                  animate={wrongPick === option.label ? { x: [-8, 8, -8, 8, 0] } : {}}
                  whileTap={{ scale: 0.92 }}
                  className={`px-5 py-4 rounded-3xl shadow-xl bg-white press-3d flex flex-col items-center gap-1 transition-all min-w-[130px] ${
                    highlight ? 'ring-4 ring-green-400 scale-105' : ''
                  }`}
                >
                  <span className="text-5xl" aria-hidden="true">{option.icon}</span>
                  {phase === 'won' && option.label === current.correct && (
                    <span className="text-xl font-bold font-[Fredoka] text-gray-800 lowercase">{option.label}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Super sleuth!" onComplete={onComplete} />
    </GameShell>
  );
}
