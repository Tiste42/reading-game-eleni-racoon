'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface CelebrationOverlayProps {
  show: boolean;
  onComplete?: () => void;
  type?: 'stars' | 'coins' | 'levelUp';
  message?: string;
}

const STAR_EMOJIS = ['⭐', '🌟', '✨', '💫', '🎉', '🎊'];

export default function CelebrationOverlay({
  show,
  onComplete,
  type = 'stars',
  message,
}: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Array<{ id: number; emoji: string; x: number; delay: number }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        emoji: STAR_EMOJIS[Math.floor(Math.random() * STAR_EMOJIS.length)],
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        onComplete?.();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute text-3xl"
              style={{ left: `${p.x}%`, top: '-10%' }}
              initial={{ y: 0, opacity: 1, scale: 0 }}
              animate={{
                y: '120vh',
                opacity: [1, 1, 0],
                scale: [0, 1.5, 1],
                rotate: Math.random() * 360,
              }}
              transition={{
                duration: 2,
                delay: p.delay,
                ease: 'easeOut',
              }}
            >
              {p.emoji}
            </motion.span>
          ))}

          {message && (
            <motion.div
              className="bg-white/90 rounded-3xl px-8 py-6 shadow-2xl border-4 border-amber-300 z-10"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <p className="text-3xl font-bold text-center font-[Fredoka] text-amber-600">
                {message}
              </p>
              {type === 'stars' && (
                <div className="flex justify-center gap-2 mt-2">
                  {[1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      className="text-4xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.2, type: 'spring' }}
                    >
                      ⭐
                    </motion.span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
