import { selectTargets, shuffleSeeded } from './roundSelector';

type AttemptStat = { correct: number; wrong: number };

/** Success must be repeated; a single lucky answer does not raise difficulty. */
export function isReadyForWordChallenge(stat?: AttemptStat): boolean {
  return !!stat && stat.correct >= 3 && stat.correct / (stat.correct + stat.wrong) >= 0.8;
}

/** One-letter contrasts require reading beyond a familiar first letter. */
export function readingContrastScore(answer: string, alternative: string): number {
  if (answer.length !== alternative.length || answer === alternative) return 0;
  const differences = [...answer].filter((letter, index) => letter !== alternative[index]).length;
  return differences === 1 ? (answer[0] === alternative[0] ? 2 : 1) : 0;
}

/** New sounds first, up to two uncertain review sounds, then varied practice. */
export function selectLearningTargets<T>(
  items: readonly T[],
  options: {
    count: number;
    seed: string;
    recentIds?: string[];
    getId: (item: T) => string;
    isNew: (item: T) => boolean;
    needsPractice: (item: T) => boolean;
  },
): T[] {
  const selected = selectTargets(items.filter(options.isNew), options);
  const review = selectTargets(items.filter((item) => !options.isNew(item) && options.needsPractice(item)), {
    ...options, count: Math.min(2, Math.max(0, options.count - selected.length)),
    seed: `${options.seed}:review`,
  });
  selected.push(...review);
  const chosen = new Set(selected.map(options.getId));
  selected.push(...selectTargets(items.filter((item) => !chosen.has(options.getId(item)) && !options.needsPractice(item)), {
    ...options, count: Math.max(0, options.count - selected.length), seed: `${options.seed}:practice`,
  }));
  // If the whole pool is uncertain, keep a full session without duplicate items.
  const used = new Set(selected.map(options.getId));
  selected.push(...selectTargets(items.filter((item) => !used.has(options.getId(item))), {
    ...options, count: Math.max(0, options.count - selected.length), seed: `${options.seed}:fill`,
  }));
  return shuffleSeeded(selected, `${options.seed}:learning-order`);
}
