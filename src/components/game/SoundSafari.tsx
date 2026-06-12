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

// Toddler-recognizable words per letter — every one has real art AND audio
const LETTER_WORDS: Record<string, string[]> = {
  s: ['sun', 'sock', 'star', 'snake'],
  a: ['ant', 'apple'],
  t: ['tiger', 'tent'],
  p: ['pig', 'penguin', 'pen'],
  i: ['igloo', 'insect'],
  n: ['nest', 'nut', 'net'],
  e: ['egg', 'elephant'],
  l: ['lion', 'lemon', 'lip'],
};
const LETTERS = Object.keys(LETTER_WORDS);

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Round {
  letter: string;
  word: string; // the correct picture
  choices: Array<{ letter: string; word: string }>;
}

function buildRounds(): Round[] {
  return shuffle(LETTERS).slice(0, 6).map((letter) => {
    const word = pick(LETTER_WORDS[letter]);
    const others = shuffle(LETTERS.filter((l) => l !== letter))
      .slice(0, 2)
      .map((l) => ({ letter: l, word: pick(LETTER_WORDS[l]) }));
    return { letter, word, choices: shuffle([{ letter, word }, ...others]) };
  });
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'play' | 'won' | 'model';

export default function SoundSafari({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('play');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(buildRounds);
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('play');
    setWrongPick(null);
  }, [round]);

  // Instruction + the REAL human letter sound (never TTS saying "sss")
  const { replay } = useComposedSpeech(
    [
      { say: 'Which picture starts with this sound?' },
      { pause: 250 },
      { phoneme: current.letter },
    ],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'sound-safari');
      addCoins(8);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two misses → Leni models the answer (highlights the picture + says the word)
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase === 'play' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        recordSoundAttempt(current.letter, false);
        await speakReveal(current.word);
        await speakPhoneme(current.letter);
        await new Promise((r) => setTimeout(r, 800));
        modeling.current = false;
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickPicture = useCallback(
    (choice: { letter: string; word: string }) => {
      if (phase !== 'play') return;
      if (choice.letter === current.letter) {
        recordSoundAttempt(current.letter, true);
        incrementStreak();
        masterPhoneme(current.letter);
        playSoundEffect('coin');
        setPhase('won');
        (async () => {
          await speakWord(choice.word);
          await speakPhoneme(current.letter);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          advance();
        })();
      } else {
        recordSoundAttempt(current.letter, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(choice.word);
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
      progressIcon="🦁"
      bgClassName="from-emerald-300/60 to-lime-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-emerald-900 font-[Fredoka] font-bold text-2xl text-center">
            Which picture starts with this sound?
          </p>
        </div>

        {/* Big hear-the-sound button */}
        <PressButton
          silent
          onClick={() => speakPhoneme(current.letter)}
          className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl flex items-center justify-center"
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

        {/* The picture choices */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto px-1">
          {current.choices.map((choice) => {
            const isAnswer = choice.letter === current.letter;
            const highlight = (phase !== 'play' || shouldReveal) && isAnswer;
            return (
              <motion.button
                key={`${round}-${choice.word}`}
                onClick={() => pickPicture(choice)}
                disabled={phase !== 'play'}
                animate={wrongPick === choice.word ? { x: [-8, 8, -8, 8, 0] } : highlight ? { scale: [1, 1.12, 1] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`rounded-3xl p-2 bg-white shadow-xl press-3d flex items-center justify-center transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse' : ''
                }`}
              >
                <WordCard word={choice.word} size={96} />
              </motion.button>
            );
          })}
        </div>

        {/* On win/model: show the letter so the sound connects to its symbol */}
        <div className="min-h-[130px] flex items-center justify-center">
          <AnimatePresence>
            {phase !== 'play' && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-[96px] h-[96px] rounded-3xl bg-white shadow-xl flex items-center justify-center text-6xl font-bold font-[Fredoka] text-gray-800 lowercase">
                  {current.letter}
                </div>
                <p className="text-2xl font-bold font-[Fredoka] text-emerald-800 lowercase mt-1">
                  {current.letter} — {current.word}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Sound safari star!" onComplete={onComplete} />
    </GameShell>
  );
}
