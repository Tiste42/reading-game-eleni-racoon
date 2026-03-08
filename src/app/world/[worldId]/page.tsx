'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import EleniCharacter from '@/components/eleni/EleniCharacter';
import CoinCounter from '@/components/ui/CoinCounter';
import MusicToggle from '@/components/ui/MusicToggle';
import { useGameStore } from '@/lib/store';
import { useHydrated } from '@/lib/useHydrated';
import { WORLDS } from '@/lib/constants';
import { WorldProvider } from '@/lib/WorldContext';
import { WORLD_BACKGROUNDS } from '@/lib/worldBackgrounds';

export default function WorldHubPage() {
  const params = useParams();
  const router = useRouter();
  const hydrated = useHydrated();
  const worldId = Number(params.worldId);
  const world = WORLDS.find((w) => w.id === worldId);
  const { worldProgress, isGameUnlocked, isWorldUnlocked, freePlay, setCurrentWorld } = useGameStore();

  useEffect(() => {
    setCurrentWorld(worldId);
  }, [worldId, setCurrentWorld]);

  if (!world) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">World not found</p>
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className={`min-h-screen bg-gradient-to-b ${world.bgGradient}`} />
    );
  }

  if (!isWorldUnlocked(worldId)) {
    router.push('/');
    return null;
  }

  const progress = worldProgress[worldId];
  const completedGames = progress?.gamesCompleted ?? [];

  const bgImage = WORLD_BACKGROUNDS[worldId];

  return (
    <WorldProvider worldId={worldId}>
    <div className="min-h-screen px-4 py-6 relative overflow-hidden">
      {/* World background image */}
      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={bgImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
        </div>
      )}
      {/* Fallback gradient if no image */}
      {!bgImage && (
        <div className={`absolute inset-0 z-0 pointer-events-none bg-gradient-to-b ${world.bgGradient}`} />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/')}
            className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-2xl shadow-md"
            aria-label="Back to map"
          >
            {'\u25C0'}
          </motion.button>
          <div className="flex items-center gap-2">
            <CoinCounter />
            <MusicToggle className="w-10 h-10 text-lg bg-white/30 backdrop-blur-sm" />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/parent')}
              className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-xl shadow-md"
              aria-label="Settings"
            >
              {'\u2699\uFE0F'}
            </motion.button>
          </div>
        </div>

        {/* World title with Eleni in costume */}
        <div className="text-center mb-6">
          <EleniCharacter pose="excited" size={140} />
          <h1 className="text-3xl font-bold font-[Fredoka] text-white drop-shadow-lg mt-2">
            {world.icon} {world.name}
          </h1>
          <p className="text-white/80 font-[Nunito] text-sm">{world.subtitle}</p>
        </div>

      {/* Game grid - big buttons, icon-driven */}
      <div className="max-w-md mx-auto grid grid-cols-2 gap-4">
        {world.games.map((game, index) => {
          const unlocked = isGameUnlocked(worldId, index);
          const completed = completedGames.includes(game.id);

          return (
            <motion.button
              key={game.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.08, type: 'spring' }}
              whileTap={unlocked ? { scale: 0.93 } : undefined}
              onClick={() => {
                if (unlocked) {
                  router.push(`/world/${worldId}/${game.id}`);
                }
              }}
              disabled={!unlocked}
              className={`
                rounded-3xl p-4 min-h-[120px] flex flex-col items-center justify-center gap-2 shadow-lg
                transition-all
                ${unlocked
                  ? 'bg-white/90 hover:bg-white active:shadow-md'
                  : 'bg-white/30 opacity-50'
                }
                ${completed ? 'ring-3 ring-amber-400' : ''}
              `}
            >
              <span className="text-4xl">
                {unlocked ? game.icon : '🔒'}
              </span>
              {completed && (
                <span className="text-lg">⭐</span>
              )}
              {/* Game name only shown to parents / as aria label */}
              <span className="sr-only">{game.name}</span>
              <span className="text-xs text-gray-500 font-[Nunito] text-center leading-tight">
                {unlocked ? game.name : ''}
              </span>
            </motion.button>
          );
        })}

        {/* Boss level */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
          whileTap={freePlay || completedGames.length >= world.games.length ? { scale: 0.93 } : undefined}
          onClick={() => {
            if (freePlay || completedGames.length >= world.games.length) {
              router.push(`/world/${worldId}/${world.bossGame.id}`);
            }
          }}
          disabled={!freePlay && completedGames.length < world.games.length}
          className={`
            col-span-2 rounded-3xl p-5 flex items-center justify-center gap-3 shadow-lg
            ${freePlay || completedGames.length >= world.games.length
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 animate-pulse-glow'
              : 'bg-white/30 opacity-50'
            }
            ${progress?.bossCompleted ? 'ring-4 ring-yellow-300' : ''}
          `}
        >
          <span className="text-4xl">{world.bossGame.icon}</span>
          <span className="text-xl font-bold font-[Fredoka] text-white drop-shadow">
            {freePlay || completedGames.length >= world.games.length ? world.bossGame.name : '\uD83D\uDD12'}
          </span>
          {progress?.bossCompleted && <span className="text-2xl">🏆</span>}
        </motion.button>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto mt-6">
        <div className="bg-white/30 rounded-full h-4 overflow-hidden">
          <motion.div
            className="bg-white h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedGames.length / world.games.length) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1 px-1">
          <span className="text-xs text-white/70">{completedGames.length}/{world.games.length} games</span>
          {progress?.bossCompleted && <span className="text-xs text-white/70">Complete! 🎉</span>}
        </div>
      </div>
      </div>
    </div>
    </WorldProvider>
  );
}
