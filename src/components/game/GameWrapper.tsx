'use client';

import { useEffect } from 'react';
import { stopSpeaking } from '@/lib/speech';

interface Props {
  gameId: string;
  children: React.ReactNode;
}

export default function GameWrapper({ gameId, children }: Props) {
  useEffect(() => {
    return () => { stopSpeaking(); };
  }, [gameId]);

  return <>{children}</>;
}
