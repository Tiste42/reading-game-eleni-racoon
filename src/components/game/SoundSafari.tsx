'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakPhoneme, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface SafariRound {
  letter: string;
  correct: { word: string; icon: string };
  distractors: { word: string; icon: string }[];
}

const ROUNDS: SafariRound[] = [
  { letter: 's', correct: { word: 'snake', icon: getIcon('snake') }, distractors: [{ word: 'cat', icon: getIcon('cat') }, { word: 'dog', icon: getIcon('dog') }] },
  { letter: 'a', correct: { word: 'apple', icon: getIcon('apple') }, distractors: [{ word: 'pen', icon: getIcon('pen') }, { word: 'hat', icon: getIcon('hat') }] },
  { letter: 't', correct: { word: 'tiger', icon: getIcon('tiger') }, distractors: [{ word: 'fish', icon: getIcon('fish') }, { word: 'moon', icon: getIcon('moon') }] },
  { letter: 'p', correct: { word: 'penguin', icon: getIcon('penguin') }, distractors: [{ word: 'sun', icon: getIcon('sun') }, { word: 'bed', icon: getIcon('bed') }] },
  { letter: 'i', correct: { word: 'igloo', icon: getIcon('igloo') }, distractors: [{ word: 'bus', icon: getIcon('bus') }, { word: 'rat', icon: getIcon('rat') }] },
  { letter: 'n', correct: { word: 'nut', icon: getIcon('nut') }, distractors: [{ word: 'cup', icon: getIcon('cup') }, { word: 'pig', icon: getIcon('pig') }] },
  { letter: 'e', correct: { word: 'egg', icon: getIcon('egg') }, distractors: [{ word: 'van', icon: getIcon('van') }, { word: 'log', icon: getIcon('log') }] },
  { letter: 'l', correct: { word: 'lemon', icon: getIcon('lemon') }, distractors: [{ word: 'bat', icon: getIcon('bat') }, { word: 'hen', icon: getIcon('hen') }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoundSafari({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(ROUNDS).slice(0, 6));
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak } = useGameStore();

  const current = rounds[round];

  const [choicesByRound] = useState(() =>
    rounds.map(r => shuffle([r.correct, ...r.distractors]))
  );
  const choices = choicesByRound[round];

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    `Find the picture that starts with ${current.letter}!`,
    choices.map(c => c.word),
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal) {
      let cancelled = false;
      (async () => {
        await speakReveal(current.correct.word);
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;
        setFeedback(null);
        if (round >= rounds.length - 1) {
          completeGame(worldId, 'sound-safari');
          addCoins(8);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      })();
      return () => { cancelled = true; };
    }
  }, [shouldReveal, current, round, rounds, worldId, completeGame, addCoins]);

  const handleChoice = useCallback(
    (word: string) => {
      if (feedback || !doneSpeaking || shouldReveal) return;
      const isLast = round >= rounds.length - 1;
      if (word === current.correct.word) {
        setFeedback('correct');
        incrementStreak();
        masterPhoneme(current.letter);
        (async () => {
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise(r => setTimeout(r, 400));
          setFeedback(null);
          if (isLast) {
            completeGame(worldId, 'sound-safari');
            addCoins(8);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        })();
      } else {
        setFeedback('wrong');
        recordWrong();
        speakWrongExplanation(word, current.correct.word, 'starts-with');
        resetStreak();
        setTimeout(() => setFeedback(null), 2000);
      }
    },
    [feedback, doneSpeaking, shouldReveal, current, round, rounds, worldId, completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordWrong]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400/75 to-pink-300/75 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="flex gap-1">
          {rounds.map((_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full ${i < round ? 'bg-white' : i === round ? 'bg-yellow-300' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={80} />
        <div className="bg-white/90 rounded-2xl px-6 py-3 shadow-lg text-center">
          <span className="text-sm font-[Nunito] text-gray-500">Find the one that starts with</span>
          <div className="text-6xl font-bold font-[Fredoka] text-purple-600 lowercase mt-1 cursor-pointer" onClick={() => { if (doneSpeaking && !feedback) speakPhoneme(current.letter); }}>{current.letter}</div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }} className="flex gap-4">
            {choices.map((item, index) => {
              const isCorrect = item.word === current.correct.word;
              const isBeingSpoken = activeOption === index;
              const revealCorrect = shouldReveal && isCorrect;

              return (
                <motion.button key={item.word} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(item.word)}
                  disabled={feedback !== null || !doneSpeaking || shouldReveal}
                  className={`w-28 h-28 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
                    feedback === 'correct' && isCorrect ? 'bg-green-200 ring-4 ring-green-400' :
                    revealCorrect ? 'bg-green-200 ring-4 ring-green-400 animate-pulse' :
                    isBeingSpoken ? 'bg-white ring-4 ring-blue-400 scale-105' :
                    'bg-white/90'
                  }`}>
                  <span className="text-5xl">{item.icon}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">That doesn&apos;t start with &quot;{current.letter}&quot;</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Safari complete!" onComplete={onComplete} />
    </div>
  );
}
