'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface StorySentence {
  text: string;
  picture: string;
  question: string;
  correct: string;
  options: string[];
}

const SENTENCES: StorySentence[] = [
  {
    text: 'Sam sat on a mat.',
    picture: '\uD83E\uDDD1\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1',
    question: 'What did Sam sit on?',
    correct: 'a mat',
    options: ['a mat', 'a cat', 'a hat'],
  },
  {
    text: 'The cat is big.',
    picture: '\uD83D\uDC31',
    question: 'Is the cat big or small?',
    correct: 'big',
    options: ['big', 'small', 'red'],
  },
  {
    text: 'A bug is on the log.',
    picture: '\uD83D\uDC1B',
    question: 'Where is the bug?',
    correct: 'on the log',
    options: ['on the log', 'in the cup', 'on the hat'],
  },
  {
    text: 'He got a red hat.',
    picture: '\uD83E\uDDE2',
    question: 'What color is the hat?',
    correct: 'red',
    options: ['red', 'blue', 'green'],
  },
  {
    text: 'The fish is in the net.',
    picture: '\uD83D\uDC1F',
    question: 'Where is the fish?',
    correct: 'in the net',
    options: ['in the net', 'on the bed', 'in the cup'],
  },
  {
    text: 'She can see the ship.',
    picture: '\uD83D\uDEA2',
    question: 'What can she see?',
    correct: 'the ship',
    options: ['the ship', 'the cat', 'the dog'],
  },
  {
    text: 'I have a pet dog.',
    picture: '\uD83D\uDC36',
    question: 'What pet do I have?',
    correct: 'a dog',
    options: ['a dog', 'a cat', 'a fish'],
  },
  {
    text: 'The cup is hot.',
    picture: '\u2615',
    question: 'Is the cup hot or cold?',
    correct: 'hot',
    options: ['hot', 'cold', 'big'],
  },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function StoryStroll({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sentences] = useState(() => shuffle(SENTENCES).slice(0, 6));
  const { completeGame, addCoins } = useGameStore();

  const current = sentences[round];
  const stableOptions = useMemo(() => current.options, [current]);

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `${current.text} ${current.question}`,
    stableOptions,
    [round]
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (doneSpeaking && !showQuestion && !feedback) {
      setShowQuestion(true);
    }
  }, [doneSpeaking, showQuestion, feedback]);

  useEffect(() => {
    if (!shouldReveal) return;
    speakReveal(current.correct);
    const timer = setTimeout(() => {
      setShowQuestion(false);
      if (round >= sentences.length - 1) {
        completeGame(worldId, 'story-stroll');
        addCoins(12);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, sentences, worldId, completeGame, addCoins]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      if (answer === current.correct) {
        const isLastRound = round >= sentences.length - 1;
        setFeedback('correct');
        speakFeedback(isLastRound ? 'complete' : 'correct');
        setTimeout(() => {
          setFeedback(null);
          setShowQuestion(false);
          if (isLastRound) {
            completeGame(worldId, 'story-stroll');
            addCoins(12);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        }, 1200);
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(answer, current.correct);
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, current, round, sentences, worldId, completeGame, addCoins, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400/90 to-green-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md"
        >
          {'<'}
        </motion.button>
        <div className="flex gap-1">
          {sentences.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter
          pose={feedback === 'correct' ? 'celebrating' : 'excited'}
          size={80}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="bg-amber-50 border-4 border-amber-700 rounded-2xl px-6 py-8 shadow-2xl max-w-sm w-full"
          >
            <div className="text-center mb-4">
              <span className="text-6xl">{current.picture}</span>
            </div>
            <p className="text-2xl font-bold font-[Fredoka] text-gray-800 text-center leading-relaxed">
              {current.text}
            </p>
          </motion.div>
        </AnimatePresence>

        {showQuestion && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm"
          >
            <p className="text-white font-[Nunito] text-center mb-3 text-lg">
              {current.question}
            </p>
            <div className="flex flex-col gap-3">
              {stableOptions.map((opt, i) => (
                <motion.button
                  key={opt}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAnswer(opt)}
                  disabled={feedback !== null || !doneSpeaking || shouldReveal}
                  className={`w-full py-4 px-6 rounded-2xl text-lg font-bold font-[Fredoka] shadow-md transition-all ${
                    shouldReveal && opt === current.correct
                      ? 'bg-green-300 text-green-800 ring-4 ring-green-400 scale-105'
                      : feedback === 'correct' && opt === current.correct
                        ? 'bg-green-300 text-green-800'
                        : activeOption === i
                          ? 'bg-white/90 text-gray-700 ring-4 ring-blue-400 scale-105'
                          : 'bg-white/90 text-gray-700'
                  }`}
                >
                  {opt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [-4, 4, -4, 0] }}
              exit={{ opacity: 0 }}
              className="text-lg text-white font-bold"
            >
              Read again and try!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message="You can read stories!"
        onComplete={onComplete}
      />
    </div>
  );
}
