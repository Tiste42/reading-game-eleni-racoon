'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CelebrationOverlay from '@/components/ui/CelebrationOverlay';
import { useGameStore } from '@/lib/store';
import { speakFeedback, speakWrongExplanation } from '@/lib/speech';
import { useGameSpeech, useWrongAttempts } from '@/lib/useGameSpeech';

interface ComicPanel {
  sentence: string;
  icon: string;
  distractors: string[];
}

interface ComicStory {
  panels: ComicPanel[];
}

const STORIES: ComicStory[] = [
  { panels: [
    { sentence: 'The cat sat on a mat.', icon: '🐱', distractors: ['🐶', '🐛'] },
    { sentence: 'A dog ran to the cat.', icon: '🐶', distractors: ['🚐', '☕'] },
    { sentence: 'The cat and dog had a nap.', icon: '💤', distractors: ['🔥', '🚢'] },
  ]},
  { panels: [
    { sentence: 'A bug sat on a log.', icon: '🐛', distractors: ['🐱', '✈️'] },
    { sentence: 'A big fish jumped up!', icon: '🐟', distractors: ['🧢', '🪵'] },
    { sentence: 'The bug fell in the pond.', icon: '💦', distractors: ['🛏️', '🍲'] },
  ]},
  { panels: [
    { sentence: 'He got a red hat.', icon: '🧢', distractors: ['🥅', '🐔'] },
    { sentence: 'The hat was too big!', icon: '😄', distractors: ['🐛', '✂️'] },
    { sentence: 'He gave it to his dog.', icon: '🐶', distractors: ['🦈', '🔴'] },
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
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const { completeGame, addCoins } = useGameStore();

  const panel = story.panels[panelIdx];
  const { recordWrong } = useWrongAttempts(panelIdx);

  // Don't read the sentence — child must decode it
  useGameSpeech(
    feedback ? null : 'Read the sentence! Which picture matches?',
    [panelIdx],
  );

  // Shuffle picture choices for current panel
  const pictureChoices = useMemo(
    () => shuffle([panel.icon, ...panel.distractors]),
    [panel]
  );

  const handleChoice = useCallback((chosen: string) => {
    if (feedback) return;
    if (chosen === panel.icon) {
      const next = [...revealed, panelIdx];
      setRevealed(next);
      setFeedback('correct');
      const isLast = panelIdx >= story.panels.length - 1;
      speakFeedback(isLast ? 'complete' : 'correct');
      setTimeout(() => {
        setFeedback(null);
        if (isLast) {
          completeGame(worldId, 'comic-creator');
          addCoins(12);
          setShowCelebration(true);
        } else {
          setPanelIdx((p) => p + 1);
        }
      }, 1000);
    } else {
      setFeedback('wrong');
      recordWrong();
      speakWrongExplanation(chosen, panel.icon);
      setTimeout(() => setFeedback(null), 2000);
    }
  }, [feedback, panel, panelIdx, revealed, story, worldId, completeGame, addCoins, recordWrong]);

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

      {/* Comic panels showing progress */}
      <div className="flex gap-2 max-w-md mx-auto w-full mb-6">
        {story.panels.map((p, i) => (
          <div key={i} className={`flex-1 aspect-square rounded-xl border-3 border-gray-800 flex items-center justify-center ${
            revealed.includes(i) ? 'bg-white' : i === panelIdx ? 'bg-yellow-100 ring-2 ring-yellow-400' : 'bg-gray-300'
          }`}>
            {revealed.includes(i) ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl">{p.icon}</motion.span>
            ) : (
              <span className="text-2xl text-gray-500">?</span>
            )}
          </div>
        ))}
      </div>

      {/* Current sentence to read */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <AnimatePresence mode="wait">
          <motion.div key={panelIdx} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="bg-white rounded-2xl px-6 py-5 shadow-xl max-w-sm w-full text-center">
            <p className="text-xl font-bold font-[Fredoka] text-gray-800 leading-relaxed">
              {panel.sentence}
            </p>
          </motion.div>
        </AnimatePresence>

        <p className="text-white/80 font-[Nunito] text-sm">Which picture matches what you read?</p>

        {/* Picture choices */}
        <div className="flex gap-4">
          {pictureChoices.map((icon) => (
            <motion.button key={icon} whileTap={{ scale: 0.9 }} onClick={() => handleChoice(icon)}
              disabled={feedback !== null}
              className={`w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center transition-all ${
                feedback === 'correct' && icon === panel.icon
                  ? 'bg-green-200 ring-4 ring-green-400'
                  : 'bg-white/90'
              }`}>
              <span className="text-4xl">{icon}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {feedback === 'wrong' && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, x: [-4, 4, -4, 0] }} exit={{ opacity: 0 }}
              className="text-lg text-white font-bold">Read again and try!</motion.p>
          )}
        </AnimatePresence>
      </div>

      <CelebrationOverlay show={showCelebration} message="Comic complete!" onComplete={onComplete} />
    </div>
  );
}
