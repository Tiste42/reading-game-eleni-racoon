'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';

// Toddler-recognizable words per letter — every one has real art AND audio
const LETTER_WORDS: Record<string, string[]> = {
  s: ['sun', 'sock', 'star', 'snake'],
  a: ['ant', 'apple'],
  t: ['tiger', 'tent'],
  p: ['pig', 'penguin', 'pen'],
  i: ['igloo', 'insect'],
  n: ['nest', 'nut', 'net'],
  e: ['egg', 'elephant'],
  l: ['lion', 'lemon', 'lip'],
};
const LETTERS = Object.keys(LETTER_WORDS);

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Pair {
  letter: string;
  word: string;
}

// 2 rounds × 3 pairs, all different letters
function buildRounds(): Pair[][] {
  const letters = shuffle(LETTERS).slice(0, 6);
  return [letters.slice(0, 3), letters.slice(3, 6)].map((group) =>
    group.map((letter) => ({ letter, word: pick(LETTER_WORDS[letter]) })),
  );
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function LetterMatch({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(buildRounds);
  const [letterOrders] = useState(() => rounds.map((r) => shuffle(r.map((p) => p.letter))));
  const [pictureOrders] = useState(() => rounds.map((r) => shuffle([...r])));
  const { completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const pairs = rounds[round];
  const letters = letterOrders[round];
  const pictures = pictureOrders[round];
  const isLastRound = round >= rounds.length - 1;

  useEffect(() => {
    setMatched(new Set());
    setSelected(null);
    setWrongPick(null);
    setAdvancing(false);
  }, [round]);

  const { replay } = useGameSpeech(
    'Match each letter to its picture! Tap a letter, then tap the picture that starts with it!',
    [round],
  );

  // After 4 wrong taps in a round, hint-pulse the right picture for the
  // selected letter so she can always succeed — never a dead end.
  const { shouldReveal: showHint, recordWrong } = useWrongAttempts(round, 4);

  const tapLetter = useCallback(
    (letter: string) => {
      if (advancing || matched.has(letter)) return;
      setSelected(letter);
      speakPhoneme(letter);
    },
    [advancing, matched],
  );

  const tapPicture = useCallback(
    (pair: Pair) => {
      if (advancing || !selected || matched.has(pair.letter)) return;
      if (pair.letter === selected) {
        recordSoundAttempt(selected, true);
        incrementStreak();
        masterPhoneme(pair.letter);
        playSoundEffect('coin');
        const next = new Set(matched);
        next.add(pair.letter);
        setMatched(next);
        setSelected(null);
        const roundDone = next.size >= pairs.length;
        (async () => {
          await speakWord(pair.word);
          if (!roundDone) return;
          setAdvancing(true);
          await speakFeedback(isLastRound ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          if (isLastRound) {
            completeGame(worldId, 'letter-match');
            addCoins(8);
            setShowCelebration(true);
          } else {
            setRound((r) => r + 1);
          }
        })();
      } else {
        recordSoundAttempt(selected, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(pair.word);
        // Re-teach: play the selected letter's sound again so she can re-listen
        (async () => {
          await speakPhoneme(selected);
          setWrongPick(null);
        })();
      }
    },
    [
      advancing, selected, matched, pairs.length, isLastRound, worldId,
      completeGame, addCoins, masterPhoneme, incrementStreak, resetStreak,
      recordWrong, recordSoundAttempt,
    ],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🌸"
      bgClassName="from-pink-400/60 to-rose-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-evenly py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={advancing || showCelebration ? 'celebrating' : 'excited'} size={120} />
          <p className="text-pink-800 font-[Fredoka] font-bold text-2xl text-center">
            Match each letter to its picture!
          </p>
        </div>

        {/* Letters on the left, pictures on the right */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-3">
            {letters.map((letter) => {
              const done = matched.has(letter);
              return (
                <motion.button
                  key={`${round}-${letter}`}
                  onClick={() => tapLetter(letter)}
                  disabled={done || advancing}
                  animate={done ? { scale: 0.9 } : selected === letter ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={selected === letter && !done ? { duration: 0.9, repeat: Infinity } : {}}
                  whileTap={!done ? { scale: 0.92 } : {}}
                  className={`w-[96px] h-[96px] rounded-3xl shadow-xl press-3d flex items-center justify-center text-6xl font-bold font-[Fredoka] lowercase transition-all ${
                    done
                      ? 'bg-green-200 text-green-700'
                      : selected === letter
                        ? 'bg-yellow-200 text-gray-800 ring-4 ring-yellow-400'
                        : 'bg-white text-gray-800'
                  }`}
                >
                  {letter}
                </motion.button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            {pictures.map((pair) => {
              const done = matched.has(pair.letter);
              const hint = showHint && !done && selected === pair.letter;
              return (
                <motion.button
                  key={`${round}-${pair.word}`}
                  onClick={() => tapPicture(pair)}
                  disabled={done || advancing}
                  animate={
                    wrongPick === pair.word
                      ? { x: [-8, 8, -8, 8, 0] }
                      : done
                        ? { scale: 0.9 }
                        : hint
                          ? { scale: [1, 1.1, 1] }
                          : { scale: 1 }
                  }
                  transition={hint && wrongPick !== pair.word ? { duration: 0.9, repeat: Infinity } : {}}
                  whileTap={!done ? { scale: 0.92 } : {}}
                  className={`rounded-3xl p-2 shadow-xl press-3d flex items-center justify-center transition-all ${
                    done
                      ? 'bg-green-200'
                      : hint
                        ? 'bg-white ring-4 ring-green-400 animate-hint-pulse'
                        : 'bg-white'
                  }`}
                >
                  <WordCard word={pair.word} size={100} />
                </motion.button>
              );
            })}
          </div>
        </div>

        <p className="text-pink-800/90 font-[Fredoka] font-semibold text-lg text-center px-6">
          Tap a letter, then tap its picture!
        </p>
      </div>

      <CelebrationOverlay show={showCelebration} message="Matching marvel!" onComplete={onComplete} />
    </GameShell>
  );
}
