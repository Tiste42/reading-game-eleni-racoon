'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { type BookConfig, getBookPagePath } from '@/lib/books';
import { speakBookPage, stopSpeaking } from '@/lib/speech';
import MusicToggle from '@/components/ui/MusicToggle';

interface Props {
  book: BookConfig;
}

export default function BookReader({ book }: Props) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);

  const totalPages = book.pageCount;
  const hasNarration = book.pages[currentPage]?.narrationText?.length > 0;

  // Stop speech on unmount or page change
  useEffect(() => {
    return () => {
      stopSpeaking();
      playingRef.current = false;
    };
  }, [currentPage]);

  const goToPage = useCallback((newPage: number, dir: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    stopSpeaking();
    setIsPlaying(false);
    playingRef.current = false;
    setDirection(dir);
    setCurrentPage(newPage);
  }, [totalPages]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && currentPage < totalPages - 1) {
      goToPage(currentPage + 1, 1);
    } else if (info.offset.x > threshold && currentPage > 0) {
      goToPage(currentPage - 1, -1);
    }
  }, [currentPage, totalPages, goToPage]);

  const handleSpeak = useCallback(async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      playingRef.current = false;
      return;
    }

    setIsPlaying(true);
    playingRef.current = true;
    await speakBookPage(book.id, currentPage + 1);
    if (playingRef.current) {
      setIsPlaying(false);
      playingRef.current = false;
    }
  }, [book.id, currentPage, isPlaying]);

  const handleBack = useCallback(() => {
    stopSpeaking();
    router.push('/library');
  }, [router]);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  return (
    <div className="h-dvh bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/60 backdrop-blur-sm shadow-sm shrink-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center text-lg shadow-md"
          aria-label="Back to library"
        >
          ←
        </motion.button>

        <span className="text-base font-bold font-[Fredoka] text-amber-800">
          {currentPage + 1} / {totalPages}
        </span>

        <div className="flex items-center gap-2">
        <MusicToggle className="w-9 h-9 text-base bg-white/80" />
        {hasNarration ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSpeak}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md ${
              isPlaying
                ? 'bg-amber-400 animate-pulse'
                : 'bg-white/80'
            }`}
            aria-label={isPlaying ? 'Stop narration' : 'Read aloud'}
          >
            {isPlaying ? '⏹️' : '🔊'}
          </motion.button>
        ) : (
          <div className="w-10" />
        )}
        </div>
      </div>

      {/* Page display — constrained to remaining viewport height */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 min-h-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={getBookPagePath(book.id, currentPage + 1)}
              alt={`Page ${currentPage + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl select-none"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Tap zones for prev/next (invisible, overlaid on edges) */}
        {currentPage > 0 && (
          <button
            onClick={() => goToPage(currentPage - 1, -1)}
            className="absolute left-0 top-0 bottom-0 w-16 z-10"
            aria-label="Previous page"
          />
        )}
        {currentPage < totalPages - 1 && (
          <button
            onClick={() => goToPage(currentPage + 1, 1)}
            className="absolute right-0 top-0 bottom-0 w-16 z-10"
            aria-label="Next page"
          />
        )}
      </div>

      {/* Bottom navigation — compact */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/60 backdrop-blur-sm shrink-0">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => goToPage(currentPage - 1, -1)}
          disabled={currentPage === 0}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg ${
            currentPage === 0
              ? 'bg-gray-200 text-gray-400'
              : 'bg-white text-amber-600 active:bg-amber-50'
          }`}
          aria-label="Previous page"
        >
          ◀
        </motion.button>

        <span className="text-xs font-[Nunito] text-amber-700/60">
          {book.title}
        </span>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => goToPage(currentPage + 1, 1)}
          disabled={currentPage === totalPages - 1}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg ${
            currentPage === totalPages - 1
              ? 'bg-gray-200 text-gray-400'
              : 'bg-white text-amber-600 active:bg-amber-50'
          }`}
          aria-label="Next page"
        >
          ▶
        </motion.button>
      </div>
    </div>
  );
}
