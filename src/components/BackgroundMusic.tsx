'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { startBackgroundMusic, stopBackgroundMusic, setMusicVolume } from '@/lib/audio';

function trackFor(world: number): string {
  return world >= 1 && world <= 6 ? `world-${world}` : 'menu';
}

export default function BackgroundMusic() {
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const musicVolume = useGameStore((s) => s.musicVolume);
  const currentWorld = useGameStore((s) => s.currentWorld);

  useEffect(() => {
    if (musicEnabled) {
      startBackgroundMusic(trackFor(currentWorld));
    } else {
      stopBackgroundMusic();
    }
    // No cleanup — startBackgroundMusic handles crossfading internally.
    // A cleanup here would race with the new track and null out its reference.
  }, [musicEnabled, currentWorld]);

  useEffect(() => {
    setMusicVolume(musicVolume);
  }, [musicVolume]);

  // The persisted settings hydrate AFTER first mount, and the effects above can
  // run with the defaults — leaving the audio engine on the wrong volume until
  // a slider is touched. Re-sync once hydration finishes (and immediately if
  // it already has).
  useEffect(() => {
    const sync = () => {
      const st = useGameStore.getState();
      setMusicVolume(st.musicVolume);
      if (st.musicEnabled) {
        startBackgroundMusic(trackFor(st.currentWorld));
      } else {
        stopBackgroundMusic();
      }
    };
    if (useGameStore.persist.hasHydrated()) sync();
    const unsub = useGameStore.persist.onFinishHydration(sync);
    return () => unsub();
  }, []);

  return null;
}
