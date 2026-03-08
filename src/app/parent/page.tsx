'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/store';
import { WORLDS } from '@/lib/constants';

export default function ParentDashboard() {
  const router = useRouter();
  const {
    worldProgress,
    coins,
    masteredPhonemes,
    masteredWords,
    sessionHistory,
    freePlay,
    soundEnabled,
    musicEnabled,
    volume,
    musicVolume,
    toggleFreePlay,
    toggleSound,
    toggleMusic,
    setVolume,
    setMusicVolume,
    resetProgress,
  } = useGameStore();

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalStars = Object.values(worldProgress).reduce((sum, wp) => sum + wp.stars, 0);
  const totalGames = Object.values(worldProgress).reduce(
    (sum, wp) => sum + wp.gamesCompleted.length,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/')}
            className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl"
          >
            {'<'}
          </button>
          <h1 className="text-xl font-bold font-[Fredoka] text-gray-700">
            Parent Dashboard
          </h1>
          <div className="w-12" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{totalStars}</p>
            <p className="text-xs text-gray-500">Stars</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-500">{totalGames}</p>
            <p className="text-xs text-gray-500">Games Done</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-pink-500">{coins}</p>
            <p className="text-xs text-gray-500">Coins</p>
          </div>
        </div>

        {/* Skills mastered */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="font-bold text-gray-700 mb-2">Phonemes Mastered</h3>
          <div className="flex flex-wrap gap-2">
            {masteredPhonemes.length === 0 && (
              <span className="text-sm text-gray-400">None yet</span>
            )}
            {masteredPhonemes.map((p) => (
              <span
                key={p}
                className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold lowercase"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="font-bold text-gray-700 mb-2">Words Mastered</h3>
          <div className="flex flex-wrap gap-2">
            {masteredWords.length === 0 && (
              <span className="text-sm text-gray-400">None yet</span>
            )}
            {masteredWords.map((w) => (
              <span
                key={w}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold lowercase"
              >
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* World progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="font-bold text-gray-700 mb-3">World Progress</h3>
          {WORLDS.map((world) => {
            const wp = worldProgress[world.id];
            const pct = wp
              ? Math.round(
                  ((wp.gamesCompleted.length + (wp.bossCompleted ? 1 : 0)) /
                    (world.games.length + 1)) *
                    100
                )
              : 0;
            return (
              <div key={world.id} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {world.icon} {world.name}
                  </span>
                  <span className="text-gray-500">{pct}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-pink-400 to-purple-400 h-full rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <h3 className="font-bold text-gray-700 mb-3">Settings</h3>

          {/* Free Play Toggle */}
          <ToggleRow
            label="Free Play Mode"
            sublabel="Unlock all worlds and games"
            enabled={freePlay}
            onToggle={toggleFreePlay}
          />

          {/* Sound Toggle */}
          <ToggleRow
            label="Sound Effects"
            enabled={soundEnabled}
            onToggle={toggleSound}
          />

          {/* Music Toggle */}
          <ToggleRow
            label="Background Music"
            enabled={musicEnabled}
            onToggle={toggleMusic}
          />

          {/* Voice Volume */}
          <div className="py-3 border-b border-gray-100">
            <div className="flex justify-between mb-2">
              <p className="font-semibold text-gray-700">Voice Volume</p>
              <span className="text-sm text-gray-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Music Volume */}
          <div className="py-3 border-b border-gray-100">
            <div className="flex justify-between mb-2">
              <p className="font-semibold text-gray-700">Music Volume</p>
              <span className="text-sm text-gray-400">{Math.round(musicVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Reset */}
          <div className="py-3">
            {showResetConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetProgress();
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold text-sm"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="text-red-400 text-sm font-semibold"
              >
                Reset All Progress
              </button>
            )}
          </div>
        </div>

        {/* Session history */}
        {sessionHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
            <h3 className="font-bold text-gray-700 mb-3">Recent Sessions</h3>
            {sessionHistory.slice(-5).reverse().map((s, i) => (
              <div key={i} className="text-sm text-gray-600 py-1 border-b border-gray-50 last:border-0">
                World {s.world} - {s.game}: {s.correct}/{s.total} correct
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  sublabel,
  enabled,
  onToggle,
}: {
  label: string;
  sublabel?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <div>
        <p className="font-semibold text-gray-700">{label}</p>
        {sublabel && (
          <p className="text-xs text-gray-400">{sublabel}</p>
        )}
      </div>
      <button
        onClick={onToggle}
        className={`w-14 h-8 rounded-full transition-colors relative ${
          enabled ? 'bg-green-400' : 'bg-gray-300'
        }`}
      >
        <motion.div
          className="w-6 h-6 bg-white rounded-full absolute top-1 shadow-sm"
          animate={{ left: enabled ? 28 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
