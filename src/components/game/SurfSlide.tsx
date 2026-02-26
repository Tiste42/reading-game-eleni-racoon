'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface BlendWord {
  letters: string[];
  word: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const BLEND_WORDS: BlendWord[] = [
  { letters: ['s', 'a', 't'], word: 'sat', icon: '🪑', distractors: [{ word: 'pin', icon: '📌' }, { word: 'net', icon: '🥅' }] },
  { letters: ['p', 'i', 'n'], word: 'pin', icon: '📌', distractors: [{ word: 'sat', icon: '🪑' }, { word: 'tap', icon: '🚰' }] },
  { letters: ['t', 'a', 'p'], word: 'tap', icon: '🚰', distractors: [{ word: 'sit', icon: '🪑' }, { word: 'nap', icon: '💤' }] },
  { letters: ['s', 'i', 't'], word: 'sit', icon: '🪑', distractors: [{ word: 'pan', icon: '🍳' }, { word: 'tip', icon: '📌' }] },
  { letters: ['n', 'a', 'p'], word: 'nap', icon: '💤', distractors: [{ word: 'tip', icon: '📌' }, { word: 'sat', icon: '🪑' }] },
  { letters: ['n', 'e', 't'], word: 'net', icon: '🥅', distractors: [{ word: 'pan', icon: '🍳' }, { word: 'lip', icon: '👄' }] },
  { letters: ['p', 'e', 't'], word: 'pet', icon: '🐶', distractors: [{ word: 'let', icon: '✅' }, { word: 'tin', icon: '🥫' }] },
  { letters: ['l', 'e', 't'], word: 'let', icon: '✅', distractors: [{ word: 'pen', icon: '🖊️' }, { word: 'nip', icon: '❄️' }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SurfSlide({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [activeLetterIdx, setActiveLetterIdx] = useState(-1);
  const [blended, setBlended] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(BLEND_WORDS).slice(0, 6));
  const { completeGame, addCoins, incrementStreak, resetStreak, masterWord } = useGameStore();
  const touchAreaRef = useRef<HTMLDivElement>(null);

  const current = words[round];

  const [choices, setChoices] = useState<{ word: string; icon: string }[]>([]);
  useEffect(() => {
    if (blended) {
      setChoices(shuffle([
        { word: current.word, icon: current.icon },
        ...current.distractors,
      ]));
    }
  }, [blended, current]);

  const optionNames = useMemo(() => choices.map(c => c.word), [choices]);

  const instruction = feedback || !blended
    ? null
    : `Blend the sounds together! What word do the letters make? Is it ${optionNames.join(', or ')}?`;

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    instruction,
    optionNames,
    [round, blended],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal && blended) {
      speakReveal(current.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        setBlended(false);
        setActiveLetterIdx(-1);
        if (round >= words.length - 1) {
          completeGame(worldId, 'surf-slide');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, blended, current.word, round, words.length, worldId, completeGame, addCoins]);

  const handleBlendStart = useCallback(() => {
    if (blended) return;
    setActiveLetterIdx(0);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx >= current.letters.length) {
        clearInterval(interval);
        setBlended(true);
      } else {
        setActiveLetterIdx(idx);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [blended, current]);

  const handleChoice = useCallback(
    (chosen: string) => {
      if (feedback || !blended || !doneSpeaking || shouldReveal) return;
      if (chosen === current.word) {
        const isLastRound = round >= words.length - 1;
        setFeedback('correct');
        speakFeedback(isLastRound ? 'complete' : 'correct');
        incrementStreak();
        masterWord(current.word);
        setTimeout(() => {
          setFeedback(null);
          setBlended(false);
          setActiveLetterIdx(-1);
          if (isLastRound) {
            completeGame(worldId, 'surf-slide');
            addCoins(10);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        }, 1200);
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(chosen, current.word, 'blend');
        resetStreak();
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, blended, doneSpeaking, shouldReveal, current, round, words, worldId, completeGame, addCoins, incrementStreak, resetStreak, masterWord, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-400/90 to-orange-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md"
        >
          {'<'}
        </motion.button>
        <div className="flex gap-1">
          {words.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < round ? 'bg-white' : i === round ? 'bg-yellow-200' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter
          pose={blended ? 'celebrating' : 'excited'}
          size={70}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="relative"
          >
            <div
              ref={touchAreaRef}
              className="flex gap-3 bg-blue-400/40 rounded-3xl px-8 py-6 shadow-inner"
            >
              {current.letters.map((letter, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i === activeLetterIdx ? 1.3 : 1,
                    backgroundColor:
                      i <= activeLetterIdx
                        ? '#FCD34D'
                        : 'rgba(255,255,255,0.9)',
                  }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold font-[Fredoka] text-gray-800 shadow-lg lowercase"
                >
                  {letter}
                </motion.div>
              ))}
            </div>

            {activeLetterIdx >= 0 && (
              <motion.div
                className="absolute -bottom-2 h-2 bg-yellow-300 rounded-full"
                initial={{ width: '0%', left: '10%' }}
                animate={{
                  width: `${((activeLetterIdx + 1) / current.letters.length) * 80}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {!blended ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBlendStart}
            className="game-button bg-blue-500 text-white px-10 py-5 rounded-full shadow-xl text-xl"
          >
            <span className="text-3xl">🏄</span>
            <span className="font-[Fredoka]">Blend!</span>
          </motion.button>
        ) : (
          <div className="flex gap-4">
            {choices.map((choice, idx) => (
              <motion.button
                key={choice.word}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleChoice(choice.word)}
                disabled={!doneSpeaking || feedback !== null || shouldReveal}
                className={`w-24 h-24 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
                  shouldReveal && choice.word === current.word
                    ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                    : feedback === 'correct' && choice.word === current.word
                    ? 'bg-green-200 ring-4 ring-green-400'
                    : activeOption === idx
                    ? 'bg-white/90 ring-4 ring-blue-400 scale-105'
                    : 'bg-white/90'
                }`}
              >
                <span className="text-4xl">{choice.icon}</span>
                <span className="text-xs text-gray-500 font-[Nunito] lowercase">
                  {choice.word}
                </span>
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, x: [-4, 4, -4, 0] }}
              exit={{ opacity: 0 }}
              className="text-xl text-white font-bold"
            >
              Try again!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay
        show={showCelebration}
        message="Amazing blending!"
        onComplete={onComplete}
      />
    </div>
  );
}
