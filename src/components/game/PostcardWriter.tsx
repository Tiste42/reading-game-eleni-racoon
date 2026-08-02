'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speak, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getPostcards } from '@/content/registry';
import type { PostcardRound } from '@/content/types';
import { buildChoiceSet, getBalancedAnswerIndex } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';

const postcardId = (postcard: PostcardRound) => postcard.id;
const textId = (text: string) => text;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'pick' | 'won';

export default function PostcardWriter({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [stamps, setStamps] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const postcardPool = useMemo(() => getPostcards(enabledContentPackIds), [enabledContentPackIds]);
  const session = useContentSession({ gameId: 'postcard-writer', candidates: postcardPool, count: 6, getId: postcardId });
  const rounds = session.items;
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('pick');
    setWrongPick(null);
    setChoices(buildChoiceSet(current.correct, current.options, {
      count: current.options.length,
      seed: `${session.seed}:${current.id}:choices`,
      answerIndex: getBalancedAnswerIndex(round, current.options.length, session.seed),
      getId: textId,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Recorded line: "I can see a blank."
  const { replay } = useGameSpeech(phase === 'pick' ? current.spoken : null, [round, phase]);

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'postcard-writer');
      addCoins(12);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  useEffect(() => {
    if (shouldReveal && phase === 'pick') {
      (async () => {
        recordSoundAttempt('sentences', false);
        await speakReveal(current.correct);
        setPhase('won');
        setStamps((s) => s + 1);
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback(
    (w: string) => {
      if (phase !== 'pick') return;
      if (w === current.correct) {
        recordSoundAttempt('sentences', true);
        incrementStreak();
        playSoundEffect('coin');
        setPhase('won');
        setStamps((s) => s + 1);
        (async () => {
          await speakWord(w);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt('sentences', false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        (async () => {
          await speakWord(w); // hear her pick
          await speak(current.spoken); // re-read the sentence with the blank
          setWrongPick(null);
        })();
      }
    },
    [phase, current, isLast, advance, incrementStreak, resetStreak, recordWrong, recordSoundAttempt],
  );

  const filled = phase === 'won';

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="📮"
      bgClassName="from-cyan-300/60 to-orange-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={filled ? 'celebrating' : 'excited'} size={118} />
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {filled ? 'Postcard sent!' : 'Which word finishes the postcard?'}
          </p>
        </div>

        {/* The postcard — the PHOTO decides the answer; she must READ the
            word options below to find the one that matches it */}
        <div className="bg-white rounded-3xl px-7 py-5 shadow-xl max-w-lg border-4 border-dashed border-orange-200 relative">
          <span className="absolute top-2 right-3 text-3xl">{filled ? '📮' : '🖊️'}</span>
          <div className="flex justify-center mb-2">
            <div className="bg-cyan-50 border-4 border-white rounded-2xl p-2 shadow-md rotate-[-2deg]">
              <WordCard word={current.correct} size={120} />
            </div>
          </div>
          <p className="text-4xl font-bold font-[Fredoka] text-gray-800 leading-snug text-center">
            {current.template.split('___')[0]}
            <span
              className={`inline-block min-w-[110px] text-center mx-1 rounded-xl px-2 ${
                filled ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-300 border-b-4 border-dashed border-orange-300'
              }`}
            >
              {filled ? current.correct : '···'}
            </span>
            {current.template.split('___')[1]}
          </p>
        </div>

        {/* TEXT-ONLY word choices — the reading is in decoding these */}
        <div className="flex gap-3 flex-wrap justify-center">
          {choices.map((w) => {
            const highlight = (filled || shouldReveal) && w === current.correct;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pick(w)}
                disabled={phase !== 'pick'}
                animate={wrongPick === w ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`px-7 py-5 rounded-3xl shadow-xl bg-white press-3d transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                }`}
              >
                <span className="text-5xl font-bold font-[Fredoka] text-gray-800 lowercase">{w}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Stamp collection */}
        <div className="flex gap-2 bg-white/60 rounded-2xl px-4 py-1.5 shadow-inner items-center min-h-[44px]">
          {rounds.map((_, i) => (
            <span key={i} className={`text-3xl ${i < stamps ? '' : 'opacity-25 grayscale'}`}>
              📮
            </span>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Mail delivered!" onComplete={onComplete} />
    </GameShell>
  );
}
