'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useComposedSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

// World 2 letters with a familiar example word (all have real art)
const LETTERS: Array<{ letter: string; word: string }> = [
  { letter: 's', word: 'sun' },
  { letter: 'a', word: 'ant' },
  { letter: 't', word: 'tiger' },
  { letter: 'p', word: 'pig' },
  { letter: 'i', word: 'igloo' },
  { letter: 'n', word: 'nest' },
  { letter: 'e', word: 'egg' },
  { letter: 'l', word: 'lion' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'play' | 'won' | 'model';

export default function LetterIntro({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(LETTERS).slice(0, 6));
  const [choicesByRound] = useState(() =>
    rounds.map((r) =>
      shuffle([r.letter, ...shuffle(LETTERS.filter((l) => l.letter !== r.letter)).slice(0, 2).map((l) => l.letter)]),
    ),
  );
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const choices = choicesByRound[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('play');
    setWrongPick(null);
  }, [round]);

  // Instruction + the REAL human letter sound (never TTS saying "sss")
  const { replay } = useComposedSpeech(
    [
      { say: 'What letter makes this sound?' },
      { pause: 250 },
      { phoneme: current.letter },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'letter-intro');
      addCoins(8);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two misses → Leni models the answer (highlights letter + plays its sound)
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        recordSoundAttempt(current.letter, false);
        await speakReveal(current.letter);
        await speakWord(current.word);
        await new Promise((r) => setTimeout(r, 800));
        modeling.current = false;
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickLetter = useCallback(
    (letter: string) => {
      if (phase !== 'play') return;
      if (letter === current.letter) {
        recordSoundAttempt(letter, true);
        incrementStreak();
        masterPhoneme(letter);
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speakPhoneme(letter);
          await speakWord(current.word);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt(current.letter, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(letter);
        // Re-teach: play the target sound again so she can re-listen
        (async () => {
          await speakPhoneme(current.letter);
          setWrongPick(null);
        })();
      }
    },
    [phase, current, isLast, advance, incrementStreak, masterPhoneme, resetStreak, recordWrong, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🔊"
      bgClassName="from-purple-400/60 to-pink-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={130} />
          <p className="text-purple-900 font-[Fredoka] font-bold text-2xl text-center">
            What letter makes this sound?
          </p>
        </div>

        {/* Big hear-the-sound button */}
        <PressButton
          silent
          onClick={() => speakPhoneme(current.letter)}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-xl flex items-center justify-center"
          aria-label="Hear the sound"
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-6xl"
          >
            🔊
          </motion.span>
        </PressButton>

        {/* The letter choices */}
        <div className="flex gap-4">
          {choices.map((letter) => {
            const isAnswer = letter === current.letter;
            const highlight = (phase !== 'play' || shouldReveal) && isAnswer;
            return (
              <motion.button
                key={`${round}-${letter}`}
                onClick={() => pickLetter(letter)}
                disabled={phase !== 'play'}
                animate={wrongPick === letter ? { x: [-8, 8, -8, 8, 0] } : highlight ? { scale: [1, 1.15, 1] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`w-[104px] h-[112px] rounded-3xl bg-white shadow-xl press-3d flex items-center justify-center text-7xl font-bold font-[Fredoka] text-gray-800 lowercase transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse' : ''
                }`}
              >
                {letter}
              </motion.button>
            );
          })}
        </div>

        {/* On win/model: show the example word so the sound connects to a thing */}
        <div className="min-h-[150px] flex items-center justify-center">
          <AnimatePresence>
            {phase !== 'play' && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="bg-white rounded-3xl p-3 shadow-xl">
                  <WordCard word={current.word} size={110} />
                </div>
                <p className="text-2xl font-bold font-[Fredoka] text-purple-700 lowercase mt-1">
                  {current.letter} — {current.word}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Letter detective!" onComplete={onComplete} />
    </GameShell>
  );
}
