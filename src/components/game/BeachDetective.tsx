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

interface ClueOption {
  label: string; // recorded audio exists for every label
  icon: string;
  word?: string; // when set, show generated art instead of the emoji
}

interface ClueRound {
  passage: string; // SHE reads this
  question: string; // recorded
  correct: string;
  options: ClueOption[];
}

const CLUE_ROUNDS: ClueRound[] = [
  {
    passage: 'The shell is red. It is big. It is on the sand.',
    question: 'What color is the shell?',
    correct: 'red',
    options: [
      { label: 'red', icon: '🔴' },
      { label: 'blue', icon: '🔵' },
      { label: 'green', icon: '🟢' },
    ],
  },
  {
    passage: 'A crab has a hat. The hat is blue. The crab is happy.',
    question: 'What color is the hat?',
    correct: 'blue',
    options: [
      { label: 'red', icon: '🔴' },
      { label: 'blue', icon: '🔵' },
      { label: 'yellow', icon: '🟡' },
    ],
  },
  {
    passage: 'The fish is in the net. The net is big. A man has the net.',
    question: 'Who has the net?',
    correct: 'a man',
    options: [
      { label: 'a dog', icon: '🐶', word: 'dog' },
      { label: 'a man', icon: '👨', word: 'man' },
      { label: 'a cat', icon: '🐱', word: 'cat' },
    ],
  },
  {
    passage: 'She has a pet dog. The dog can run fast. The dog is on the sand.',
    question: 'Where is the dog?',
    correct: 'on the sand',
    options: [
      { label: 'in the van', icon: '🚐', word: 'van' },
      { label: 'on the bed', icon: '🛏️', word: 'bed' },
      { label: 'on the sand', icon: '🏖️' },
    ],
  },
  {
    passage: 'I can see a big ship. The ship is on the sea. It has a red flag.',
    question: 'What does the ship have?',
    correct: 'a red flag',
    options: [
      { label: 'a blue hat', icon: '🎩', word: 'hat' },
      { label: 'a red flag', icon: '🚩' },
      { label: 'a big net', icon: '🥅', word: 'net' },
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

export default function BeachDetective({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<ClueOption[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(CLUE_ROUNDS));
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
    speak(current.question);
  }, [current.question]);

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
          await speak(current.question); // re-ask so she re-checks the clue
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
      progressIcon="🔎"
      bgClassName="from-cyan-300/60 to-amber-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni detective + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={116} />
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'read' ? '🔎 Read the clue, detective!' : phase === 'answer' ? 'Solve the mystery!' : 'Case closed!'}
          </p>
        </div>

        {/* The clue card */}
        <div className="bg-amber-50 border-4 border-amber-300 rounded-3xl px-7 py-6 shadow-xl max-w-lg">
          <span className="text-3xl font-bold font-[Fredoka] text-gray-800 leading-relaxed">{current.passage}</span>
        </div>

        {/* Read gate, then options */}
        {phase === 'read' ? (
          <PressButton
            silent
            onClick={startAnswer}
            className="bg-gradient-to-br from-cyan-500 to-amber-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
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
                  className={`px-5 py-4 rounded-3xl shadow-xl bg-white press-3d flex flex-col items-center gap-1 transition-all min-w-[130px] ${
                    highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                  }`}
                >
                  {opt.word ? (
                    <WordCard word={opt.word} size={72} />
                  ) : (
                    <span className="text-5xl">{opt.icon}</span>
                  )}
                  <span className="text-xl font-bold font-[Fredoka] text-gray-800 lowercase">{opt.label}</span>
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
