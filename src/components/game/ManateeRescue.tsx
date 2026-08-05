'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import PressButton from '@/components/ui/PressButton';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { MANATEE_COMPREHENSION_ROUNDS } from '@/content/connectedText';

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
  const [choices, setChoices] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(MANATEE_COMPREHENSION_ROUNDS));
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
      completeGame(worldId, 'manatee-rescue');
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

  const pick = useCallback((word: string) => {
    if (phase !== 'answer') return;
    if (word === current.correct) {
      recordSoundAttempt('sentences', true);
      incrementStreak();
      playSoundEffect('coin');
      setPhase('won');
      (async () => {
        await speakWord(word);
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise((resolve) => setTimeout(resolve, 700));
        advance();
      })();
    } else {
      recordSoundAttempt('sentences', false);
      recordWrong();
      resetStreak();
      playSoundEffect('wrong');
      setWrongPick(word);
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
      progressIcon="🌊"
      bgClassName="from-cyan-300/60 to-blue-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-1">
            <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={110} />
            <motion.img
              src="/images/generated/items/manatee.png"
              alt="manatee"
              width={120}
              height={120}
              draggable={false}
              animate={phase === 'won' ? { y: [0, -14, 0], rotate: [0, 10, -10, 0] } : { y: [0, -4, 0] }}
              transition={{ duration: phase === 'won' ? 0.6 : 2.2, repeat: Infinity }}
              className="w-28 h-28 object-contain select-none"
            />
          </div>
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'won' ? 'You saved the manatee!' : 'The manatee needs help!'}
          </p>
        </div>

        <div className="bg-white rounded-3xl px-7 py-6 shadow-xl max-w-lg">
          <span className="text-4xl font-bold font-[Fredoka] text-gray-800 leading-snug">{current.sentence}</span>
        </div>

        {phase === 'read' ? (
          <PressButton
            silent
            onClick={() => { playSoundEffect('tap'); setPhase('answer'); }}
            className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white px-10 py-5 rounded-full text-2xl font-[Fredoka]"
          >
            ✋ I read it!
          </PressButton>
        ) : (
          <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
            {choices.map((word) => {
              const highlight = (phase === 'won' || shouldReveal) && word === current.correct;
              return (
                <motion.button
                  key={`${round}-${word}`}
                  data-testid="manatee-picture-choice"
                  onClick={() => pick(word)}
                  disabled={phase !== 'answer'}
                  aria-label="Picture choice"
                  animate={wrongPick === word ? { x: [-8, 8, -8, 8, 0] } : {}}
                  whileTap={{ scale: 0.92 }}
                  className={`rounded-3xl p-2 shadow-xl bg-white press-3d flex items-center justify-center transition-all ${
                    highlight ? 'ring-4 ring-green-400 scale-105' : ''
                  }`}
                >
                  <WordCard word={word} size={96} />
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
