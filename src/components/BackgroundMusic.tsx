'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { startBackgroundMusic, stopBackgroundMusic, setMusicVolume } from '@/lib/audio';

export default function BackgroundMusic() {
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const volume = useGameStore((s) => s.volume);

  useEffect(() => {
    if (musicEnabled) {
      startBackgroundMusic();
    } else {
      stopBackgroundMusic();
    }
    return () => { stopBackgroundMusic(); };
  }, [musicEnabled]);

  useEffect(() => {
    setMusicVolume(volume);
  }, [volume]);

  return null;
}
