'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

interface PotionRound {
  word: string; // build lines recorded for these
  swapTo: string; // change first letter -> new word (word chaining!)
  swapDistractor: string;
}

const POTION_ROUNDS: PotionRound[] = [
  { word: 'cat', swapTo: 'hat', swapDistractor: 's' },
  { word: 'pin', swapTo: 'bin', swapDistractor: 'm' },
  { word: 'hot', swapTo: 'pot', swapDistractor: 'l' },
  { word: 'bat', swapTo: 'mat', swapDistractor: 'f' },
  { word: 'dog', swapTo: 'log', swapDistractor: 'n' },
  { word: 'cup', swapTo: 'pup', swapDistractor: 't' },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'build' | 'swap' | 'won';

export default function PotionLab({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('build');
  const [placed, setPlaced] = useState(0);
  const [wrongTile, setWrongTile] = useState<string | null>(null);
  const [bank, setBank] = useState<string[]>([]);
  const [swapChoices, setSwapChoices] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(POTION_ROUNDS).slice(0, 5));
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const letters = current.word.split('');
  const newLetter = current.swapTo[0];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('build');
    setPlaced(0);
    setWrongTile(null);
    let s = shuffle(letters);
    if (s.join('') === current.word) s = [...s].reverse();
    setBank(s);
    setSwapChoices(shuffle([newLetter, current.swapDistractor]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Recorded line: "Put the letters c, a, t into the cauldron to make cat!"
  const instruction = `Put the letters ${letters.join(', ')} into the cauldron to make ${current.word}!`;
  const { replay } = useGameSpeech(phase === 'build' ? instruction : null, [round, phase]);

  const soundOut = useCallback(async (w: string) => {
    const ls = w.split('');
    for (let i = 0; i < ls.length; i++) {
      await speakPhoneme(ls[i]);
      if (i < ls.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, []);

  const finishRound = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'potion-lab');
      addCoins(12);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Build phase: tap letters in order (MarketBuilder pattern)
  const tapBankLetter = useCallback(
    (letter: string, idx: number) => {
      if (phase !== 'build') return;
      const needed = letters[placed];
      if (letter === needed) {
        playSoundEffect('tap');
        recordSoundAttempt(letter, true);
        const np = placed + 1;
        setPlaced(np);
        if (np === letters.length) {
          (async () => {
            await speakPhoneme(letter); // last sound plays fully...
            await new Promise((r) => setTimeout(r, 150));
            playSoundEffect('celebrate'); // potion bubbles!
            masterWord(current.word);
            await speakWord(current.word); // ...then Leni says the word
            setPhase('swap');
          })();
        } else {
          speakPhoneme(letter);
        }
      } else {
        playSoundEffect('wrong');
        speakPhoneme(needed);
        recordSoundAttempt(needed, false);
        setWrongTile(`bank-${idx}`);
        setTimeout(() => setWrongTile(null), 500);
      }
    },
    [phase, letters, placed, current.word, masterWord, recordSoundAttempt],
  );

  // Swap phase: first letter popped out — pick the new letter to make a NEW word
  const tapSwapLetter = useCallback(
    (letter: string) => {
      if (phase !== 'swap') return;
      if (letter === newLetter) {
        playSoundEffect('coin');
        recordSoundAttempt(letter, true);
        masterWord(current.swapTo);
        setPhase('won');
        (async () => {
          await soundOut(current.swapTo);
          await speakWord(current.swapTo);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          finishRound();
        })();
      } else {
        playSoundEffect('wrong');
        recordSoundAttempt(newLetter, false);
        setWrongTile(`swap-${letter}`);
        (async () => {
          await speakPhoneme(newLetter); // hint: the sound we need
          setWrongTile(null);
        })();
      }
    },
    [phase, newLetter, current.swapTo, isLast, finishRound, masterWord, recordSoundAttempt, soundOut],
  );

  const isUsed = (letter: string) => letters.slice(0, placed).includes(letter);
  const displayWord = phase === 'won' ? current.swapTo : current.word;

  return (
    <GameShell
      onBack={onComplete}
      onReplay={phase === 'build' ? replay : undefined}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🧪"
      bgClassName="from-violet-400/60 to-emerald-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={114} />
          <p className="text-violet-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'build'
              ? `Make the word ${current.word}!`
              : phase === 'swap'
                ? 'Magic! Swap the first letter — what new word can we make?'
                : `${current.swapTo}! A brand new word!`}
          </p>
        </div>

        {/* Cauldron with letter slots */}
        <div className="flex flex-col items-center">
          <div className="flex gap-3 mb-1">
            {letters.map((letter, i) => {
              const filled = i < placed;
              const isNext = i === placed && phase === 'build';
              const isSwapSlot = i === 0 && phase === 'swap';
              const shown = phase === 'won' && i === 0 ? newLetter : letter;
              return (
                <div
                  key={i}
                  className={`w-[84px] h-[92px] rounded-2xl flex items-center justify-center text-6xl font-bold font-[Fredoka] lowercase shadow-inner transition-colors ${
                    isSwapSlot
                      ? 'bg-violet-200 border-4 border-dashed border-violet-500 animate-hint-pulse'
                      : filled || phase !== 'build'
                        ? 'bg-emerald-200 text-gray-800'
                        : isNext
                          ? 'bg-white/60 border-4 border-dashed border-white'
                          : 'bg-white/30 border-4 border-dashed border-white/50'
                  }`}
                >
                  {(filled || phase === 'won' || (phase === 'swap' && i > 0)) && !isSwapSlot && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{shown}</motion.span>
                  )}
                  {isSwapSlot && <span className="text-4xl">✨</span>}
                </div>
              );
            })}
          </div>
          <motion.span
            animate={phase !== 'build' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.8, repeat: phase !== 'build' ? Infinity : 0 }}
            className="text-8xl"
          >
            🧪
          </motion.span>
          <AnimatePresence>
            {phase === 'won' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-2 shadow-xl -mt-2">
                <WordCard word={current.swapTo} size={110} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Letter bank (build) or swap choices */}
        <div className="flex gap-4 min-h-[110px] items-center">
          {phase === 'build' &&
            bank.map((letter, idx) => {
              const used = isUsed(letter);
              const isNeeded = letter === letters[placed];
              return (
                <motion.button
                  key={idx}
                  onClick={() => tapBankLetter(letter, idx)}
                  disabled={used}
                  animate={
                    wrongTile === `bank-${idx}`
                      ? { x: [-8, 8, -8, 8, 0] }
                      : used
                        ? { scale: 0, opacity: 0 }
                        : { scale: 1, opacity: 1 }
                  }
                  whileTap={{ scale: 0.9 }}
                  className={`w-[100px] h-[108px] rounded-3xl bg-white shadow-xl flex items-center justify-center text-7xl font-bold font-[Fredoka] text-gray-800 lowercase press-3d ${
                    isNeeded ? 'ring-4 ring-yellow-300 animate-hint-pulse' : ''
                  }`}
                >
                  {letter}
                </motion.button>
              );
            })}
          {phase === 'swap' &&
            swapChoices.map((letter) => (
              <motion.button
                key={letter}
                onClick={() => tapSwapLetter(letter)}
                animate={wrongTile === `swap-${letter}` ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.9 }}
                className="w-[100px] h-[108px] rounded-3xl bg-violet-100 shadow-xl flex items-center justify-center text-7xl font-bold font-[Fredoka] text-violet-800 lowercase press-3d ring-2 ring-violet-300"
              >
                {letter}
              </motion.button>
            ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Master potion maker!" onComplete={onComplete} />
    </GameShell>
  );
}
