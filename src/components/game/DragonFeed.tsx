'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface CVCWord {
  word: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const CVC_WORDS: CVCWord[] = [
  { word: 'cat', icon: getIcon('cat'), distractors: [{ word: 'hat', icon: getIcon('hat') }, { word: 'bat', icon: getIcon('bat') }] },
  { word: 'dog', icon: getIcon('dog'), distractors: [{ word: 'log', icon: getIcon('log') }, { word: 'fog', icon: getIcon('fog') }] },
  { word: 'bug', icon: getIcon('bug'), distractors: [{ word: 'rug', icon: getIcon('rug') }, { word: 'mug', icon: getIcon('mug') }] },
  { word: 'hen', icon: getIcon('hen'), distractors: [{ word: 'pen', icon: getIcon('pen') }, { word: 'ten', icon: getIcon('ten') }] },
  { word: 'cup', icon: getIcon('cup'), distractors: [{ word: 'pup', icon: getIcon('pup') }, { word: 'cut', icon: getIcon('cut') }] },
  { word: 'pot', icon: getIcon('pot'), distractors: [{ word: 'hot', icon: getIcon('hot') }, { word: 'dot', icon: getIcon('dot') }] },
  { word: 'bed', icon: getIcon('bed'), distractors: [{ word: 'red', icon: getIcon('red') }, { word: 'fed', icon: getIcon('fed') }] },
  { word: 'van', icon: getIcon('van'), distractors: [{ word: 'man', icon: getIcon('man') }, { word: 'fan', icon: getIcon('fan') }] },
  { word: 'fin', icon: getIcon('fin'), distractors: [{ word: 'bin', icon: getIcon('bin') }, { word: 'win', icon: getIcon('win') }] },
  { word: 'jet', icon: getIcon('jet'), distractors: [{ word: 'net', icon: getIcon('net') }, { word: 'wet', icon: getIcon('wet') }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function DragonFeed({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [dragonMood, setDragonMood] = useState<'hungry' | 'happy' | 'funny'>('hungry');
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(CVC_WORDS).slice(0, 8));
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak } = useGameStore();

  const current = words[round];

  const choices = useMemo(
    () => shuffle([{ word: current.word, icon: current.icon }, ...current.distractors]),
    [current]
  );

  // Don't say the word — child must READ it and match to picture
  useGameSpeech(
    feedback ? null : 'Read the word! Feed the dragon the right picture!',
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(current.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        setDragonMood('hungry');
        if (round >= words.length - 1) {
          completeGame(worldId, 'dragon-feed');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, current.word, round, words.length, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (chosen: string) => {
      if (feedback || shouldReveal) return;
      if (chosen === current.word) {
        const isLastRound = round >= words.length - 1;
        setFeedback('correct');
        speakFeedback(isLastRound ? 'complete' : 'correct');
        setDragonMood('happy');
        incrementStreak();
        masterWord(current.word);
        setTimeout(() => {
          setFeedback(null);
          setDragonMood('hungry');
          if (isLastRound) {
            completeGame(worldId, 'dragon-feed');
            addCoins(10);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        }, 1200);
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(chosen, current.word);
        setDragonMood('funny');
        resetStreak();
        setTimeout(() => {
          setFeedback(null);
          setDragonMood('hungry');
        }, 2000);
      }
    },
    [feedback, shouldReveal, current, round, words, worldId, completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500/90 to-teal-400/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {words.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <motion.div
          animate={
            dragonMood === 'happy'
              ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }
              : dragonMood === 'funny'
              ? { x: [-5, 5, -5, 5, 0] }
              : {}
          }
          className="text-8xl"
        >
          {dragonMood === 'happy' ? '🐉' : dragonMood === 'funny' ? '🤪' : '🐲'}
        </motion.div>

        <p className="text-white font-[Nunito] text-sm text-center">
          {dragonMood === 'hungry'
            ? 'Read the word and feed the dragon!'
            : dragonMood === 'happy'
            ? 'Yum!'
            : 'Not that one!'}
        </p>

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="bg-white/90 rounded-2xl px-10 py-5 shadow-xl">
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.word}</span>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4">
          {choices.map((choice) => (
            <motion.button key={choice.word} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              whileTap={{ scale: 0.9 }} onClick={() => handleChoice(choice.word)}
              disabled={feedback !== null || shouldReveal}
              className={`w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
                shouldReveal && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : feedback === 'correct' && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : 'bg-white/90'
              }`}>
              <span className="text-4xl">{choice.icon}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Dragon is full!" onComplete={onComplete} />
    </div>
  );
}
