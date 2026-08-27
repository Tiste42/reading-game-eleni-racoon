'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from './store';
import { selectTargets } from './roundSelector';

interface Options<T> {
  gameId: string;
  historyKey?: string;
  candidates: readonly T[];
  count: number;
  getId: (item: T) => string;
  selectItems?: (
    candidates: readonly T[],
    options: { count: number; seed: string; recentIds?: string[]; getId: (item: T) => string },
  ) => T[];
}

export function useContentSession<T>({
  gameId,
  historyKey = gameId,
  candidates,
  count,
  getId,
  selectItems = selectTargets,
}: Options<T>) {
  const seedBase = useGameStore((state) => state.contentSeed);
  const runCounter = useGameStore((state) => state.contentRunCounter);
  const history = useGameStore((state) => state.recentContentByGame[historyKey]);
  const beginContentRun = useGameStore((state) => state.beginContentRun);
  const recordContentBatch = useGameStore((state) => state.recordContentBatch);
  const recorded = useRef(false);

  const [session] = useState(() => {
    const seed = `${seedBase}:${gameId}:${runCounter}`;
    const items = selectItems(candidates, {
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
    recordContentBatch(historyKey, session.items.map(getId));
  }, [beginContentRun, getId, historyKey, recordContentBatch, session.items]);

  return session;
}
