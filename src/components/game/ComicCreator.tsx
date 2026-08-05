'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speak, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { CONNECTED_COMPREHENSION_ROUNDS } from '@/content/connectedText';

interface ComicPanel {
  sentence: string; // SHE reads this — never spoken before she answers
  question: string; // recorded; asked AFTER she reads
  answer: string;
  choices: string[]; // includes another word FROM the sentence as the trap —
  // matching any picture you saw in the sentence no longer wins; only
  // understanding the question does
}

const STORY: ComicPanel[] = CONNECTED_COMPREHENSION_ROUNDS.map((round) => ({
  sentence: round.sentence,
  question: round.question,
  answer: round.correct,
  choices: round.options,
}));

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'answer' | 'won';

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
    setChoices(shuffle([...rounds[round].choices]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the sentence!' : phase === 'answer' ? current.question : null,
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
    if (shouldReveal && phase === 'answer') {
      (async () => {
        recordSoundAttempt('sentences', false);
        await speakReveal(current.answer);
        setPhase('won');
        setPanels((p) => [...p, current.answer]);
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
    (w: string) => {
      if (phase !== 'answer') return;
      if (w === current.answer) {
        recordSoundAttempt('sentences', true);
        incrementStreak();
        playSoundEffect('coin');
        setPhase('won');
        setPanels((p) => [...p, current.answer]);
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
        // Re-ask the question so she re-reads the sentence with it in mind
        (async () => {
          await speak(current.question);
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
            {phase === 'read' ? 'Read the comic out loud!' : phase === 'answer' ? 'Answer the question!' : 'New panel earned!'}
          </p>
        </div>

        {/* The comic speech bubble with the sentence */}
        <div className="relative bg-white rounded-3xl px-7 py-6 shadow-xl max-w-lg border-4 border-gray-200">
          <span className="text-4xl font-bold font-[Fredoka] text-gray-800 leading-snug">{current.sentence}</span>
          <span className="absolute -bottom-4 left-10 w-8 h-8 bg-white border-b-4 border-r-4 border-gray-200 rotate-45" />
        </div>

        {/* Read gate, then the question's picture choices */}
        {phase === 'read' ? (
          <PressButton
            silent
            onClick={startAnswer}
            className="bg-gradient-to-br from-cyan-500 to-green-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
          >
            ✋ I read it!
          </PressButton>
        ) : (
          <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
            {choices.map((w) => {
              const highlight = (phase === 'won' || shouldReveal) && w === current.answer;
              return (
                <motion.button
                  key={`${round}-${w}`}
                  onClick={() => pick(w)}
                  disabled={phase !== 'answer'}
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
        )}

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
