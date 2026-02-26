'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/lib/store';

export default function CoinCounter() {
  const coins = useGameStore((s) => s.coins);

  return (
    <div className="flex items-center gap-2 bg-amber-100 rounded-full px-4 py-2 shadow-md">
      <motion.span
        className="text-2xl"
        key={coins}
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 360 }}
        transition={{ duration: 0.4 }}
      >
        🪙
      </motion.span>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={coins}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          className="text-xl font-bold text-amber-700 font-[Fredoka] min-w-[2ch] text-center"
        >
          {coins}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
