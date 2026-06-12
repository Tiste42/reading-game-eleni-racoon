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
import { ITEM_ART } from '@/lib/itemArt';

interface PhraseRound {
  phrase: string;
  correct: string;
  options: string[]; // all options have recorded audio (words or inst phrases)
  pictureWord?: string; // shown after she reads — visual confirmation
}

const PHRASES: PhraseRound[] = [
  { phrase: 'the cat', correct: 'a cat', options: ['a cat', 'a dog', 'a hat'], pictureWord: 'cat' },
  { phrase: 'a big hat', correct: 'a hat', options: ['a hat', 'a cup', 'a net'], pictureWord: 'hat' },
  { phrase: 'he can run', correct: 'run', options: ['run', 'sit', 'nap'], pictureWord: 'run' },
  { phrase: 'the red cup', correct: 'red', options: ['red', 'big', 'hot'], pictureWord: 'cup' },
  { phrase: 'I have a dog', correct: 'a dog', options: ['a dog', 'a cat', 'a bug'], pictureWord: 'dog' },
  { phrase: 'my big van', correct: 'van', options: ['van', 'man', 'fan'], pictureWord: 'van' },
];

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
  const [rounds] = useState(() => shuffle(PHRASES));
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
    phase === 'read' ? 'Read the sign! What does it say?' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'souk-sentences');
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
        await speak(current.correct); // option audio exists
        setPhase('won');
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

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
          await speak(opt); // hear what she picked
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
      progressIcon="📜"
      bgClassName="from-red-300/60 to-amber-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter costume="explorer" pose={phase === 'won' ? 'celebrating' : 'excited'} size={118} animate={false} />
          <p className="text-red-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'read' ? 'Read the market sign!' : phase === 'answer' ? 'What did it say?' : 'You read it!'}
          </p>
        </div>

        {/* The market sign */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-amber-50 border-8 border-amber-700 rounded-3xl px-8 py-6 shadow-xl">
            <span className="text-5xl font-bold font-[Fredoka] text-gray-800">{current.phrase}</span>
          </div>
          {phase === 'won' && current.pictureWord && ITEM_ART.has(current.pictureWord) && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-2 shadow-xl">
              <WordCard word={current.pictureWord} size={104} />
            </motion.div>
          )}
        </div>

        {/* Read-it gate, then choices */}
        {phase === 'read' ? (
          <PressButton
            silent
            onClick={() => { playSoundEffect('tap'); setPhase('answer'); }}
            className="bg-gradient-to-br from-red-500 to-amber-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
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
                  onClick={() => pick(opt)}
                  disabled={phase !== 'answer'}
                  animate={wrongPick === opt ? { x: [-8, 8, -8, 8, 0] } : {}}
                  whileTap={{ scale: 0.92 }}
                  className={`px-7 py-5 rounded-3xl shadow-xl bg-white press-3d transition-all ${
                    highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                  }`}
                >
                  <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{opt}</span>
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
