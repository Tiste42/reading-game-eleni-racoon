'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

// Only SATPIN + e, l letters AND words a 3-4 year old knows and can picture.
const WORDS = ['ant', 'pen', 'lip', 'net', 'pin', 'nap'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'read' | 'sailing' | 'won';

export default function SailboatRace({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [choices, setChoices] = useState<string[]>([]);
  const [sailTo, setSailTo] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(WORDS).slice(0, 5));
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const word = words[round];
  const letters = word.split('');
  const isLast = round >= words.length - 1;

  useEffect(() => {
    setPhase('read');
    setSailTo(null);
    setWrongPick(null);
    const others = shuffle(WORDS.filter((w) => w !== words[round])).slice(0, 2);
    setChoices(shuffle([words[round], ...others]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Read the word! Sail to the right island!' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  // She can sound the word out herself: tap any sail letter to hear its sound
  const soundOut = useCallback(async () => {
    for (let i = 0; i < letters.length; i++) {
      await speakPhoneme(letters[i]);
      if (i < letters.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, [letters]);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'sailboat-race');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two wrong islands → Leni models the answer and the boat sails there
  useEffect(() => {
    if (shouldReveal && phase === 'read') {
      (async () => {
        recordSoundAttempt(word, false);
        await speakReveal(word);
        setSailTo(choices.indexOf(word));
        setPhase('sailing');
        await new Promise((r) => setTimeout(r, 1400));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickIsland = useCallback(
    (w: string, index: number) => {
      if (phase !== 'read') return;
      if (w === word) {
        recordSoundAttempt(word, true);
        incrementStreak();
        masterWord(word);
        playSoundEffect('coin');
        setSailTo(index);
        setPhase('sailing');
        (async () => {
          await speakWord(word);
          setPhase('won');
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt(word, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        (async () => {
          await soundOut();
          setWrongPick(null);
        })();
      }
    },
    [phase, word, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  // Boat slides toward the chosen island (3 islands → x offsets)
  const boatX = sailTo === null ? 0 : (sailTo - 1) * 130;

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={words.length}
      progressIcon="⛵"
      bgClassName="from-sky-400/70 via-cyan-300/40 to-blue-200/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter costume="sailor" pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} animate={false} />
          <p className="text-cyan-900 font-[Fredoka] font-bold text-2xl text-center">
            {phase === 'won' ? 'You found the island!' : 'Read the word — sail to its island!'}
          </p>
        </div>

        {/* The boat with the word on its sail (letters tappable to sound out) */}
        <motion.div
          className="flex flex-col items-center"
          animate={{ x: boatX, y: phase !== 'read' ? 40 : 0, scale: phase !== 'read' ? 0.9 : 1 }}
          transition={{ type: 'spring', stiffness: 60, damping: 14 }}
        >
          <motion.div
            animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center"
          >
            {/* sail with big tappable letters */}
            <div className="bg-white rounded-2xl px-4 py-3 shadow-xl flex gap-2 border-b-8 border-amber-700">
              {letters.map((letter, i) => (
                <motion.button
                  key={i}
                  onClick={() => speakPhoneme(letter)}
                  whileTap={{ scale: 0.88 }}
                  className="w-[72px] h-[80px] rounded-2xl bg-yellow-300 text-gray-800 text-6xl font-bold font-[Fredoka] lowercase shadow-md press-3d flex items-center justify-center"
                >
                  {letter}
                </motion.button>
              ))}
            </div>
            <span className="text-6xl -mt-2">⛵</span>
          </motion.div>
          <p className="text-cyan-900/80 font-[Fredoka] text-sm mt-1">Tap a letter to hear its sound</p>
        </motion.div>

        {/* The islands */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md mx-auto px-1">
          {choices.map((w, index) => {
            const isAnswer = w === word;
            const highlight = (phase !== 'read' || shouldReveal) && isAnswer;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pickIsland(w, index)}
                disabled={phase !== 'read'}
                initial={{ y: 40, opacity: 0 }}
                animate={
                  wrongPick === w
                    ? { x: [-8, 8, -8, 8, 0], y: 0, opacity: 1 }
                    : highlight
                      ? { y: [0, -10, 0], opacity: 1 }
                      : { y: 0, opacity: 1 }
                }
                transition={highlight ? { y: { duration: 0.5, repeat: 2 } } : { delay: index * 0.1 }}
                className={`flex flex-col items-center rounded-3xl p-2 transition-all ${
                  highlight ? 'bg-green-200/80 ring-4 ring-green-400' : ''
                }`}
              >
                <span className="bg-white rounded-3xl p-1.5 shadow-xl press-3d">
                  <WordCard word={w} size={88} />
                </span>
                <span className="text-6xl -mt-3">🏝️</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Race won!" onComplete={onComplete} />
    </GameShell>
  );
}
