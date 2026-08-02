'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getInitialSoundGroups, type ResolvedSoundGroup } from '@/content/registry';
import { shuffleSeeded } from '@/lib/roundSelector';
import { useContentSession } from '@/lib/useContentSession';

interface Pair {
  letter: string;
  phonemeId: string;
  word: string;
}

const groupId = (group: ResolvedSoundGroup) => group.id;

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
  const enabledContentPackIds = useGameStore((state) => state.enabledContentPackIds);
  const groups = useMemo(() => getInitialSoundGroups(enabledContentPackIds), [enabledContentPackIds]);
  const session = useContentSession({ gameId: 'letter-match', candidates: groups, count: 6, getId: groupId });
  const [rounds] = useState<Pair[][]>(() => {
    const pairs = session.items.map((group) => ({
      letter: group.letter,
      phonemeId: group.phonemeId,
      word: shuffleSeeded(group.words, `${session.seed}:${group.id}:word`)[0].text,
    }));
    return [pairs.slice(0, 3), pairs.slice(3, 6)];
  });
  const [letterOrders] = useState(() => rounds.map((items, i) => shuffleSeeded(items.map((pair) => pair.letter), `${session.seed}:letters:${i}`)));
  const [pictureOrders] = useState(() => rounds.map((items, i) => shuffleSeeded(items, `${session.seed}:pictures:${i}`)));
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
      const pair = pairs.find((item) => item.letter === letter);
      speakPhoneme(pair?.phonemeId || letter);
    },
    [advancing, matched, pairs],
  );

  const tapPicture = useCallback(
    (pair: Pair) => {
      if (advancing || !selected || matched.has(pair.letter)) return;
      if (pair.letter === selected) {
        recordSoundAttempt(pair.phonemeId, true);
        incrementStreak();
        masterPhoneme(pair.phonemeId);
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
        const selectedPair = pairs.find((item) => item.letter === selected);
        recordSoundAttempt(selectedPair?.phonemeId || selected, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(pair.word);
        // Re-teach: play the selected letter's sound again so she can re-listen
        (async () => {
          await speakPhoneme(selectedPair?.phonemeId || selected);
          setWrongPick(null);
        })();
      }
    },
    [
      advancing, selected, matched, pairs, isLastRound, worldId,
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
