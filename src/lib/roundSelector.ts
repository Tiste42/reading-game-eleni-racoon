export interface ContentHistory {
  targetIds: string[];
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded<T>(items: readonly T[], seed: string | number): T[] {
  const result = [...items];
  const random = mulberry32(typeof seed === 'number' ? seed : hashString(seed));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectTargets<T>(
  items: readonly T[],
  options: { count: number; seed: string; recentIds?: string[]; getId: (item: T) => string },
): T[] {
  const { count, seed, recentIds = [], getId } = options;
  if (items.length <= count) return shuffleSeeded(items, seed);

  const recentRank = new Map(recentIds.map((id, index) => [id, index]));
  const fresh = shuffleSeeded(items.filter((item) => !recentRank.has(getId(item))), `${seed}:fresh`);
  const neededFromHistory = Math.max(0, count - fresh.length);
  const oldestEligible = items
    .filter((item) => recentRank.has(getId(item)))
    .sort((left, right) => (recentRank.get(getId(left)) ?? 0) - (recentRank.get(getId(right)) ?? 0))
    .slice(0, neededFromHistory);
  return shuffleSeeded([...fresh.slice(0, count), ...oldestEligible], `${seed}:selected`).slice(0, count);
}

export function buildChoiceSet<T>(
  answer: T,
  pool: readonly T[],
  options: {
    count: number;
    seed: string;
    answerIndex: number;
    getId: (item: T) => string;
    canUseDistractor?: (answer: T, distractor: T) => boolean;
  },
): T[] {
  const { count, seed, answerIndex, getId, canUseDistractor = () => true } = options;
  const answerId = getId(answer);
  const distractors = shuffleSeeded(
    pool.filter((item) => getId(item) !== answerId && canUseDistractor(answer, item)),
    `${seed}:distractors`,
  ).slice(0, Math.max(0, count - 1));
  const choices = [...distractors];
  choices.splice(Math.min(answerIndex, choices.length), 0, answer);
  return choices;
}

/**
 * Uses every answer position once per cycle, but shuffles the order for each
 * content session. That prevents a learnable left-middle-right pattern while
 * keeping answer placement balanced.
 */
export function getBalancedAnswerIndex(
  round: number,
  choiceCount: number,
  seed: string,
): number {
  if (choiceCount <= 1) return 0;
  const cycle = Math.floor(round / choiceCount);
  const positions = shuffleSeeded(
    Array.from({ length: choiceCount }, (_, index) => index),
    `${seed}:answer-positions:${cycle}`,
  );
  return positions[round % choiceCount];
}

export function buildAssessmentChoiceSet<T>(
  answer: T,
  pool: readonly T[],
  options: {
    count?: number;
    round: number;
    seed: string;
    getId: (item: T) => string;
    canUseDistractor?: (answer: T, distractor: T) => boolean;
  },
): T[] {
  const choiceCount = Math.min(options.count ?? 3, pool.length);
  return buildChoiceSet(answer, pool, {
    count: choiceCount,
    seed: `${options.seed}:${options.round}:choices`,
    answerIndex: getBalancedAnswerIndex(options.round, choiceCount, options.seed),
    getId: options.getId,
    canUseDistractor: options.canUseDistractor,
  });
}
