'use client';

import { motion } from 'framer-motion';

interface Props {
  onReplay: () => void;
}

export default function ReplayButton({ onReplay }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.85, rotate: -180 }}
      onClick={onReplay}
      className="w-10 h-10 rounded-full bg-white/40 flex items-center justify-center text-lg shadow-md"
      aria-label="Replay instructions"
    >
      ↻
    </motion.button>
  );
}
