'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { CONNECTED_COMPREHENSION_ROUNDS } from '@/content/connectedText';
import { useContentSession } from '@/lib/useContentSession';

const comprehensionId = (candidate: (typeof CONNECTED_COMPREHENSION_ROUNDS)[number]) => `${candidate.sentence}:${candidate.question}`;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'answer' | 'won';

export default function SoukSentences({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const session = useContentSession({
    gameId: 'souk-sentences',
    historyKey: 'connected-comprehension',
    candidates: CONNECTED_COMPREHENSION_ROUNDS,
    count: 6,
    getId: comprehensionId,
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
    phase === 'read' ? 'Read the sentence!' : phase === 'answer' ? current.question : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'souk-sentences');
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
        await speak(current.correct);
        setPhase('won');
        await new Promise((resolve) => setTimeout(resolve, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback((option: string) => {
    if (phase !== 'answer') return;
    if (option === current.correct) {
      recordSoundAttempt('sentences', true);
      incrementStreak();
      playSoundEffect('coin');
      setPhase('won');
      (async () => {
        await speak(option);
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise((resolve) => setTimeout(resolve, 700));
        advance();
      })();
    } else {
      recordSoundAttempt('sentences', false);
      recordWrong();
      resetStreak();
      playSoundEffect('wrong');
      setWrongPick(option);
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
      progressIcon="📜"
      bgClassName="from-red-300/60 to-amber-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        <div className="flex flex-col items-center">
          <EleniCharacter costume="explorer" pose={phase === 'won' ? 'celebrating' : 'excited'} size={118} animate={false} />
          <p className="text-red-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'read' ? 'Read the market sign!' : phase === 'answer' ? 'Answer the question!' : 'You read it!'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="bg-amber-50 border-8 border-amber-700 rounded-3xl px-8 py-6 shadow-xl">
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800">{current.sentence}</span>
          </div>
          {phase === 'won' && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-2 shadow-xl">
              <WordCard word={current.correct} size={104} />
            </motion.div>
          )}
        </div>

        {phase === 'read' ? (
          <PressButton
            onClick={() => { setPhase('answer'); }}
            className="bg-gradient-to-br from-red-500 to-amber-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
          >
            ✋ I read it!
          </PressButton>
        ) : (
          <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
            {choices.map((option) => {
              const highlight = (phase === 'won' || shouldReveal) && option === current.correct;
              return (
                <motion.button
                  key={`${round}-${option}`}
                  data-testid="souk-picture-choice"
                  onClick={() => pick(option)}
                  disabled={phase !== 'answer'}
                  animate={wrongPick === option ? { x: [-8, 8, -8, 8, 0] } : {}}
                  whileTap={{ scale: 0.92 }}
                  className={`p-3 rounded-3xl shadow-xl bg-white press-3d transition-all ${
                    highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                  }`}
                >
                  <WordCard word={option} size={96} />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Souk star!" onComplete={onComplete} />
    </GameShell>
  );
}
