'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import { playSoundEffect } from '@/lib/audio';

interface CelebrationOverlayProps {
  show: boolean;
  onComplete?: () => void;
  type?: 'stars' | 'coins' | 'levelUp';
  message?: string;
}

const CONFETTI = ['🎉', '🎊', '⭐', '🌟', '✨', '💫', '🎈', '🍬', '🌸'];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

export default function CelebrationOverlay({
  show,
  onComplete,
  type = 'stars',
  message,
}: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (show) {
      playSoundEffect('celebrate');
      setParticles(
        Array.from({ length: 36 }, (_, i) => ({
          id: i,
          emoji: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
          x: Math.random() * 100,
          delay: Math.random() * 0.7,
          duration: 1.8 + Math.random() * 1.2,
          size: 22 + Math.random() * 26,
          drift: (Math.random() - 0.5) * 200,
        })),
      );

      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
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
          {/* soft radial glow behind the card */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: 'radial-gradient(circle at 50% 45%, rgba(255,235,150,0.55), rgba(255,255,255,0) 60%)' }}
          />

          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute"
              style={{ left: `${p.x}%`, top: '-8%', fontSize: p.size }}
              initial={{ y: 0, x: 0, opacity: 1, scale: 0 }}
              animate={{
                y: '115vh',
                x: p.drift,
                opacity: [1, 1, 0.9, 0],
                scale: [0, 1.4, 1, 0.9],
                rotate: (Math.random() - 0.5) * 540,
              }}
              transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
            >
              {p.emoji}
            </motion.span>
          ))}

          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <motion.div
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <EleniCharacter pose="celebrating" size={150} animate={false} />
            </motion.div>

            {message && (
              <div className="bg-white/95 rounded-3xl px-8 py-5 shadow-2xl border-4 border-amber-300 -mt-4">
                <p className="text-3xl font-bold text-center font-[Fredoka] text-amber-600">
                  {message}
                </p>
                {type === 'stars' && (
                  <div className="flex justify-center gap-2 mt-2">
                    {[1, 2, 3].map((i) => (
                      <motion.span
                        key={i}
                        className="text-4xl"
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: [0, 1.5, 1], rotate: 0 }}
                        transition={{ delay: 0.3 + i * 0.18, type: 'spring', stiffness: 300 }}
                      >
                        ⭐
                      </motion.span>
                    ))}
                  </div>
                )}
                {type === 'coins' && (
                  <motion.div
                    className="flex justify-center gap-1 mt-2 text-3xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                  >
                    🪙🪙🪙
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
