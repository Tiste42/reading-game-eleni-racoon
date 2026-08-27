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
import { getWordChains, type ResolvedWordChain } from '@/content/registry';
import type { GraphemeUnit } from '@/content/types';
import { shuffleSeeded } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';
import { isWordDecodable } from '@/content/progression';
import { hasChildIdentifiablePicture } from '@/content/pictureQuality';

interface BankTile {
  id: string;
  unit: GraphemeUnit;
}

const chainId = (chain: ResolvedWordChain) => chain.id;

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'build' | 'swap' | 'won';

export default function PotionLab({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('build');
  const [placed, setPlaced] = useState(0);
  const [wrongTile, setWrongTile] = useState<string | null>(null);
  const [bank, setBank] = useState<BankTile[]>([]);
  const [usedTileIds, setUsedTileIds] = useState<Set<string>>(new Set());
  const [swapChoices, setSwapChoices] = useState<GraphemeUnit[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const taughtPhonemes = useGameStore((state) => state.taughtPhonemes);
  const taughtPhonemeSet = useMemo(() => new Set(taughtPhonemes), [taughtPhonemes]);
  const chainPool = useMemo(() => getWordChains(enabledContentPackIds).filter((chain) =>
    isWordDecodable(chain.from, taughtPhonemeSet) &&
    isWordDecodable(chain.to, taughtPhonemeSet) &&
    chain.distractorUnits.every((unit) => taughtPhonemeSet.has(unit.phonemeId)) &&
    hasChildIdentifiablePicture(chain.from.text) &&
    hasChildIdentifiablePicture(chain.to.text),
  ), [enabledContentPackIds, taughtPhonemeSet]);
  const session = useContentSession({ gameId: 'potion-lab', candidates: chainPool, count: 5, getId: chainId });
  const rounds = session.items;
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const units = current.from.units;
  const newUnit = current.to.units[current.changedUnitIndex];
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('build');
    setPlaced(0);
    setWrongTile(null);
    let s = shuffleSeeded(
      units.map((item, index) => ({ id: `${current.id}:${index}`, unit: item })),
      `${session.seed}:${current.id}:bank`,
    );
    if (s.map((tile) => tile.unit.text).join('') === current.from.text) s = [...s].reverse();
    setBank(s);
    setUsedTileIds(new Set());
    setSwapChoices(shuffleSeeded([newUnit, ...current.distractorUnits], `${session.seed}:${current.id}:swap`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Recorded line tells her to sound the word out, not just tap what glows.
  const { replay } = useInstructionSpeech('potion-lab', phase === 'build', [round]);

  const soundOut = useCallback(async (wordUnits: GraphemeUnit[]) => {
    for (let i = 0; i < wordUnits.length; i++) {
      await speakPhoneme(wordUnits[i].phonemeId);
      if (i < wordUnits.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, []);

  const finishRound = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'potion-lab');
      addCoins(12);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Build phase: tap letters in order (MarketBuilder pattern)
  const tapBankLetter = useCallback(
    (tile: BankTile, idx: number) => {
      if (phase !== 'build') return;
      const needed = units[placed];
      if (tile.unit.text === needed.text) {
        recordSoundAttempt(needed.phonemeId, true);
        setUsedTileIds((currentIds) => new Set(currentIds).add(tile.id));
        const np = placed + 1;
        setPlaced(np);
        if (np === units.length) {
          (async () => {
            await speakPhoneme(needed.phonemeId); // last sound plays fully...
            await new Promise((r) => setTimeout(r, 150));
            playSoundEffect('celebrate'); // potion bubbles!
            masterWord(current.from.text);
            await speakWord(current.from.text); // ...then Leni says the word
            setPhase('swap');
          })();
        } else {
          speakPhoneme(needed.phonemeId);
        }
      } else {
        playSoundEffect('wrong');
        speakPhoneme(tile.unit.phonemeId);
        recordSoundAttempt(needed.phonemeId, false);
        setWrongTile(`bank-${idx}`);
        setTimeout(() => setWrongTile(null), 500);
      }
    },
    [phase, units, placed, current.from.text, masterWord, recordSoundAttempt],
  );

  // Swap phase: one grapheme pops out — pick the new one to make a new word.
  const tapSwapLetter = useCallback(
    (choice: GraphemeUnit) => {
      if (phase !== 'swap') return;
      if (choice.text === newUnit.text && choice.phonemeId === newUnit.phonemeId) {
        playSoundEffect('coin');
        recordSoundAttempt(newUnit.phonemeId, true);
        masterWord(current.to.text);
        setPhase('won');
        (async () => {
          await soundOut(current.to.units);
          await speakWord(current.to.text);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 800));
          finishRound();
        })();
      } else {
        playSoundEffect('wrong');
        recordSoundAttempt(newUnit.phonemeId, false);
        setWrongTile(`swap-${choice.text}`);
        (async () => {
          await speakPhoneme(choice.phonemeId);
          setWrongTile(null);
        })();
      }
    },
    [phase, newUnit, current.to, isLast, finishRound, masterWord, recordSoundAttempt, soundOut],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={phase === 'build' ? replay : undefined}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🧪"
      bgClassName="from-violet-400/60 to-emerald-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={114} />
          <p className="text-violet-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            {phase === 'build'
              ? 'Sound it out!'
              : phase === 'swap'
                ? 'Look at the picture. Swap one sound to make that word!'
                : `${current.to.text}! A brand new word!`}
          </p>
        </div>

        {/* Cauldron with letter slots */}
        <div className="flex flex-col items-center">
          {phase !== 'won' && (
            <div data-testid="potion-target-picture" className="bg-white/90 rounded-2xl p-1 shadow-lg mb-2">
              <WordCard word={phase === 'build' ? current.from.text : current.to.text} size={90} />
            </div>
          )}
          <div className="flex gap-2 sm:gap-3 mb-1">
            {units.map((unit, i) => {
              const filled = i < placed;
              const isNext = i === placed && phase === 'build';
              const isSwapSlot = i === current.changedUnitIndex && phase === 'swap';
              const shown = phase === 'won' && i === current.changedUnitIndex ? newUnit.text : unit.text;
              return (
                <div
                  key={i}
                  className={`w-[72px] h-[78px] sm:w-[84px] sm:h-[92px] rounded-2xl flex items-center justify-center text-5xl sm:text-6xl font-bold font-[Fredoka] lowercase shadow-inner transition-colors ${
                    isSwapSlot
                      ? 'bg-violet-200 border-4 border-dashed border-violet-500 animate-hint-pulse'
                      : filled || phase !== 'build'
                        ? 'bg-emerald-200 text-gray-800'
                        : isNext
                          ? 'bg-white/60 border-4 border-dashed border-white'
                          : 'bg-white/30 border-4 border-dashed border-white/50'
                  }`}
                >
                  {(filled || phase === 'won' || (phase === 'swap' && i !== current.changedUnitIndex)) && !isSwapSlot && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{shown}</motion.span>
                  )}
                  {isSwapSlot && <span className="text-4xl">✨</span>}
                </div>
              );
            })}
          </div>
          <motion.span
            animate={phase !== 'build' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.8, repeat: phase !== 'build' ? Infinity : 0 }}
            className="text-8xl"
          >
            🧪
          </motion.span>
          <AnimatePresence>
            {phase === 'won' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-2 shadow-xl -mt-2">
                <WordCard word={current.to.text} size={110} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Letter bank (build) or swap choices */}
        <div className="flex gap-2 sm:gap-4 min-h-[110px] items-center">
          {phase === 'build' &&
            bank.map((tile, idx) => {
              const used = usedTileIds.has(tile.id);
              return (
                <motion.button
                  key={tile.id}
                  onClick={() => tapBankLetter(tile, idx)}
                  disabled={used}
                  animate={
                    wrongTile === `bank-${idx}`
                      ? { x: [-8, 8, -8, 8, 0] }
                      : used
                        ? { scale: 0, opacity: 0 }
                        : { scale: 1, opacity: 1 }
                  }
                  whileTap={{ scale: 0.9 }}
                  className="w-[84px] h-[92px] sm:w-[100px] sm:h-[108px] rounded-3xl bg-white shadow-xl flex items-center justify-center text-6xl sm:text-7xl font-bold font-[Fredoka] text-gray-800 lowercase press-3d"
                >
                  {tile.unit.text}
                </motion.button>
              );
            })}
          {phase === 'swap' &&
            swapChoices.map((choice) => (
              <motion.button
                key={`${choice.text}:${choice.phonemeId}`}
                onClick={() => tapSwapLetter(choice)}
                animate={wrongTile === `swap-${choice.text}` ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.9 }}
                className="w-[100px] h-[108px] rounded-3xl bg-violet-100 shadow-xl flex items-center justify-center text-7xl font-bold font-[Fredoka] text-violet-800 lowercase press-3d ring-2 ring-violet-300"
              >
                {choice.text}
              </motion.button>
            ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Master potion maker!" onComplete={onComplete} />
    </GameShell>
  );
}
