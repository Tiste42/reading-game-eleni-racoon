'use client';

import { motion } from 'framer-motion';
import ReplayButton from '@/components/ui/ReplayButton';

interface Props {
  onBack: () => void;
  onReplay?: () => void;
  /** 0-based current round and total rounds — drives the progress bar */
  round: number;
  totalRounds: number;
  /** emoji that rides the progress bar head (e.g. 🪅) */
  progressIcon?: string;
  /** tailwind gradient classes for a LIGHT themed tint over the world background */
  bgClassName?: string;
  children: React.ReactNode;
}

/**
 * Shared scaffold for game screens: back + replay buttons, an animated
 * progress bar, and the game content. The themed gradient is rendered as a
 * LIGHT tint so the world background photo behind it stays visible.
 */
export default function GameShell({
  onBack,
  onReplay,
  round,
  totalRounds,
  progressIcon = '⭐',
  bgClassName = 'from-pink-300/75 to-orange-200/75',
  children,
}: Props) {
  const pct = totalRounds > 0 ? Math.min(100, (round / totalRounds) * 100) : 0;

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Light themed tint — lets the world background photo show through */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${bgClassName} opacity-25`}
      />

      <div className="relative z-10 flex flex-col flex-1 px-4 py-5">
        <div className="flex items-center gap-3 mb-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-12 h-12 shrink-0 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl shadow-md"
            aria-label="Back"
          >
            ◀
          </motion.button>
          {onReplay && <ReplayButton onReplay={onReplay} />}

          {/* Progress bar */}
          <div className="relative flex-1 h-6 bg-white/50 backdrop-blur-sm rounded-full shadow-inner mr-10">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-yellow-300 to-amber-400"
              initial={false}
              animate={{ width: `${Math.max(pct, 6)}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 text-3xl drop-shadow"
              initial={false}
              animate={{ left: `calc(${Math.max(pct, 6)}% - 14px)`, rotate: [0, -10, 10, 0] }}
              transition={{
                left: { type: 'spring', stiffness: 120, damping: 20 },
                rotate: { duration: 0.6 },
              }}
            >
              {progressIcon}
            </motion.div>
          </div>
        </div>

        {/* Frosted "stage" — a clean panel that fills the screen so the big
            game elements pop instead of floating on the busy background */}
        <div className="flex-1 flex flex-col w-full max-w-xl mx-auto pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <div className="flex-1 flex flex-col rounded-[2rem] bg-white/35 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-2 border-white/50 px-3 py-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
