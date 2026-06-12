'use client';

import { motion } from 'framer-motion';

interface Props {
  onReplay: () => void;
}

/** Prominent "hear the directions again" button — speaker + label so a
 * 3-4 year old (or parent) can always replay the instructions. */
export default function ReplayButton({ onReplay }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onReplay}
      className="h-12 px-4 rounded-full bg-white/80 flex items-center gap-1.5 shadow-md shrink-0"
      aria-label="Hear the directions again"
    >
      <span className="text-2xl">🔊</span>
      <span className="font-[Fredoka] text-purple-600 text-base font-bold">Again</span>
    </motion.button>
  );
}
