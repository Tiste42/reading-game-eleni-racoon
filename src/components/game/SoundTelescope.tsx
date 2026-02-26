'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation, speakReveal } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';

interface TelescopeWord {
  word: string;
  blendText: string;
  icon: string;
  distractors: { word: string; icon: string }[];
}

const TELESCOPE_WORDS: TelescopeWord[] = [
  { word: 'sat', blendText: 'sss...aaa...t', icon: '🪑', distractors: [{ word: 'pin', icon: '📌' }, { word: 'net', icon: '🥅' }] },
  { word: 'pin', blendText: 'p...iii...nnn', icon: '📌', distractors: [{ word: 'tap', icon: '🚰' }, { word: 'pet', icon: '🐶' }] },
  { word: 'net', blendText: 'nnn...eee...t', icon: '🥅', distractors: [{ word: 'sip', icon: '🥤' }, { word: 'pan', icon: '🍳' }] },
  { word: 'pet', blendText: 'p...eee...t', icon: '🐶', distractors: [{ word: 'tin', icon: '🥫' }, { word: 'nap', icon: '💤' }] },
  { word: 'sip', blendText: 'sss...iii...p', icon: '🥤', distractors: [{ word: 'ten', icon: '🔟' }, { word: 'let', icon: '✅' }] },
  { word: 'let', blendText: 'lll...eee...t', icon: '✅', distractors: [{ word: 'sat', icon: '🪑' }, { word: 'nip', icon: '❄️' }] },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SoundTelescope({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(TELESCOPE_WORDS).slice(0, 5));
  const { completeGame, addCoins, masterWord } = useGameStore();

  const current = words[round];

  const choices = useMemo(
    () => shuffle([{ word: current.word, icon: current.icon }, ...current.distractors]),
    [current]
  );

  const optionNames = useMemo(() => choices.map(c => c.word), [choices]);

  const instruction = feedback || !revealed
    ? null
    : `Listen to the sounds: ${current.blendText}. What word is that?`;

  const { activeOption, doneSpeaking } = useGameSpeechWithOptions(
    instruction,
    optionNames,
    [round, revealed],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round);

  useEffect(() => {
    if (shouldReveal && revealed) {
      speakReveal(current.word);
      const timer = setTimeout(() => {
        setFeedback(null);
        setRevealed(false);
        if (round >= words.length - 1) {
          completeGame(worldId, 'sound-telescope');
          addCoins(10);
          setShowCelebration(true);
          speakFeedback('complete');
        } else {
          setRound(r => r + 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [shouldReveal, revealed, current.word, round, words.length, worldId, completeGame, addCoins]);

  const handleLook = useCallback(() => setRevealed(true), []);

  const handleChoice = useCallback((chosen: string) => {
    if (feedback || !doneSpeaking || shouldReveal) return;
    if (chosen === current.word) {
      const isLastRound = round >= words.length - 1;
      setFeedback('correct');
      speakFeedback(isLastRound ? 'complete' : 'correct');
      masterWord(current.word);
      setTimeout(() => {
        setFeedback(null);
        setRevealed(false);
        if (isLastRound) {
          completeGame(worldId, 'sound-telescope');
          addCoins(10);
          setShowCelebration(true);
        } else {
          setRound((r) => r + 1);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(chosen, current.word, 'blend');
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, doneSpeaking, shouldReveal, current, round, words, worldId, completeGame, addCoins, masterWord, recordWrong]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-400/90 to-orange-300/90 px-4 py-6 flex flex-col">
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
        <EleniCharacter pose={feedback === 'correct' ? 'celebrating' : 'excited'} size={70} />

        <div className="bg-gray-800/30 rounded-full w-52 h-52 flex items-center justify-center shadow-inner border-4 border-gray-700/30">
          {!revealed ? (
            <span className="text-6xl">🔭</span>
          ) : (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center">
              <p className="text-xl font-bold font-[Fredoka] text-white tracking-widest">{current.blendText}</p>
            </motion.div>
          )}
        </div>

        {!revealed ? (
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleLook}
            className="game-button bg-blue-500 text-white px-10 py-5 rounded-full shadow-xl text-lg">
            <span className="text-3xl">🔭</span>
            <span className="font-[Fredoka]"> Look!</span>
          </motion.button>
        ) : (
          <>
            <p className="text-white/80 font-[Nunito] text-sm">What word is that?</p>
            <div className="flex gap-4">
              {choices.map((choice, idx) => (
                <motion.button key={choice.word} initial={{ scale: 0 }} animate={{ scale: 1 }}
                  whileTap={{ scale: 0.9 }} onClick={() => handleChoice(choice.word)}
                  disabled={!doneSpeaking || feedback !== null || shouldReveal}
                  className={`w-24 h-24 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1 transition-all ${
                    shouldReveal && choice.word === current.word
                      ? 'bg-green-200 ring-4 ring-green-400 animate-pulse'
                      : feedback === 'correct' && choice.word === current.word
                      ? 'bg-green-200 ring-4 ring-green-400'
                      : activeOption === idx
                      ? 'bg-white/90 ring-4 ring-blue-400 scale-105'
                      : 'bg-white/90'
                  }`}>
                  <span className="text-4xl">{choice.icon}</span>
                </motion.button>
              ))}
            </div>
          </>
        )}

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">Listen again and try!</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Eagle eyes!" onComplete={onComplete} />
    </div>
  );
}
