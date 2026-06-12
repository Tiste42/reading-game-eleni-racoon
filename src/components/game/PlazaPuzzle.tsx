'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import { useGameStore } from '@/lib/store';
import { speakPhoneme, speakWord, speakFeedback, speakReveal } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';
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

type Phase = 'read' | 'won';

export default function PlazaPuzzle({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('read');
  const [choices, setChoices] = useState<string[]>([]);
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [solvedWords, setSolvedWords] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pieces] = useState(() => shuffle(WORDS).slice(0, 6));
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const word = pieces[round];
  const isLast = round >= pieces.length - 1;

  useEffect(() => {
    setPhase('read');
    setWrongPick(null);
    const others = shuffle(WORDS.filter((w) => w !== pieces[round])).slice(0, 2);
    setChoices(shuffle([pieces[round], ...others]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const { replay } = useGameSpeech(
    phase === 'read' ? 'Which word matches the picture? Read the words!' : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  // Sound a word out letter-by-letter with the human phonemes (full playback)
  const soundOut = useCallback(async (w: string) => {
    const ls = w.split('');
    for (let i = 0; i < ls.length; i++) {
      await speakPhoneme(ls[i]);
      if (i < ls.length - 1) await new Promise((r) => setTimeout(r, 120));
    }
  }, []);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'plaza-puzzle');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Two wrong reads → Leni models the answer, the tile still gets placed
  useEffect(() => {
    if (shouldReveal && phase === 'read') {
      (async () => {
        recordSoundAttempt(word, false);
        await speakReveal(word);
        setPhase('won');
        setSolvedWords((s) => [...s, word]);
        await new Promise((r) => setTimeout(r, 1100));
        advance();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pickWord = useCallback(
    (w: string) => {
      if (phase !== 'read') return;
      if (w === word) {
        recordSoundAttempt(word, true);
        incrementStreak();
        masterWord(word);
        playSoundEffect('coin');
        setPhase('won');
        setSolvedWords((s) => [...s, word]);
        (async () => {
          await speakWord(word);
          await speakFeedback(isLast ? 'complete' : 'correct');
          await new Promise((r) => setTimeout(r, 700));
          advance();
        })();
      } else {
        recordSoundAttempt(word, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(w);
        // Helpful re-teach: sound out the word she tapped so she hears it
        // doesn't match the picture, then let her try again
        (async () => {
          await soundOut(w);
          await speakWord(w);
          setWrongPick(null);
        })();
      }
    },
    [phase, word, isLast, advance, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt, soundOut],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={pieces.length}
      progressIcon="🧩"
      bgClassName="from-amber-400/60 to-orange-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-amber-900 font-[Fredoka] font-bold text-2xl text-center">
            {phase === 'won' ? 'Puzzle piece earned!' : 'Which word matches the picture?'}
          </p>
        </div>

        {/* The BIG picture she must match */}
        <AnimatePresence mode="wait">
          <motion.div
            key={round}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="bg-white rounded-3xl p-4 shadow-xl"
          >
            <WordCard word={word} size={170} />
          </motion.div>
        </AnimatePresence>

        {/* The word choices — SHE reads these */}
        <div className="flex gap-4 flex-wrap justify-center">
          {choices.map((w) => {
            const isAnswer = w === word;
            const highlight = (phase === 'won' || shouldReveal) && isAnswer;
            return (
              <motion.button
                key={`${round}-${w}`}
                onClick={() => pickWord(w)}
                disabled={phase !== 'read'}
                animate={wrongPick === w ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`px-7 py-5 rounded-3xl shadow-xl bg-white press-3d transition-all ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                }`}
              >
                <span className="text-5xl font-bold font-[Fredoka] text-gray-800 lowercase">{w}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Mosaic strip: solved pieces fill in */}
        <div className="flex gap-2 bg-white/50 rounded-2xl px-4 py-2 shadow-inner">
          {pieces.map((p, i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                solvedWords.includes(p) ? 'bg-amber-200' : 'bg-white/40 border-2 border-dashed border-amber-300'
              }`}
            >
              {solvedWords.includes(p) && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <WordCard word={p} size={44} />
                </motion.span>
              )}
            </div>
          ))}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Puzzle complete!" onComplete={onComplete} />
    </GameShell>
  );
}
