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
import { REQUIRED_HEART_WORDS, buildPrintAudioCards } from '@/content/learningIntegrity';

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function TreasureMemory({ worldId, onComplete }: Props) {
  const masteredWords = useGameStore((state) => state.masteredWords);
  const selectedWords = useMemo(() => shuffle(
    REQUIRED_HEART_WORDS.filter((word) => masteredWords.includes(word)),
  ).slice(0, 4), [masteredWords]);
  const cards = useMemo(() => shuffle(buildPrintAudioCards(selectedWords)), [selectedWords]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const { replay } = useGameSpeech('Match each printed word to its sound!', []);

  const handleFlip = useCallback((id: string) => {
    if (flipped.length >= 2) return;
    const card = cards.find((candidate) => candidate.id === id);
    if (!card || flipped.includes(id) || matched.has(card.word)) return;

    playSoundEffect('tap');
    const next = [...flipped, id];
    setFlipped(next);
    if (card.kind === 'audio') speakWord(card.word);

    if (next.length === 2) {
      const [first, second] = next.map((cardId) => cards.find((candidate) => candidate.id === cardId)!);
      const isMatch = first.word === second.word && first.kind !== second.kind;
      if (isMatch) {
        masterWord(first.word);
        recordSoundAttempt(first.word, true);
        playSoundEffect('coin');
        const nextMatched = new Set(matched);
        nextMatched.add(first.word);
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
        recordSoundAttempt(first.word, false);
        setTimeout(() => setFlipped([]), 1100);
      }
    }
  }, [flipped, cards, matched, selectedWords, worldId, completeGame, addCoins, masterWord, recordSoundAttempt]);

  if (selectedWords.length < 4) {
    return (
      <GameShell
        onBack={onComplete}
        onReplay={replay}
        round={0}
        totalRounds={4}
        progressIcon="💎"
        bgClassName="from-amber-400/60 to-red-300/50"
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-6">
          <EleniCharacter pose="excited" size={140} />
          <p className="text-3xl font-bold font-[Fredoka] text-amber-900">Map the heart words first!</p>
          <p className="text-xl font-[Fredoka] text-amber-900/80">Then this treasure game will use only words you already learned.</p>
        </div>
      </GameShell>
    );
  }

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
        <div className="flex flex-col items-center">
          <EleniCharacter pose={matched.size === selectedWords.length ? 'celebrating' : 'excited'} size={116} />
          <p className="text-amber-900 font-[Fredoka] font-bold text-2xl text-center">
            Match each word to a sound card!
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 max-w-lg w-full px-1">
          {cards.map((card) => {
            const isUp = flipped.includes(card.id) || matched.has(card.word);
            const isMatched = matched.has(card.word);
            return (
              <motion.button
                key={card.id}
                data-testid="treasure-memory-card"
                data-card-kind={card.kind}
                onClick={() => handleFlip(card.id)}
                disabled={isUp}
                aria-label={isUp && card.kind === 'print' ? 'Printed word card' : isUp ? 'Sound card' : 'Hidden treasure card'}
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
                  card.kind === 'print' ? (
                    <span className="text-4xl font-bold font-[Fredoka] text-gray-800 lowercase">{card.word}</span>
                  ) : (
                    <span className="text-5xl" aria-hidden="true">🔊</span>
                  )
                ) : (
                  <span className="text-4xl" aria-hidden="true">🪙</span>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="flex gap-3 bg-white/60 rounded-2xl px-5 py-2 shadow-inner min-h-[52px] items-center">
          {selectedWords.map((word) => (
            <span
              key={word}
              className={`text-xl font-bold font-[Fredoka] lowercase px-3 py-1 rounded-xl ${
                matched.has(word) ? 'bg-yellow-200 text-amber-800' : 'bg-white/40 text-transparent'
              }`}
            >
              {matched.has(word) ? word : '···'}
            </span>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Treasure found!" onComplete={onComplete} />
    </GameShell>
  );
}
