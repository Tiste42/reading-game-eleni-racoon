'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback } from '@/lib/speech';
import { useInstructionSpeech } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getWordsForActivity } from '@/content/registry';
import type { ContentWord, GraphemeUnit } from '@/content/types';
import { shuffleSeeded } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { getPracticedPhonemes } from '@/content/progression';

interface BankTile {
  id: string;
  unit: GraphemeUnit;
}

const wordId = (entry: ContentWord) => entry.id;

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function MarketBuilder({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const practicedPhonemes = useMemo(() => getPracticedPhonemes(enabledContentPackIds, taughtPhonemes), [enabledContentPackIds, taughtPhonemes]);
  const pool = useMemo(() => getWordsForActivity(enabledContentPackIds, 'picture-to-build', practicedPhonemes), [enabledContentPackIds, practicedPhonemes]);
  const session = useContentSession({ gameId: 'market-builder', historyKey: 'world3-blending-words', candidates: pool, count: 6, getId: wordId });
  const words = session.items;
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const entry = words[round];
  const word = entry.text;
  const units = entry.units;
  const isLast = round >= words.length - 1;

  // Scrambled letter bank, stable per round
  const [bank, setBank] = useState<BankTile[]>([]);
  const [usedTileIds, setUsedTileIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let s = shuffleSeeded(
      units.map((item, index) => ({ id: `${entry.id}:${index}`, unit: item })),
      `${session.seed}:${entry.id}:bank`,
    );
    if (s.map((tile) => tile.unit.text).join('') === word) s = [...s].reverse();
    setBank(s);
    setPlaced(0);
    setDone(false);
    setUsedTileIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Generic recorded directions preserve the picture-to-word contract: the
  // target word is never pronounced before Eleni builds it.
  const { replay } = useInstructionSpeech('market-builder', !done, [round]);

  // Called after the LAST letter's sound has fully played. Leni then says the
  // whole word as the answer (no stretched-blend clip).
  const completeWord = useCallback(() => {
    setDone(true);
    playSoundEffect('coin');
    masterWord(word);
    (async () => {
      await speakWord(word);
      await speakFeedback(isLast ? 'complete' : 'correct');
      await new Promise((r) => setTimeout(r, 900));
      if (isLast) {
        completeGame(worldId, 'market-builder');
        addCoins(10);
        setShowCelebration(true);
      } else {
        setRound((r) => r + 1);
      }
    })();
  }, [word, isLast, worldId, completeGame, addCoins, masterWord]);

  const tapLetter = useCallback(
    (tile: BankTile, bankIdx: number) => {
      if (done) return;
      const needed = units[placed];
      if (tile.unit.text === needed.text) {
        playSoundEffect('tap');
        recordSoundAttempt(needed.phonemeId, true);
        setUsedTileIds((current) => new Set(current).add(tile.id));
        const np = placed + 1;
        setPlaced(np);
        if (np === units.length) {
          // Last letter: let its human sound finish, THEN say the word
          (async () => {
            await speakPhoneme(needed.phonemeId);
            await new Promise((r) => setTimeout(r, 150));
            completeWord();
          })();
        } else {
          speakPhoneme(needed.phonemeId);
        }
      } else {
        // Foolproof: a wrong tap never traps her — shake + play the sound she needs
        playSoundEffect('wrong');
        speakPhoneme(tile.unit.phonemeId);
        recordSoundAttempt(needed.phonemeId, false);
        setWrongTile(bankIdx);
        setTimeout(() => setWrongTile(null), 500);
      }
    },
    [done, units, placed, completeWord, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={words.length}
      progressIcon="🏪"
      bgClassName="from-amber-400/85 to-orange-300/85"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-3">
        {/* Leni + the item to build */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={done ? 'celebrating' : 'excited'} size={140} />
          <motion.div
            key={round}
            data-testid="market-target-picture"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 rounded-3xl p-3 shadow-lg -mt-2"
          >
            <WordCard word={word} size={180} />
          </motion.div>
          <p className="text-amber-800 font-[Fredoka] font-bold text-2xl mt-2">Sound it out!</p>
        </div>

        {/* Slots being filled */}
        <div className="flex gap-2 sm:gap-3">
          {units.map((unit, i) => {
            const filled = i < placed;
            const isNext = i === placed && !done;
            return (
              <div
                key={i}
                className={`w-[72px] h-[78px] sm:w-[84px] sm:h-[84px] rounded-2xl flex items-center justify-center text-5xl sm:text-6xl font-bold font-[Fredoka] lowercase shadow-inner transition-colors ${
                  filled
                    ? 'bg-green-300 text-gray-800'
                    : isNext
                      ? 'bg-white/50 border-4 border-dashed border-white'
                      : 'bg-white/30 border-4 border-dashed border-white/50'
                }`}
              >
                {filled && (
                  <motion.span initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }}>
                    {unit.text}
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>

        {/* Letter bank — big tiles */}
        <div className="flex gap-2 sm:gap-4">
          {bank.map((tile, bankIdx) => {
            const used = usedTileIds.has(tile.id);
            return (
              <motion.button
                key={tile.id}
                onClick={() => tapLetter(tile, bankIdx)}
                disabled={used || done}
                animate={
                  wrongTile === bankIdx
                    ? { x: [-8, 8, -8, 8, 0] }
                    : used
                      ? { scale: 0, opacity: 0 }
                      : { scale: 1, opacity: 1 }
                }
                whileTap={{ scale: 0.9 }}
                className="w-[84px] h-[92px] sm:w-[104px] sm:h-[104px] rounded-3xl bg-white shadow-xl flex items-center justify-center text-6xl sm:text-7xl font-bold font-[Fredoka] text-gray-800 lowercase press-3d"
              >
                {tile.unit.text}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {done && (
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-5xl font-bold font-[Fredoka] text-amber-700 lowercase"
            >
              {word}!
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Master Builder!" onComplete={onComplete} />
    </GameShell>
  );
}
