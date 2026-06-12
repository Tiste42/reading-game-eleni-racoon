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
import { ITEM_ART } from '@/lib/itemArt';

type Digraph = 'sh' | 'ch' | 'th';

// Per-word "The word is X. Which two letters..." lines are recorded for all
const DIGRAPH_WORDS: Array<{ word: string; digraph: Digraph }> = [
  { word: 'ship', digraph: 'sh' },
  { word: 'shop', digraph: 'sh' },
  { word: 'shed', digraph: 'sh' },
  { word: 'chip', digraph: 'ch' },
  { word: 'chop', digraph: 'ch' },
  { word: 'chat', digraph: 'ch' },
  { word: 'thin', digraph: 'th' },
  { word: 'this', digraph: 'th' },
  { word: 'that', digraph: 'th' },
];

const OPTIONS: Digraph[] = ['sh', 'ch', 'th'];

const DIGRAPH_STYLE: Record<Digraph, string> = {
  sh: 'bg-sky-100 text-sky-800 ring-sky-300',
  ch: 'bg-emerald-100 text-emerald-800 ring-emerald-300',
  th: 'bg-violet-100 text-violet-800 ring-violet-300',
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

type Phase = 'pick' | 'won';

export default function DigraphDiscovery({ worldId, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rounds] = useState(() => shuffle(DIGRAPH_WORDS).slice(0, 6));
  const { completeGame, addCoins, masterWord, incrementStreak, resetStreak, recordSoundAttempt } = useGameStore();

  const current = rounds[round];
  const { word, digraph } = current;
  const rest = word.slice(2);
  const isLast = round >= rounds.length - 1;

  useEffect(() => {
    setPhase('pick');
    setWrongPick(null);
  }, [round]);

  // Recorded line: "The word is ship. Which two letters make the special sound? ..."
  const { replay } = useGameSpeech(
    phase === 'pick'
      ? `The word is ${word}. Which two letters make the special sound? Is it sh, ch, or th?`
      : null,
    [round, phase],
  );

  const { shouldReveal, recordWrong } = useWrongAttempts(round, 2);

  const advance = useCallback(() => {
    if (isLast) {
      completeGame(worldId, 'digraph-discovery');
      addCoins(10);
      setShowCelebration(true);
    } else {
      setRound((r) => r + 1);
    }
  }, [isLast, worldId, completeGame, addCoins]);

  const celebrate = useCallback(async () => {
    setPhase('won');
    await speakPhoneme(digraph); // the two letters' ONE sound
    await speakWord(word);
    await speakFeedback(isLast ? 'complete' : 'correct');
    await new Promise((r) => setTimeout(r, 800));
    advance();
  }, [digraph, word, isLast, advance]);

  useEffect(() => {
    if (shouldReveal && phase === 'pick') {
      (async () => {
        recordSoundAttempt(digraph, false);
        await speakReveal(digraph);
        await celebrate();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldReveal, phase]);

  const pick = useCallback(
    (d: Digraph) => {
      if (phase !== 'pick') return;
      if (d === digraph) {
        recordSoundAttempt(digraph, true);
        incrementStreak();
        masterWord(word);
        playSoundEffect('coin');
        celebrate();
      } else {
        recordSoundAttempt(digraph, false);
        recordWrong();
        resetStreak();
        playSoundEffect('wrong');
        setWrongPick(d);
        // Re-teach: play the sound she picked, so she hears it's not in the word
        (async () => {
          await speakPhoneme(d);
          await speakWord(word);
          setWrongPick(null);
        })();
      }
    },
    [phase, digraph, word, celebrate, incrementStreak, masterWord, resetStreak, recordWrong, recordSoundAttempt],
  );

  return (
    <GameShell
      onBack={onComplete}
      onReplay={replay}
      round={round}
      totalRounds={rounds.length}
      progressIcon="🔮"
      bgClassName="from-red-300/60 to-amber-300/50"
    >
      <div className="flex-1 flex flex-col items-center justify-between py-2">
        {/* Leni + prompt */}
        <div className="flex flex-col items-center">
          <EleniCharacter pose={phase === 'won' ? 'celebrating' : 'excited'} size={120} />
          <p className="text-red-900 font-[Fredoka] font-bold text-2xl text-center px-3">
            Two letters, one special sound — which team starts it?
          </p>
        </div>

        {/* The word, digraph slot highlighted */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-white rounded-3xl px-6 py-5 shadow-xl flex items-center gap-1">
            <span
              className={`rounded-2xl px-3 py-1 text-7xl font-bold font-[Fredoka] lowercase transition-colors ${
                phase === 'won' ? DIGRAPH_STYLE[digraph] + ' ring-4' : 'bg-amber-100 text-amber-300 border-4 border-dashed border-amber-300'
              }`}
            >
              {phase === 'won' ? digraph : '??'}
            </span>
            <span className="text-7xl font-bold font-[Fredoka] text-gray-800 lowercase">{rest}</span>
          </div>
          <AnimatePresence>
            {phase === 'won' && ITEM_ART.has(word) && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-2 shadow-xl">
                <WordCard word={word} size={110} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The digraph teams */}
        <div className="flex gap-4">
          {OPTIONS.map((d) => {
            const highlight = (phase === 'won' || shouldReveal) && d === digraph;
            return (
              <motion.button
                key={`${round}-${d}`}
                onClick={() => pick(d)}
                disabled={phase !== 'pick'}
                animate={wrongPick === d ? { x: [-8, 8, -8, 8, 0] } : {}}
                whileTap={{ scale: 0.92 }}
                className={`w-[110px] h-[110px] rounded-3xl shadow-xl press-3d flex items-center justify-center text-6xl font-bold font-[Fredoka] lowercase ring-2 transition-all ${DIGRAPH_STYLE[d]} ${
                  highlight ? 'ring-4 ring-green-400 animate-hint-pulse scale-105' : ''
                }`}
              >
                {d}
              </motion.button>
            );
          })}
        </div>
      </div>

      <CelebrationOverlay show={showCelebration} message="Sound detective!" onComplete={onComplete} />
    </GameShell>
  );
}
