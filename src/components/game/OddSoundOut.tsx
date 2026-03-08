'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import ReplayButton from '@/components/ui/ReplayButton';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal, PHONEME_PRONUNCIATIONS } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface OddOneOutRound {
  words: { word: string; icon: string }[];
  oddIndex: number;
  commonSound: string;
}

// Odd item stored separately; position randomized at runtime
interface RoundData {
  common: { word: string; icon: string }[];
  odd: { word: string; icon: string };
  commonSound: string;
}

const ROUND_DATA: RoundData[] = [
  { common: [{ word: 'cat', icon: '🐱' }, { word: 'cap', icon: '🧢' }], odd: { word: 'dog', icon: '🐶' }, commonSound: 'c' },
  { common: [{ word: 'sun', icon: '☀️' }, { word: 'soap', icon: '🧼' }], odd: { word: 'hat', icon: '🎩' }, commonSound: 's' },
  { common: [{ word: 'pen', icon: '🖊️' }, { word: 'pot', icon: '🍲' }], odd: { word: 'net', icon: '🥅' }, commonSound: 'p' },
  { common: [{ word: 'bat', icon: '🦇' }, { word: 'bin', icon: '🗑️' }], odd: { word: 'cup', icon: '🥤' }, commonSound: 'b' },
  { common: [{ word: 'man', icon: '👨' }, { word: 'mug', icon: '☕' }], odd: { word: 'fan', icon: '🌬️' }, commonSound: 'm' },
  { common: [{ word: 'red', icon: '🔴' }, { word: 'rat', icon: '🐀' }], odd: { word: 'log', icon: '🪵' }, commonSound: 'r' },
  { common: [{ word: 'hen', icon: '🐔' }, { word: 'hot', icon: '🔥' }], odd: { word: 'van', icon: '🚐' }, commonSound: 'h' },
  { common: [{ word: 'fox', icon: '🦊' }, { word: 'fin', icon: '🦈' }], odd: { word: 'dog', icon: '🐶' }, commonSound: 'f' },
];

function buildRound(data: RoundData): OddOneOutRound {
  const oddIndex = Math.floor(Math.random() * 3);
  const words = [...data.common];
  words.splice(oddIndex, 0, data.odd);
  return { words, oddIndex, commonSound: data.commonSound };
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function OddSoundOut({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(ROUND_DATA).slice(0, 6).map(buildRound));
  const { completeGame, addCoins, incrementStreak, resetStreak } = useGameStore();

  const current = rounds[round];
  const oddWord = current.words[current.oddIndex];

  const { activeOption, doneSpeaking, replay } = useGameSpeechWithOptions(
    `Two of these start with ${PHONEME_PRONUNCIATIONS[current.commonSound] || current.commonSound}. Which one doesn't? Find the odd one out!`,
    current.words.map(w => w.word),
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      let cancelled = false;
      (async () => {
        await speakReveal(oddWord.word);
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;
        setFeedback(null);
        if (round >= rounds.length - 1) {
          completeGame(worldId, 'odd-one-out');
          addCoins(8);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [shouldReveal, oddWord, round, rounds, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (index: number) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      const isLast = round >= rounds.length - 1;
      if (index === current.oddIndex) {
        setFeedback('correct');
        incrementStreak();
        (async () => {
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise(r => setTimeout(r, 400));
          setFeedback(null);
          if (isLast) {
            completeGame(worldId, 'odd-one-out');
            addCoins(8);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        })();
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(current.words[index].word, oddWord.word, 'starts-with');
        resetStreak();
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, current, oddWord, round, rounds, worldId, completeGame, addCoins, incrementStreak, resetStreak, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-500/75 to-orange-400/75 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">

        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">
          {'<'}
        </motion.button>

          <ReplayButton onReplay={replay} />

        </div>
        <div className="flex gap-1">
          {rounds.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'waving'} size={80} />
        <p className="text-white font-[Nunito] text-center text-lg">
          Which one doesn&apos;t start the same?
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="flex gap-4"
          >
            {current.words.map((item, i) => {
              const isOdd = i === current.oddIndex;
              const isBeingSpoken = activeOption === i;
              const revealThis = shouldReveal && isOdd;

              return (
                <motion.button
                  key={item.word}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleChoice(i)}
                  disabled={feedback !== null || !doneSpeaking || shouldReveal}
                  className={`w-28 h-28 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
                    feedback === 'correct' && isOdd
                      ? 'bg-green-200 ring-4 ring-green-400'
                      : revealThis
                      ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                      : isBeingSpoken
                      ? 'bg-white ring-4 ring-blue-400 scale-105'
                      : 'bg-white/90'
                  }`}
                >
                  <span className="text-5xl">{item.icon}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {feedback === 'correct' && (
            <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ opacity: 0 }}
              className="text-xl text-yellow-300 font-bold">
              {current.words[current.oddIndex].word} starts with a different sound!
            </motion.p>
          )}
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">
              That one starts with &quot;{current.commonSound}&quot; too!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Great listening!" onComplete={onComplete} />
    </div>
  );
}
