'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import { useGameStore } from '@/lib/store';
import { speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

const SIGHT_WORDS = ['the', 'was', 'said', 'is', 'to', 'he', 'she', 'we', 'my', 'you'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function TreasureMemory({ worldId, onComplete }: Props) {
  const selectedWords = useMemo(() => shuffle(SIGHT_WORDS).slice(0, 4), []);
  const cards = useMemo(
    () => shuffle([...selectedWords, ...selectedWords].map((word, i) => ({ id: i, word }))),
    [selectedWords],
  );
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const { replay } = useGameSpeech('Match the word pairs! Tap a card to flip it!', []);

  const handleFlip = useCallback(
    (id: number) => {
      if (flipped.length >= 2) return;
      const card = cards.find((c) => c.id === id);
      if (!card || flipped.includes(id) || matched.has(card.word)) return;
      playSoundEffect('tap');
      const next = [...flipped, id];
      setFlipped(next);
      speakWord(card.word);

      if (next.length === 2) {
        const [a, b] = next.map((fid) => cards.find((c) => c.id === fid)!);
        if (a.word === b.word) {
          masterWord(a.word);
          recordSoundAttempt(a.word, true);
          playSoundEffect('coin');
          const nextMatched = new Set(matched);
          nextMatched.add(a.word);
          setTimeout(() => {
            setMatched(nextMatched);
            setFlipped([]);
            if (nextMatched.size === selectedWords.length) {
              playSoundEffect('celebrate');
              speakFeedback('complete');
              completeGame(worldId, 'treasure-memory');
              addCoins(10);
              setShowCelebration(true);
            }
          }, 700);
        } else {
          recordSoundAttempt(a.word, false);
          setTimeout(() => setFlipped([]), 1100);
        }
      }
    },
    [flipped, cards, matched, selectedWords, worldId, completeGame, addCoins, masterWord, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={matched.size}
      totalRounds={selectedWords.length}
      progressIcon="💎"
      bgClassName="from-amber-400/60 to-red-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={matched.size === selectedWords.length ? 'celebrating' : 'excited'} size={116} />
          <p className="text-amber-900 font-[Fredoka] font-bold text-2xl text-center">
            Find the matching word pairs!
          </p>
        </div>

        {/* Cards — big, 2 rows of 4 */}
        <div className="grid grid-cols-4 gap-3 max-w-lg w-full px-1">
          {cards.map((card) => {
            const isUp = flipped.includes(card.id) || matched.has(card.word);
            const isMatched = matched.has(card.word);
            return (
              <motion.button
                key={card.id}
                onClick={() => handleFlip(card.id)}
                disabled={isUp}
                whileTap={{ scale: 0.93 }}
                animate={{ rotateY: isUp ? 0 : 180, scale: isMatched ? 0.96 : 1 }}
                transition={{ duration: 0.35 }}
                style={{ transformStyle: 'preserve-3d' }}
                className={`h-[110px] rounded-2xl shadow-xl flex items-center justify-center press-3d transition-colors ${
                  isMatched
                    ? 'bg-yellow-200 ring-4 ring-yellow-400'
                    : isUp
                      ? 'bg-white'
                      : 'bg-gradient-to-br from-amber-500 to-red-400'
                }`}
              >
                {isUp ? (
                  <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{card.word}</span>
                ) : (
                  <span className="text-4xl">🪙</span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Matched treasure row */}
        <div className="flex gap-3 bg-white/60 rounded-2xl px-5 py-2 shadow-inner min-h-[52px] items-center">
          {selectedWords.map((w, i) => (
            <span
              key={i}
              className={`text-xl font-bold font-[Fredoka] lowercase px-3 py-1 rounded-xl ${
                matched.has(w) ? 'bg-yellow-200 text-amber-800' : 'bg-white/40 text-transparent'
              }`}
            >
              {matched.has(w) ? w : '···'}
            </span>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Treasure found!" onComplete={onComplete} />
    </GameShell>
  );
}
