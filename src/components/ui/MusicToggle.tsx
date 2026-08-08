'use client';

import { useGameStore } from '@/lib/store';
import { startBackgroundMusic, stopBackgroundMusic } from '@/lib/audio';

export default function MusicToggle({ className = '' }: { className?: string }) {
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const toggleMusic = useGameStore((s) => s.toggleMusic);
  const currentWorld = useGameStore((s) => s.currentWorld);

  const handleToggle = () => {
    // Start inside the trusted tap. On iPhone/iPad, waiting for the React
    // effect can move play() outside the gesture and leave the toggle silent.
    if (musicEnabled) {
      stopBackgroundMusic();
    } else {
      startBackgroundMusic(currentWorld >= 1 && currentWorld <= 6 ? `world-${currentWorld}` : 'menu');
    }
    toggleMusic();
  };

  return (
    <button
      onClick={handleToggle}
      className={`rounded-full bg-white/60 flex items-center justify-center shadow-md relative ${className}`}
      aria-label={musicEnabled ? 'Turn off music' : 'Turn on music'}
    >
      <span>{'\u{1F3B5}'}</span>
      {!musicEnabled && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-[70%] h-0.5 bg-red-500 rotate-45 rounded-full" />
        </span>
      )}
    </button>
  );
}
