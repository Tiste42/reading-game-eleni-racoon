'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import ReplayButton from '@/components/ui/ReplayButton';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface RhymeGroup {
  target: { word: string; icon: string };
  match: { word: string; icon: string };
  distractors: Array<{ word: string; icon: string }>;
}

const RHYME_ROUNDS: RhymeGroup[] = [
  {
    target: { word: 'cat', icon: getIcon('cat') },
    match: { word: 'hat', icon: getIcon('hat') },
    distractors: [{ word: 'dog', icon: getIcon('dog') }, { word: 'sun', icon: getIcon('sun') }],
  },
  {
    target: { word: 'bug', icon: getIcon('bug') },
    match: { word: 'mug', icon: getIcon('mug') },
    distractors: [{ word: 'fish', icon: getIcon('fish') }, { word: 'pen', icon: getIcon('pen') }],
  },
  {
    target: { word: 'log', icon: getIcon('log') },
    match: { word: 'dog', icon: getIcon('dog') },
    distractors: [{ word: 'cat', icon: getIcon('cat') }, { word: 'bed', icon: getIcon('bed') }],
  },
  {
    target: { word: 'hen', icon: getIcon('hen') },
    match: { word: 'ten', icon: getIcon('ten') },
    distractors: [{ word: 'cup', icon: getIcon('cup') }, { word: 'map', icon: getIcon('map') }],
  },
  {
    target: { word: 'pin', icon: getIcon('pin') },
    match: { word: 'bin', icon: getIcon('bin') },
    distractors: [{ word: 'car', icon: getIcon('car') }, { word: 'egg', icon: getIcon('egg') }],
  },
];

interface Props {
  worldId: number;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function RhymeBeach({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [score, setScore] = useState(0);
  const { completeGame, addCoins, incrementStreak, resetStreak } = useGameStore();

  // Shuffle round order and choices within each round
  const [rounds] = useState(() => {
    const shuffled = shuffle(RHYME_ROUNDS);
    return shuffled.map(r => ({
      ...r,
      choices: shuffle([r.match, ...r.distractors]),
    }));
  });

  const currentRound = rounds[round];
  const isLastRound = round >= rounds.length - 1;
  const roundChoices = currentRound.choices;

  const { activeOption, doneSpeaking, replay } = useGameSpeechWithOptions(
    `What rhymes with ${currentRound.target.word}?`,
    roundChoices.map(c => c.word),
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      let cancelled = false;
      (async () => {
        await speakReveal(currentRound.match.word);
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'rhyme-match');
          addCoins(5);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [shouldReveal, currentRound, isLastRound, worldId, completeGame, addCoins]);

  const handleChoice = useCallback((chosen: { word: string; icon: string }) => {
    if (feedback || !doneSpeaking || shouldReveal) return;

    if (chosen.word === currentRound.match.word) {
      setFeedback('correct');
      (async () => {
        await speakFeedback(isLastRound ? 'complete' : 'correct');
        await new Promise(r => setTimeout(r, 400));
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'rhyme-match');
          addCoins(5);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(chosen.word, currentRound.match.word, 'rhyme');
      resetStreak();
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, currentRound, isLastRound, round, worldId, completeGame, addCoins, incrementStreak, resetStreak, recordWrong, score]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-300/75 via-cyan-200/75 to-amber-100/75 px-4 py-6 flex flex-col">
      {/* Back button */}
      <div className="flex items-center gap-2">

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onComplete}
        className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md self-start mb-4"
        aria-label="Back"
      >
        ◀
      </motion.button>

        <ReplayButton onReplay={replay} />

      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-4">
        {rounds.map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all ${
              i < round ? 'bg-green-400 scale-100' :
              i === round ? 'bg-white scale-125 ring-2 ring-pink-400' :
              'bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Eleni + target word */}
      <div className="text-center mb-6">
        <EleniCharacter
          pose={feedback === 'correct' ? 'celebrating' : feedback === 'wrong' ? 'standing' : 'excited'}
          size={100}
        />
        <motion.div
          key={round}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-2"
        >
          <p className="text-sm text-blue-600 font-[Nunito] mb-1">
            Find what rhymes with...
          </p>
          <div className="inline-flex items-center gap-3 bg-white/80 rounded-2xl px-6 py-3 shadow-lg">
            <span className="text-5xl">{currentRound.target.icon}</span>
            <span className="text-2xl font-bold font-[Fredoka] text-purple-600 lowercase">
              {currentRound.target.word}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Answer choices - BIG tap targets */}
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          key={round}
          className="grid grid-cols-3 gap-4 max-w-md w-full"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {roundChoices.map((choice, index) => {
            const isCorrectAnswer = choice.word === currentRound.match.word;
            const showCorrect = feedback === 'correct' && isCorrectAnswer;
            const isBeingSpoken = activeOption === index;
            const revealCorrect = shouldReveal && isCorrectAnswer;

            return (
              <motion.button
                key={choice.word}
                variants={{
                  hidden: { y: 30, opacity: 0 },
                  visible: { y: 0, opacity: 1 },
                }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleChoice(choice)}
                disabled={!doneSpeaking || feedback !== null || shouldReveal}
                className={`
                  tap-target flex-col rounded-3xl p-4 shadow-lg transition-all
                  min-h-[110px]
                  ${showCorrect ? 'bg-green-200 ring-4 ring-green-400 scale-110' :
                    revealCorrect ? 'bg-green-200 ring-4 ring-green-400 animate-pulse scale-110' :
                    isBeingSpoken ? 'bg-white ring-4 ring-blue-400 scale-105' :
                    feedback === 'wrong' && isCorrectAnswer ? 'bg-white/90' :
                    'bg-white/90 hover:bg-white active:bg-pink-50'}
                `}
              >
                <span className="text-5xl block mb-1">{choice.icon}</span>
                <span className="text-lg font-bold font-[Fredoka] text-gray-600 lowercase">
                  {choice.word}
                </span>
                {showCorrect && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-2xl mt-1"
                  >
                    ✅
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Feedback messages via Eleni (visual, not text-dependent) */}
      <AnimatePresence>
        {feedback === 'correct' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="text-center py-4"
          >
            <span className="text-4xl">🎉</span>
          </motion.div>
        )}
        {feedback === 'wrong' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1, x: [-5, 5, -5, 5, 0] }}
            exit={{ y: 50, opacity: 0 }}
            className="text-center py-4"
          >
            <span className="text-4xl">🤔</span>
            <p className="text-sm text-gray-500 mt-1">Try again!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <CelebrationOverlay
        show={showCelebration}
        message="Great job!"
        onComplete={onComplete}
      />
    </div>
  );
}
