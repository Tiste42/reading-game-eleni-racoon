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

interface RescueRound {
  sentence: string; // SHE reads this
  spokenLine: string; // recorded "The manatee needs help! ..." line
  correct: string;
  options: Array<{ label: string; icon: string }>; // option labels are recorded
}

const RESCUE_ROUNDS: RescueRound[] = [
  {
    sentence: 'The big net is on the fin.',
    spokenLine: 'The manatee needs help! The big net is on the fin. What should we do?',
    correct: 'Remove the net',
    options: [
      { label: 'Remove the net', icon: '🥅' },
      { label: 'Add more net', icon: '❌' },
      { label: 'Swim away', icon: '🏄' },
    ],
  },
  {
    sentence: 'The log is in the path.',
    spokenLine: 'The manatee needs help! The log is in the path. What should we do?',
    correct: 'Move the log',
    options: [
      { label: 'Sit on it', icon: '🪑' },
      { label: 'Move the log', icon: '🪵' },
      { label: 'Jump on it', icon: '🦘' },
    ],
  },
  {
    sentence: 'The cup fell in the pond.',
    spokenLine: 'The manatee needs help! The cup fell in the pond. What should we do?',
    correct: 'Pick it up',
    options: [
      { label: 'Leave it', icon: '❌' },
      { label: 'Push it deeper', icon: '❌' },
      { label: 'Pick it up', icon: '☕' },
    ],
  },
  {
    sentence: 'A can is on the sand.',
    spokenLine: 'The manatee needs help! A can is on the sand. What should we do?',
    correct: 'Put it in the bin',
    options: [
      { label: 'Put it in the bin', icon: '🗑️' },
      { label: 'Kick it', icon: '❌' },
      { label: 'Hide it', icon: '❌' },
    ],
  },
  {
    sentence: 'The fish is in a net.',
    spokenLine: 'The manatee needs help! The fish is in a net. How do we help?',
    correct: 'Free the fish',
    options: [
      { label: 'Cook it', icon: '❌' },
      { label: 'Free the fish', icon: '🐟' },
      { label: 'Watch it', icon: '❌' },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'answer' | 'won';

export default function ManateeRescue({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<RescueRound['options']>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(RESCUE_ROUNDS));
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
    phase === 'read' ? 'Read the clue!' : phase === 'answer' ? current.spokenLine : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'manatee-rescue');
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
    speak(current.spokenLine);
  }, [current.spokenLine]);

  const pick = useCallback(
    (label: string) => {
      if (phase !== 'answer') return;
      if (label === current.correct) {
        recordSoundAttempt('sentences', true);
        incrementStreak();
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speak(label);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt('sentences', false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(label);
        (async () => {
          await speak(label); // hear the choice — Leni's tone makes the mismatch clear
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
      progressIcon="🦭"
      bgClassName="from-cyan-300/60 to-blue-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + manatee */}
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-1">
            <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={110} />
            <motion.span
              animate={phase === 'won' ? { y: [0, -14, 0], rotate: [0, 10, -10, 0] } : { y: [0, -4, 0] }}
              transition={{ duration: phase === 'won' ? 0.6 : 2.2, repeat: Infinity }}
              className="text-7xl"
            >
              🦭
            </motion.span>
          </div>
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'won' ? 'You saved the manatee!' : 'The manatee needs help!'}
          </p>
        </div>

        {/* The clue SHE reads */}
        <div className="bg-white rounded-3xl px-7 py-6 shadow-xl max-w-lg">
          <span className="text-4xl font-bold font-[Fredoka] text-gray-800 leading-snug">{current.sentence}</span>
        </div>

        {/* Read gate, then action choices */}
        {phase === 'read' ? (
          <PressButton
            silent
            onClick={startAnswer}
            className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
          >
            ✋ I read it!
          </PressButton>
        ) : (
          <div className="flex gap-3 flex-wrap justify-center">
            {choices.map((opt) => {
              const highlight = (phase === 'won' || shouldReveal) && opt.label === current.correct;
              return (
                <motion.button
                  key={`${round}-${opt.label}`}
                  onClick={() => pick(opt.label)}
                  disabled={phase !== 'answer'}
                  animate={wrongPick === opt.label ? { x: [-8, 8, -8, 8, 0] } : {}}
                  whileTap={{ scale: 0.92 }}
                  className={`px-5 py-4 rounded-3xl shadow-xl bg-white press-3d flex flex-col items-center gap-1 transition-all min-w-[140px] ${
                    highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                  }`}
                >
                  <span className="text-4xl">{opt.icon}</span>
                  <span className="text-xl font-bold font-[Fredoka] text-gray-800">{opt.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Manatee hero!" onComplete={onComplete} />
    </GameShell>
  );
}
