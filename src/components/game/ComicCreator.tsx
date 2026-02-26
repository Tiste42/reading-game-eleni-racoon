'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback } from '@/lib/speech';
import { useGameSpeech } from '@/lib/useGameSpeech';

interface ComicPanel {
  sentence: string;
  icon: string;
}

interface ComicStory {
  panels: ComicPanel[];
}

const STORIES: ComicStory[] = [
  { panels: [
    { sentence: 'The cat sat on a mat.', icon: '\uD83D\uDC31' },
    { sentence: 'A dog ran to the cat.', icon: '\uD83D\uDC36' },
    { sentence: 'The cat and dog had a nap.', icon: '\uD83D\uDCA4' },
  ]},
  { panels: [
    { sentence: 'A bug sat on a log.', icon: '\uD83D\uDC1B' },
    { sentence: 'A big fish jumped up!', icon: '\uD83D\uDC1F' },
    { sentence: 'The bug fell in the pond.', icon: '\uD83D\uDCA6' },
  ]},
  { panels: [
    { sentence: 'He got a red hat.', icon: '\uD83E\uDDE2' },
    { sentence: 'The hat was too big!', icon: '\uD83D\uDE04' },
    { sentence: 'He gave it to his dog.', icon: '\uD83D\uDC36' },
  ]},
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  worldId: number;
  onComplete: () => void;
}

export default function ComicCreator({ worldId, onComplete }: Props) {
  const [story] = useState(() => shuffle(STORIES)[0]);
  const [panelIdx, setPanelIdx] = useState(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins } = useGameStore();

  useGameSpeech(story.panels[panelIdx].sentence, [panelIdx]);

  const handleRead = useCallback(() => {
    const next = [...revealed, panelIdx];
    setRevealed(next);
    setTimeout(() => {
      if (panelIdx >= story.panels.length - 1) {
        completeGame(worldId, 'comic-creator');
        addCoins(12);
        setShowCelebration(true);
        speakFeedback('complete');
      } else {
        setPanelIdx((p) => p + 1);
      }
    }, 1000);
  }, [panelIdx, revealed, story, worldId, completeGame, addCoins]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400/90 to-green-300/90 px-4 py-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={onComplete}
          className="w-14 h-14 rounded-full bg-white/40 flex items-center justify-center text-2xl shadow-md">{'<'}</motion.button>
        <span className="text-white font-[Fredoka]">Panel {panelIdx + 1}/{story.panels.length}</span>
      </div>

      <div className="text-center mb-4">
        <EleniCharacter pose={revealed.length > 0 ? 'celebrating' : 'excited'} size={70} />
      </div>

      {/* Comic panels */}
      <div className="flex gap-2 max-w-md mx-auto w-full mb-6">
        {story.panels.map((panel, i) => (
          <div key={i} className={`flex-1 aspect-square rounded-xl border-3 border-gray-800 flex items-center justify-center ${
            revealed.includes(i) ? 'bg-white' : 'bg-gray-300'
          }`}>
            {revealed.includes(i) ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl">{panel.icon}</motion.span>
            ) : (
              <span className="text-2xl text-gray-500">?</span>
            )}
          </div>
        ))}
      </div>

      {/* Current sentence */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <AnimatePresence mode="wait">
          <motion.div key={panelIdx} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="bg-white rounded-2xl px-6 py-5 shadow-xl max-w-sm w-full text-center">
            <p className="text-xl font-bold font-[Fredoka] text-gray-800 leading-relaxed">
              {story.panels[panelIdx].sentence}
            </p>
          </motion.div>
        </AnimatePresence>

        {!revealed.includes(panelIdx) && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleRead}
            className="game-button bg-white/90 text-cyan-600 px-10 py-5 rounded-full shadow-xl text-lg">
            <span className="font-[Fredoka]">I read it!</span>
          </motion.button>
        )}
      </div>

      <CelebrationOverlay show={showCelebration} message="Comic complete!" onComplete={onComplete} />
    </div>
  );
}
