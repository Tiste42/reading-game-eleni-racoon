'use client';

import { useGameStore } from '@/lib/store';

export default function MusicToggle({ className = '' }: { className?: string }) {
  const musicEnabled = useGameStore((s) => s.musicEnabled);
  const toggleMusic = useGameStore((s) => s.toggleMusic);

  return (
    <button
      onClick={toggleMusic}
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
