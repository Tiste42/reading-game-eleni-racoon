'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

interface ComicPanel {
  sentence: string;
  word: string; // picturable key for the panel art
  distractors: string[];
}

const STORY: ComicPanel[] = [
  { sentence: 'The cat sat on a mat.', word: 'cat', distractors: ['dog', 'bug'] },
  { sentence: 'A dog ran to the cat.', word: 'dog', distractors: ['van', 'cup'] },
  { sentence: 'The cat and dog had a nap.', word: 'nap', distractors: ['hot', 'ship'] },
  { sentence: 'A bug sat on a log.', word: 'bug', distractors: ['cat', 'jet'] },
  { sentence: 'He got a red hat.', word: 'hat', distractors: ['net', 'hen'] },
  { sentence: 'The bug fell in the pot.', word: 'pot', distractors: ['bed', 'fin'] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'won';

export default function ComicCreator({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [panels, setPanels] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(STORY).slice(0, 5));
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    setChoices(shuffle([rounds[round].word, ...rounds[round].distractors]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the sentence! Which picture matches?' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'comic-creator');
      addCoins(12);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'read') {
      (async () => {
        recordSoundAttempt('sentences', false);
        await speakReveal(current.word);
        setPhase('won');
        setPanels((p) => [...p, current.word]);
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback(
    (w: string) => {
      if (phase !== 'read') return;
      if (w === current.word) {
        recordSoundAttempt('sentences', true);
        incrementStreak();
        playSoundEffect('coin');
        setPhase('won');
        setPanels((p) => [...p, current.word]);
        (async () => {
          await speakWord(w);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt('sentences', false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        (async () => {
          await speakWord(w); // hear what she picked — doesn't match the sentence
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
      progressIcon="💬"
      bgClassName="from-cyan-300/60 to-green-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={116} />
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            Read it — pick the picture for your comic!
          </p>
        </div>

        {/* The comic speech bubble with the sentence */}
        <div className="relative bg-white rounded-3xl px-7 py-6 shadow-xl max-w-lg border-4 border-gray-200">
          <span className="text-4xl font-bold font-[Fredoka] text-gray-800 leading-snug">{current.sentence}</span>
          <span className="absolute -bottom-4 left-10 w-8 h-8 bg-white border-b-4 border-r-4 border-gray-200 rotate-45" />
        </div>

        {/* Picture choices */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
          {choices.map((w) => {
            const highlight = (phase === 'won' || shouldReveal) && w === current.word;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pick(w)}
                disabled={phase !== 'read'}
                animate={wrongPick === w ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`rounded-3xl p-2 shadow-xl bg-white press-3d flex items-center justify-center transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                }`}
              >
                <WordCard word={w} size={96} />
              </motion.button>
            );
          })}
        </div>

        {/* The comic strip fills in */}
        <div className="flex gap-2 bg-white/60 rounded-2xl px-4 py-2 shadow-inner items-center min-h-[72px]">
          {rounds.map((r, i) => (
            <div
              key={i}
              className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center ${
                i < panels.length ? 'bg-white border-cyan-300' : 'bg-white/40 border-dashed border-gray-300'
              }`}
            >
              {i < panels.length && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <WordCard word={panels[i]} size={52} />
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Comic complete!" onComplete={onComplete} />
    </GameShell>
  );
}
