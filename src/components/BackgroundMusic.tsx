'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { startBackgroundMusic, stopBackgroundMusic, setMusicVolume } from '@/lib/audio';

export default function BackgroundMusic() {
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const currentWorld = useGameStore((s) => s.currentWorld);

  useEffect(() => {
    if (musicEnabled) {
      // Play world-specific music, fall back to menu music
      const track = currentWorld >= 1 && currentWorld <= 6
        ? `world-${currentWorld}`
        : 'menu';
      startBackgroundMusic(track);
    } else {
      stopBackgroundMusic();
    }
    return () => { stopBackgroundMusic(); };
  }, [musicEnabled, currentWorld]);

  useEffect(() => {
    setMusicVolume(musicVolume);
  }, [musicVolume]);

  return null;
}
