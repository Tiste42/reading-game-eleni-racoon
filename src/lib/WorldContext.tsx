'use client';

import { createContext, useContext } from 'react';
import type { EleniCostume } from '@/components/eleni/EleniCharacter';

const WORLD_COSTUMES: Record<number, EleniCostume> = {
  1: 'sombrero',
  2: 'beret',
  3: 'sailor',
  4: 'knight',
  5: 'explorer',
  6: 'surfer',
};

const WorldContext = createContext<{ worldId: number; costume?: EleniCostume }>({
  worldId: 0,
});

export function WorldProvider({ worldId, children }: { worldId: number; children: React.ReactNode }) {
  return (
    <WorldContext.Provider value={{ worldId, costume: WORLD_COSTUMES[worldId] }}>
      {children}
    </WorldContext.Provider>
  );
}

export function useWorldContext() {
  return useContext(WorldContext);
}
