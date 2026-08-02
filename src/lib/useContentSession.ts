'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import { selectTargets } from './roundSelector';

interface Options<T> {
  gameId: string;
  candidates: readonly T[];
  count: number;
  getId: (item: T) => string;
}

export function useContentSession<T>({ gameId, candidates, count, getId }: Options<T>) {
  const seedBase = useGameStore((state) => state.contentSeed);
  const runCounter = useGameStore((state) => state.contentRunCounter);
  const history = useGameStore((state) => state.recentContentByGame[gameId]);
  const beginContentRun = useGameStore((state) => state.beginContentRun);
  const recordContentBatch = useGameStore((state) => state.recordContentBatch);
  const recorded = useRef(false);

  const [session] = useState(() => {
    const seed = `${seedBase}:${gameId}:${runCounter}`;
    const items = selectTargets(candidates, {
      count: Math.min(count, candidates.length),
      seed,
      recentIds: history?.targetIds,
      getId,
    });
    return { seed, items };
  });

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    beginContentRun();
    recordContentBatch(gameId, session.items.map(getId));
  }, [beginContentRun, gameId, getId, recordContentBatch, session.items]);

  return session;
}
