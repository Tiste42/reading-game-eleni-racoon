'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWord } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';

const SIGHT_WORDS = ['the', 'was', 'said', 'is', 'to', 'he', 'she', 'we', 'my', 'you'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function TreasureMemory({ worldId, onComplete }: Props) {
  const selectedWords = useMemo(() => shuffle(SIGHT_WORDS).slice(0, 6), []);
  const cards = useMemo(() => shuffle([...selectedWords, ...selectedWords].map((word, i) => ({ id: i, word }))), [selectedWords]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, masterWord } = useGameStore();

  useGameSpeech('Match the word pairs! Tap a card to flip it!', []);

  const handleFlip = useCallback((id: number) => {
    if (flipped.length >= 2) return;
    const card = cards.find((c) => c.id === id);
    if (!card || flipped.includes(id) || matched.has(card.word)) return;

    const next = [...flipped, id];
    setFlipped(next);
    speakWord(card.word);

    if (next.length === 2) {
      const [a, b] = next.map((fid) => cards.find((c) => c.id === fid)!);
      if (a.word === b.word) {
        masterWord(a.word);
        const nextMatched = new Set(matched);
        nextMatched.add(a.word);
        const isLastMatch = nextMatched.size >= selectedWords.length;
        speakFeedback(isLastMatch ? 'complete' : 'correct');
        setMatched(nextMatched);
        setTimeout(() => {
          setFlipped([]);
          if (isLastMatch) {
            completeGame(worldId, 'treasure-memory');
            addCoins(10);
            setShowCelebration(true);
          }
        }, 600);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }, [flipped, matched, cards, selectedWords, worldId, completeGame, addCoins, masterWord]);

  const isCardVisible = (id: number) => {
    const card = cards.find((c) => c.id === id);
    return flipped.includes(id) || (card && matched.has(card.word));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-400/90 to-amber-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <div className="bg-white/80 rounded-full px-4 py-2 shadow">
          <span className="font-[Fredoka] text-red-600">{matched.size}/{selectedWords.length}</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <EleniCharacter pose={matched.size > 0 ? 'celebrating' : 'excited'} size={60} />
        <p className="text-white/80 font-[Nunito] text-sm mt-1">Match the word pairs!</p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-3 max-w-sm w-full">
          {cards.map((card) => {
            const visible = isCardVisible(card.id);
            const isMatched = matched.has(card.word);
            return (
              <motion.button key={card.id} whileTap={!visible ? { scale: 0.9 } : undefined}
                onClick={() => handleFlip(card.id)}
                className={`aspect-[3/4] rounded-2xl shadow-lg flex items-center justify-center text-xl font-bold font-[Fredoka] lowercase transition-all ${
                  isMatched ? 'bg-green-200 ring-2 ring-green-400'
                  : visible ? 'bg-white text-gray-800' : 'bg-amber-700 text-amber-700'
                }`}>
                {visible ? card.word : '?'}
              </motion.button>
            );
          })}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Memory master!" onComplete={onComplete} />
    </div>
  );
}
