'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { getIcon } from '@/lib/wordIcons';

interface DecoderWord {
  word: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const DECODER_WORDS: DecoderWord[] = [
  { word: 'ship', icon: getIcon('ship'), distractors: [{ word: 'chip', icon: getIcon('chip') }, { word: 'thin', icon: getIcon('thin') }] },
  { word: 'chat', icon: getIcon('chat'), distractors: [{ word: 'shop', icon: getIcon('shop') }, { word: 'that', icon: getIcon('that') }] },
  { word: 'thin', icon: getIcon('thin'), distractors: [{ word: 'chin', icon: getIcon('chin') }, { word: 'shin', icon: getIcon('shin') }] },
  { word: 'chop', icon: getIcon('chop'), distractors: [{ word: 'shop', icon: getIcon('shop') }, { word: 'ship', icon: getIcon('ship') }] },
  { word: 'shed', icon: getIcon('shed'), distractors: [{ word: 'them', icon: getIcon('them') }, { word: 'chip', icon: getIcon('chip') }] },
  { word: 'this', icon: getIcon('this'), distractors: [{ word: 'shin', icon: getIcon('shin') }, { word: 'chat', icon: getIcon('chat') }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function RuinDecoder({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(DECODER_WORDS).slice(0, 5));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = words[round];
  const choices = useMemo(
    () => shuffle([{ word: current.word, icon: current.icon }, ...current.distractors]),
    [current]
  );

  // Don't say the word — child must decode it
  useGameSpeech(
    feedback ? null : 'Read the ancient word! Which picture matches?',
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (!shouldReveal) return;
    speakReveal(current.word);
    const timer = setTimeout(() => {
      masterWord(current.word);
      setRevealed((r) => [...r, round]);
      if (round >= words.length - 1) {
        completeGame(worldId, 'ruin-decoder');
        addCoins(10);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setRound((r) => r + 1);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [shouldReveal, current, round, words, worldId, completeGame, addCoins, masterWord]);

  const handleChoice = useCallback((chosen: string) => {
    if (feedback || shouldReveal) return;
    if (chosen === current.word) {
      const isLastRound = round >= words.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      masterWord(current.word);
      setRevealed((r) => [...r, round]);
      setTimeout(() => {
        setFeedback(null);
        if (isLastRound) {
          completeGame(worldId, 'ruin-decoder');
          addCoins(10);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(chosen, current.word);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, shouldReveal, current, round, words, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-400/90 to-amber-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-red-600">{revealed.length}/{words.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 max-w-xs mx-auto mb-4">
        {words.map((_, i) => (
          <div key={i} className={`aspect-square rounded-lg ${revealed.includes(i) ? 'bg-amber-200' : 'bg-gray-700/40'} flex items-center justify-center text-2xl`}>
            {revealed.includes(i) ? words[i].icon : ''}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <AnimatePresence mode="wait">
          <motion.div key={round} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="bg-amber-100 border-4 border-amber-700 rounded-2xl px-10 py-6 shadow-xl">
            <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{current.word}</span>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4">
          {choices.map((choice) => (
            <motion.button key={choice.word} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(choice.word)}
              disabled={feedback !== null || shouldReveal}
              className={`w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
                shouldReveal && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400 scale-105'
                  : feedback === 'correct' && choice.word === current.word
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : 'bg-white/90'
              }`}>
              <span className="text-4xl">{choice.icon}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Ancient words decoded!" onComplete={onComplete} />
    </div>
  );
}
