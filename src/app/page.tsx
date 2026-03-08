'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CoinCounter from '@/components/ui/CoinCounter';
import MusicToggle from '@/components/ui/MusicToggle';
import { useGameStore } from '@/lib/store';
import { unlockAudio } from '@/lib/audio';
import { WORLDS } from '@/lib/constants';

export default function HomePage() {
  const [showTitle, setShowTitle] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('titleSeen');
    }
    return true;
  });
  const router = useRouter();
  const { passportStamps, isWorldUnlocked, setCurrentWorld } = useGameStore();

  useEffect(() => {
    unlockAudio();
    setCurrentWorld(0);
  }, [setCurrentWorld]);

  const handleStart = () => {
    unlockAudio();
    sessionStorage.setItem('titleSeen', '1');
    setShowTitle(false);
  };

  if (showTitle) {
    return <TitleScreen onStart={handleStart} />;
  }

  return <WorldMap />;
}

function TitleScreen({ onStart }: { onStart: () => void }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background image - pointer-events-none so it never blocks clicks */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/images/generated/backgrounds/bg-home.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-pink-200/60 via-purple-100/40 to-blue-200/60" />
      </div>

      {/* Top-right controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <MusicToggle className="w-12 h-12 text-xl bg-white/70 backdrop-blur-sm" />
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/parent')}
          className="w-14 h-14 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg"
          aria-label="Settings"
        >
          {'\u2699\uFE0F'}
        </motion.button>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, type: 'spring' }}
          className="text-center mb-4"
        >
          <h1 className="text-5xl md:text-7xl font-bold font-[Fredoka] text-white drop-shadow-[0_3px_6px_rgba(219,39,119,0.6)]">
            Eleni&apos;s
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold font-[Fredoka] text-white drop-shadow-[0_3px_6px_rgba(147,51,234,0.6)]">
            Sound Safari
          </h2>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          <EleniCharacter pose="waving" size={250} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-lg text-white font-[Fredoka] mt-2 mb-6 drop-shadow-md"
        >
          A reading adventure!
        </motion.p>

        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: 'spring' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="game-button bg-gradient-to-r from-pink-500 to-purple-500 text-white text-2xl px-12 py-5 rounded-full shadow-xl animate-pulse-glow cursor-pointer"
        >
          <span className="text-3xl">{'\u25B6\uFE0F'}</span>
          <span className="font-[Fredoka]">Play!</span>
        </motion.button>

        <p className="text-xs text-white/60 mt-8">
          Tap to start the adventure
        </p>
      </div>
    </div>
  );
}

function WorldMap() {
  const router = useRouter();
  const { passportStamps, isWorldUnlocked } = useGameStore();

  return (
    <div className="min-h-screen px-4 py-6 relative overflow-hidden">
      {/* Background - pointer-events-none so it never blocks clicks */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="/images/generated/backgrounds/bg-home.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-100/60 via-green-50/50 to-amber-50/60" />
      </div>

      {/* Top bar with coins */}
      <div className="flex justify-between items-center mb-6 px-2 relative z-10">
        <div className="flex items-center gap-3">
          <EleniCharacter pose="standing" size={60} animate={false} />
          <span className="text-xl font-bold font-[Fredoka] text-purple-600">
            Sound Safari
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CoinCounter />
          <MusicToggle className="w-10 h-10 text-lg" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/parent')}
            className="w-12 h-12 rounded-full bg-white/60 flex items-center justify-center text-xl shadow-md"
            aria-label="Settings"
          >
            {'\u2699\uFE0F'}
          </motion.button>
        </div>
      </div>

      {/* World list - vertical path */}
      <div className="max-w-md mx-auto space-y-4 relative z-10">
        {WORLDS.map((world, index) => {
          const unlocked = isWorldUnlocked(world.id);
          const completed = passportStamps.includes(world.id);

          return (
            <motion.button
              key={world.id}
              initial={{ x: index % 2 === 0 ? -50 : 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                if (unlocked) {
                  router.push(`/world/${world.id}`);
                }
              }}
              disabled={!unlocked}
              className={`
                w-full rounded-3xl p-5 shadow-lg flex items-center gap-4 text-left
                transition-all duration-200
                ${unlocked
                  ? `bg-gradient-to-r ${world.bgGradient} hover:shadow-xl active:scale-[0.98]`
                  : 'bg-gray-200 opacity-60'
                }
                ${completed ? 'ring-4 ring-amber-400' : ''}
              `}
            >
              {/* World icon - big for tapping */}
              <div className={`
                w-20 h-20 rounded-2xl flex items-center justify-center text-4xl
                ${unlocked ? 'bg-white/30' : 'bg-gray-300/50'}
                shrink-0
              `}>
                {unlocked ? world.icon : '🔒'}
              </div>

              {/* World info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold font-[Fredoka] ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                    {world.name}
                  </span>
                  {completed && <span className="text-xl">🛂</span>}
                </div>
                <span className={`text-sm font-[Nunito] ${unlocked ? 'text-white/80' : 'text-gray-400'}`}>
                  {world.subtitle}
                </span>
                {/* Stars display */}
                {unlocked && (
                  <div className="flex gap-0.5 mt-1">
                    {world.games.map((_, i) => (
                      <span key={i} className="text-sm">
                        {i < (useGameStore.getState().worldProgress[world.id]?.gamesCompleted.length ?? 0)
                          ? '⭐'
                          : '☆'
                        }
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Arrow indicator */}
              {unlocked && (
                <div className="text-3xl text-white/80 shrink-0">
                  ▶
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Library button */}
      <div className="max-w-md mx-auto mt-6 relative z-10">
        <motion.button
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/library')}
          className="w-full rounded-3xl p-5 shadow-lg flex items-center gap-4 text-left bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-xl active:scale-[0.98] transition-all duration-200 ring-2 ring-white/40"
        >
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl bg-white/30 shrink-0">
            📚
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xl font-bold font-[Fredoka] text-white block">
              Lini&apos;s Library
            </span>
            <span className="text-sm font-[Nunito] text-white/80 block">
              Storytime!
            </span>
          </div>
          <div className="text-3xl text-white/80 shrink-0">▶</div>
        </motion.button>
      </div>

      {/* Parent link - small, unobtrusive */}
      <div className="text-center mt-8 relative z-10">
        <button
          onClick={() => router.push('/parent')}
          className="parent-text underline"
        >
          Parent Dashboard
        </button>
      </div>
    </div>
  );
}
