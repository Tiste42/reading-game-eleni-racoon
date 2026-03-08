'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import MusicToggle from '@/components/ui/MusicToggle';
import { BOOKS, getBookCoverPath } from '@/lib/books';

export default function LibraryPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen px-4 py-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-orange-50 to-amber-200" />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/')}
            className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center text-xl shadow-md"
            aria-label="Back to map"
          >
            ←
          </motion.button>
          <EleniCharacter pose="standing" size={60} animate={false} />
          <span className="text-2xl font-bold font-[Fredoka] text-amber-800">
            Lini&apos;s Library
          </span>
        </div>
        <MusicToggle className="w-10 h-10 text-lg" />
      </div>

      {/* Book grid */}
      <div className="max-w-lg mx-auto space-y-6 relative z-10">
        {BOOKS.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">📚</span>
            <p className="text-lg font-[Nunito] text-amber-700">
              Books coming soon!
            </p>
          </div>
        ) : (
          BOOKS.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.15, type: 'spring' }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push(`/library/${book.id}`)}
                className={`w-full rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br ${book.bgColor} text-left`}
              >
                {/* Cover image */}
                <div className="w-full aspect-[4/3] relative">
                  <img
                    src={getBookCoverPath(book)}
                    alt={book.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Info bar */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold font-[Fredoka] text-white block">
                      {book.title}
                    </span>
                    <span className="text-sm font-[Nunito] text-white/70">
                      by {book.author} · {book.pageCount} pages
                    </span>
                  </div>
                  <span className="text-3xl text-white/80">📖</span>
                </div>
              </motion.button>

              {/* Video reading card */}
              {book.videoUrl && (
                <a
                  href={book.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block w-full rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-indigo-500 to-purple-500 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
                      ▶️
                    </div>
                    <div>
                      <span className="text-sm font-bold font-[Fredoka] text-white block">
                        Watch the Author Read It
                      </span>
                      <span className="text-xs font-[Nunito] text-white/70">
                        Video reading by {book.author}
                      </span>
                    </div>
                  </div>
                </a>
              )}

              {/* Amazon link */}
              {book.amazonUrl && (
                <div className="text-center mt-2">
                  <a
                    href={book.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-[Nunito] text-amber-700 underline underline-offset-2 hover:text-amber-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📦 Get on Amazon
                  </a>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
