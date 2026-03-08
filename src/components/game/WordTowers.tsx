'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface WordFamily {
  pattern: string;
  words: { word: string; icon: string }[];
}

const FAMILIES: WordFamily[] = [
  { pattern: '-at', words: [
    { word: 'cat', icon: '🐱' }, { word: 'hat', icon: '🎩' },
    { word: 'bat', icon: '🦇' }, { word: 'mat', icon: '🧹' },
    { word: 'rat', icon: '🐀' }, { word: 'sat', icon: '🪑' },
  ]},
  { pattern: '-an', words: [
    { word: 'can', icon: '🥫' }, { word: 'man', icon: '👨' },
    { word: 'van', icon: '🚐' }, { word: 'fan', icon: '🌬️' },
    { word: 'ran', icon: '🏃' }, { word: 'pan', icon: '🍳' },
  ]},
  { pattern: '-in', words: [
    { word: 'bin', icon: '🗑️' }, { word: 'fin', icon: '🦈' },
    { word: 'win', icon: '🏆' }, { word: 'pin', icon: '📌' },
    { word: 'tin', icon: '🥫' }, { word: 'din', icon: '🔔' },
  ]},
  { pattern: '-og', words: [
    { word: 'dog', icon: '🐶' }, { word: 'log', icon: '🪵' },
    { word: 'fog', icon: '🌫️' }, { word: 'hog', icon: '🐷' },
    { word: 'jog', icon: '🏃' }, { word: 'cog', icon: '⚙️' },
  ]},
  { pattern: '-ug', words: [
    { word: 'bug', icon: '🐛' }, { word: 'rug', icon: '🪨' },
    { word: 'mug', icon: '☕' }, { word: 'hug', icon: '🤗' },
    { word: 'dug', icon: '⛏️' }, { word: 'jug', icon: '🍶' },
  ]},
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function WordTowers({ worldId, onComplete }: Props) {
  const [familyIdx, setFamilyIdx] = useState(0);
  const [placedCount, setPlacedCount] = useState(0);
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [families] = useState(() => shuffle(FAMILIES).slice(0, 3));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const family = families[familyIdx];
  const currentWord = family.words[currentWordIdx];
  const wordsPerFamily = 4;

  const roundKey = `${familyIdx}-${currentWordIdx}`;

  const distractors = useMemo(() =>
    FAMILIES
      .filter((f) => f.pattern !== family.pattern)
      .flatMap((f) => f.words)
      .slice(0, 2),
    [family.pattern]
  );

  const choices = useMemo(
    () => shuffle([currentWord, ...distractors]),
    [currentWord, distractors]
  );

  const optionNames = useMemo(() => choices.map(c => c.word), [choices]);

  const instruction = feedback
    ? null
    : `Find words in the ${family.pattern} family! Which word belongs?`;

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    instruction,
    optionNames,
    [familyIdx, currentWordIdx],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(roundKey);

  useEffect(() => {
    if (shouldReveal) {
      speakReveal(currentWord.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        const nextPlaced = placedCount + 1;
        setPlacedCount(nextPlaced);
        if (nextPlaced >= wordsPerFamily) {
          if (familyIdx >= families.length - 1) {
            completeGame(worldId, 'word-towers');
            addCoins(10);
            setShowCelebration(true);
            speakFeedback('complete');
          } else {
            setFamilyIdx(f => f + 1);
            setPlacedCount(0);
            setCurrentWordIdx(0);
          }
        } else {
          setCurrentWordIdx(nextPlaced);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, currentWord.word, placedCount, familyIdx, families.length, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (chosen: string) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      if (chosen === currentWord.word) {
        const isLastRound = placedCount + 1 >= wordsPerFamily && familyIdx >= families.length - 1;
        setFeedback('correct');
        speakFeedback(isLastRound ? 'complete' : 'correct');
        masterWord(chosen);
        setTimeout(() => {
          setFeedback(null);
          const nextPlaced = placedCount + 1;
          setPlacedCount(nextPlaced);

          if (nextPlaced >= wordsPerFamily) {
            if (familyIdx >= families.length - 1) {
              completeGame(worldId, 'word-towers');
              addCoins(10);
              setShowCelebration(true);
            } else {
              setFamilyIdx((f) => f + 1);
              setPlacedCount(0);
              setCurrentWordIdx(0);
            }
          } else {
            setCurrentWordIdx(nextPlaced);
          }
        }, 1000);
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(chosen, currentWord.word);
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, currentWord, placedCount, familyIdx, families, worldId, completeGame, addCoins, masterWord, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500/90 to-teal-400/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">
          {'<'}
        </motion.button>
        <span className="text-white font-[Fredoka] text-lg">
          Family: {family.pattern}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <div className="flex flex-col-reverse gap-1 items-center">
          {Array.from({ length: wordsPerFamily }).map((_, i) => (
            <motion.div
              key={i}
              initial={i < placedCount ? { scale: 1 } : { scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-40 h-12 rounded-lg flex items-center justify-center font-bold font-[Fredoka] lowercase text-lg shadow ${
                i < placedCount
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-white/20 border-2 border-dashed border-white/40'
              }`}
            >
              {i < placedCount ? (
                <>
                  <span className="mr-2">{family.words[i].icon}</span>
                  {family.words[i].word}
                </>
              ) : i === placedCount ? '?' : ''}
            </motion.div>
          ))}
        </div>

        <p className="text-white font-[Nunito] text-sm">
          Which word belongs in the {family.pattern} family?
        </p>

        <div className="flex gap-4">
          {choices.map((choice, idx) => (
            <motion.button
              key={choice.word}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleChoice(choice.word)}
              disabled={!doneSpeaking || feedback !== null || shouldReveal}
              className={`w-28 h-20 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
                shouldReveal && choice.word === currentWord.word
                  ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                  : feedback === 'correct' && choice.word === currentWord.word
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : activeOption === idx
                  ? 'bg-white/90 ring-4 ring-blue-400 scale-105'
                  : 'bg-white/90'
              }`}
            >
              <span className="text-3xl">{choice.icon}</span>
              <span className="text-sm font-bold font-[Fredoka] lowercase text-gray-700">{choice.word}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">
              That word ends in a different sound!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Tower complete!" onComplete={onComplete} />
    </div>
  );
}
