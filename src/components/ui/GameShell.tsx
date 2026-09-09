'use client';

import { motion, useReducedMotion } from 'framer-motion';
import ReplayButton from '@/components/ui/ReplayButton';

interface Props {
  onBack: () => void;
  onReplay?: () => void;
  /** Completed rounds (0-based current round) and total rounds. */
  round: number;
  totalRounds: number;
  complete?: boolean;
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
  complete = false,
  progressIcon = '⭐',
  bgClassName = 'from-pink-300/75 to-orange-200/75',
  children,
}: Props) {
  const completed = complete ? totalRounds : Math.max(0, Math.min(round, totalRounds));
  const pct = totalRounds > 0 ? (completed / totalRounds) * 100 : 0;
  const reducedMotion = useReducedMotion();

  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Light themed tint — lets the world background photo show through */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${bgClassName} opacity-25`}
      />

      <div className="relative z-10 flex flex-col flex-1 px-4 py-5">
        <div className="flex items-center gap-3 mb-3 pr-[150px] min-h-12">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="w-12 h-12 shrink-0 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-xl shadow-md"
            aria-label="Back"
          >
            ◀
          </motion.button>
          {onReplay && <ReplayButton onReplay={onReplay} />}

        </div>

        {/* A separate trail stays usable on phones beside the floating controls.
            It reflects completed rounds only, never which answer to choose. */}
        <div className="w-full max-w-xl mx-auto mb-3 rounded-3xl border-2 border-white/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-2 font-[Fredoka] text-sm font-semibold text-purple-900">
            <span>Adventure trail</span>
            <span>{completed} / {totalRounds} complete</span>
          </div>
          <div
            role="progressbar"
            aria-label="Adventure progress"
            aria-valuemin={0}
            aria-valuemax={totalRounds}
            aria-valuenow={completed}
            className="relative h-8 mx-3"
          >
            <div className="absolute inset-x-0 top-3 h-2 rounded-full bg-purple-200/80" />
            <motion.div
              className="absolute left-0 top-3 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.4 }}
            />
            {Array.from({ length: totalRounds + 1 }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`absolute top-2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white ${index <= completed ? 'bg-amber-400' : 'bg-purple-300'}`}
                style={{ left: `${totalRounds > 0 ? (index / totalRounds) * 100 : 0}%` }}
              />
            ))}
            <motion.div
              aria-hidden="true"
              className="absolute top-0 -translate-x-1/2 text-3xl leading-8 drop-shadow"
              initial={false}
              animate={{ left: `${pct}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.4 }}
            >
              {progressIcon}
            </motion.div>
            <span aria-hidden="true" className="absolute right-0 top-0 translate-x-1/2 text-3xl leading-8">🏁</span>
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
