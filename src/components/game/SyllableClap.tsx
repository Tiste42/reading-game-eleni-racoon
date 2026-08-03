'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import GameShell from '@/components/ui/GameShell';
import WordCard from '@/components/ui/WordCard';
import PressButton from '@/components/ui/PressButton';
import { useGameStore } from '@/lib/store';
import { speak, speakFeedback, speakSyllables } from '@/lib/speech';
import { useGameSpeechWithOptions, useWrongAttempts } from '@/lib/useGameSpeech';
import { playSoundEffect } from '@/lib/audio';
import { getSyllableWords } from '@/content/registry';
import type { SyllableWord } from '@/content/types';
import { useContentSession } from '@/lib/useContentSession';

const syllableId = (entry: SyllableWord) => entry.id;

function beatsText(word: string, n: number): string {
  return `${word} has ${n} ${n === 1 ? 'beat' : 'beats'}`;
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function SyllableClap({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [claps, setClaps] = useState(0);
  const [phase, setPhase] = useState<'play' | 'checking' | 'model'>('play');
  const [bouncing, setBouncing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins, incrementStreak, resetStreak, recordSoundAttempt, enabledContentPackIds } = useGameStore();
  const candidates = getSyllableWords(enabledContentPackIds);
  const session = useContentSession({ gameId: 'syllable-clap', candidates, count: 6, getId: syllableId });
  const words = session.items;

  const current = words[round];
  const isLast = round >= words.length - 1;

  const { replay } = useGameSpeechWithOptions(
    'How many beats does this word have? Clap for each beat!',
    [current.word],
    [round],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    setPhase('play');
    setClaps(0);
    if (isLast) {
      completeGame(worldId, 'syllable-clap');
      addCoins(6);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  // Bounce the picture once per syllable while the segmented audio plays
  const playBeats = useCallback(async () => {
    setBouncing(true);
    await speakSyllables(current.word);
    setBouncing(false);
  }, [current]);

  // After 2 misses: model the beats, say the answer, move on
  const modeling = useRef(false);
  useEffect(() => {
    if (shouldReveal && phase !== 'model' && !modeling.current) {
      modeling.current = true;
      setPhase('model');
      (async () => {
        await playBeats();
        await speak(`${beatsText(current.word, current.syllables)}!`);
        await new Promise((r) => setTimeout(r, 600));
        modeling.current = false;
        advance();
      })();
    }
  }, [shouldReveal, phase, current, playBeats, advance]);

  const handleClap = useCallback(() => {
    if (phase !== 'play') return;
    playSoundEffect('tap');
    setClaps((c) => Math.min(c + 1, 6));
  }, [phase]);

  const handleSubmit = useCallback(() => {
    if (phase !== 'play' || claps === 0) return;
    setPhase('checking');

    if (claps === current.syllables) {
      recordSoundAttempt('syllables', true);
      incrementStreak();
      playSoundEffect('correct');
      (async () => {
        await speakFeedback(isLast ? 'complete' : 'correct');
        await new Promise((r) => setTimeout(r, 400));
        advance();
      })();
    } else {
      recordSoundAttempt('syllables', false);
      recordWrong();
      resetStreak();
      playSoundEffect('wrong');
      // Corrective modeling: replay the segmented beats so she can recount
      (async () => {
        await playBeats();
        setClaps(0);
        setPhase('play');
      })();
    }
  }, [phase, claps, current, isLast, advance, playBeats, recordWrong, resetStreak, incrementStreak, recordSoundAttempt]);

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={words.length}
      progressIcon="🪇"
      bgClassName="from-pink-500/75 to-orange-400/75"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-4">
        <EleniCharacter pose={phase === 'checking' && claps === current.syllables ? 'celebrating' : 'excited'} size={150} />

        {/* The word picture — its own row, with space above and below */}
        <AnimatePresence mode="wait">
            <motion.div
              key={round}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={bouncing ? { y: [0, -22, 0] } : { y: 0 }}
                transition={bouncing ? { duration: 0.45, repeat: Infinity, ease: 'easeInOut' } : {}}
                className="bg-white rounded-3xl p-3 shadow-lg inline-block"
              >
                <WordCard word={current.word} size={190} />
              </motion.div>
              <p className="text-4xl font-bold font-[Fredoka] text-purple-700 lowercase mt-2">
                {current.word}
              </p>
            </motion.div>
          </AnimatePresence>

        {/* Middle: hear-the-beats + the beat dots */}
        <div className="flex flex-col items-center gap-3">
          <PressButton
            silent
            onClick={() => { if (phase === 'play') playBeats(); }}
            className="bg-white rounded-full px-6 py-3 flex items-center gap-2 font-[Fredoka] text-purple-600 text-xl shadow-md"
          >
            🔊 Hear the beats
          </PressButton>
          <div className="flex gap-3 min-h-[52px] items-center justify-center">
            {Array.from({ length: Math.max(claps, 1) }).map((_, i) =>
              i < claps ? (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.5, 1] }}
                  transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                  className="w-12 h-12 rounded-full bg-yellow-400 shadow-lg flex items-center justify-center text-2xl"
                >
                  👏
                </motion.span>
              ) : (
                <span key={i} className="w-12 h-12 rounded-full border-4 border-dashed border-purple-300" />
              ),
            )}
          </div>
        </div>

        {/* Bottom: the big maraca (hero) + check + reset */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-5">
            <PressButton
              silent
              onClick={handleClap}
              disabled={phase !== 'play'}
              className="w-36 h-36 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-xl text-8xl flex items-center justify-center"
              aria-label="Clap"
            >
              <motion.span
                key={claps}
                initial={{ rotate: -25, scale: 1.25 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 12 }}
              >
                🪇
              </motion.span>
            </PressButton>

            <PressButton
              silent
              onClick={handleSubmit}
              disabled={phase !== 'play' || claps === 0}
              className={`w-28 h-28 rounded-full shadow-xl text-6xl flex items-center justify-center font-bold transition-colors ${
                claps > 0 && phase === 'play' ? 'bg-green-400 text-white' : 'bg-white/50 text-gray-400'
              }`}
              aria-label="Check answer"
            >
              ✓
            </PressButton>

            <PressButton
              silent
              onClick={() => { if (phase === 'play') setClaps(0); }}
              disabled={phase !== 'play'}
              className="w-20 h-20 rounded-full bg-white/80 shadow-lg text-3xl flex items-center justify-center text-purple-500"
              aria-label="Start over"
            >
              ↺
            </PressButton>
          </div>

          <div className="min-h-[28px]">
            <AnimatePresence>
              {phase === 'model' && (
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-2xl text-orange-600 font-bold font-[Fredoka]"
                >
                  {beatsText(current.word, current.syllables)}!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Great clapping!" onComplete={onComplete} />
    </GameShell>
  );
}
