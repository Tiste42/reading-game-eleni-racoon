'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

// Only SATPIN + e, l letters AND words a 3-4 year old knows and can picture.
const WORDS = ['ant', 'pen', 'lip', 'net', 'pin', 'nap'];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function MarketBuilder({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [placed, setPlaced] = useState(0);
  const [wrongTile, setWrongTile] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [done, setDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [words] = useState(() => shuffle(WORDS).slice(0, 6));
  const { completeGame, addCoins, masterWord, recordSoundAttempt } = useGameStore();

  const word = words[round];
  const letters = word.split('');
  const isLast = round >= words.length - 1;

  // Scrambled letter bank, stable per round
  const [bank, setBank] = useState<string[]>([]);
  useEffect(() => {
    let s = shuffle(letters);
    if (s.join('') === word) s = [...s].reverse();
    setBank(s);
    setPlaced(0);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Hint glow stays off so she sounds the word out herself. It only turns on
  // after a wrong tap, or after ~5s stuck on the same letter (never trapped).
  useEffect(() => {
    if (done) return;
    setShowHint(false);
    const t = setTimeout(() => setShowHint(true), 5000);
    return () => clearTimeout(t);
  }, [placed, round, done]);

  const instruction = `Sound out ${word}. Say each sound, then find its letter!`;
  const { replay } = useGameSpeech(done ? null : instruction, [round, done]);

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
    (letter: string, bankIdx: number) => {
      if (done) return;
      const needed = letters[placed];
      if (letter === needed) {
        playSoundEffect('tap');
        recordSoundAttempt(letter, true);
        const np = placed + 1;
        setPlaced(np);
        if (np === letters.length) {
          // Last letter: let its human sound finish, THEN say the word
          (async () => {
            await speakPhoneme(letter);
            await new Promise((r) => setTimeout(r, 150));
            completeWord();
          })();
        } else {
          speakPhoneme(letter);
        }
      } else {
        // Foolproof: a wrong tap never traps her — shake + play the sound she needs
        playSoundEffect('wrong');
        speakPhoneme(needed);
        recordSoundAttempt(needed, false);
        setShowHint(true);
        setWrongTile(bankIdx);
        setTimeout(() => setWrongTile(null), 500);
      }
    },
    [done, letters, placed, completeWord, recordSoundAttempt],
  );

  // A bank tile is "used" once its letter has been placed (letters are unique per word)
  const isUsed = (letter: string) => letters.slice(0, placed).includes(letter);

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
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/90 rounded-3xl p-3 shadow-lg -mt-2"
          >
            <WordCard word={word} size={180} />
          </motion.div>
          <p className="text-amber-800 font-[Fredoka] font-bold text-2xl mt-2">Sound it out!</p>
        </div>

        {/* Slots being filled */}
        <div className="flex gap-3">
          {letters.map((letter, i) => {
            const filled = i < placed;
            const isNext = i === placed && !done;
            return (
              <div
                key={i}
                className={`w-[84px] h-[84px] rounded-2xl flex items-center justify-center text-6xl font-bold font-[Fredoka] lowercase shadow-inner transition-colors ${
                  filled
                    ? 'bg-green-300 text-gray-800'
                    : isNext
                      ? 'bg-white/50 border-4 border-dashed border-white'
                      : 'bg-white/30 border-4 border-dashed border-white/50'
                }`}
              >
                {filled && (
                  <motion.span initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }}>
                    {letter}
                  </motion.span>
                )}
              </div>
            );
          })}
        </div>

        {/* Letter bank — big tiles */}
        <div className="flex gap-4">
          {bank.map((letter, bankIdx) => {
            const used = isUsed(letter);
            const isNeeded = letter === letters[placed] && !done;
            return (
              <motion.button
                key={bankIdx}
                onClick={() => tapLetter(letter, bankIdx)}
                disabled={used || done}
                animate={
                  wrongTile === bankIdx
                    ? { x: [-8, 8, -8, 8, 0] }
                    : used
                      ? { scale: 0, opacity: 0 }
                      : { scale: 1, opacity: 1 }
                }
                whileTap={{ scale: 0.9 }}
                className={`w-[104px] h-[104px] rounded-3xl bg-white shadow-xl flex items-center justify-center text-7xl font-bold font-[Fredoka] text-gray-800 lowercase press-3d ${
                  isNeeded && showHint ? 'ring-4 ring-yellow-300 animate-hint-pulse' : ''
                }`}
              >
                {letter}
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
