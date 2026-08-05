import type { ResolvedSoundGroup } from './registry';
import type { RhymeFamily } from './types';
import { canShareSoundChoices } from './phonemeConflicts';
import { canSharePictureChoices } from './pictureConflicts';

export interface RhymeCandidate {
  id: string;
  target: string;
  match: string;
  distractors: string[];
}

export interface SoundPictureCandidate {
  id: string;
  targetLetter: string;
  targetWords: string[];
  distractorWords: string[];
}

const rotate = <T>(items: T[], start: number): T[] => {
  if (items.length === 0) return [];
  const offset = ((start % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
};

const takeCompatible = (words: string[], selected: string[], count: number): string[] => {
  const result: string[] = [];
  for (const word of words) {
    if (selected.includes(word) || result.includes(word)) continue;
    if ([...selected, ...result].every((other) => canSharePictureChoices(word, other))) {
      result.push(word);
      if (result.length === count) break;
    }
  }
  return result;
};

export function buildRhymeCandidates(families: RhymeFamily[]): RhymeCandidate[] {
  return families.flatMap((family, familyIndex) => family.words.flatMap((target, wordIndex) => {
    const match = rotate(family.words, wordIndex + 1)
      .find((word) => word !== target && canSharePictureChoices(target, word));
    if (!match) return [];
    const otherFamilies = families.filter((entry) => entry.id !== family.id);
    const distractorPool = rotate(
      otherFamilies.flatMap((entry) => entry.words),
      familyIndex + wordIndex,
    );
    const distractors = takeCompatible(distractorPool, [target, match], 2);
    if (distractors.length < 2) return [];
    return {
      id: `${family.id}:${target}`,
      target,
      match,
      distractors,
    };
  }));
}

export function buildSoundPictureCandidates(
  groups: ResolvedSoundGroup[],
  targetCount: number,
  distractorCount: number,
  minimumTargets = 1,
): SoundPictureCandidate[] {
  const eligible = groups.filter((group) => group.words.length >= minimumTargets);
  return eligible.flatMap((group, groupIndex) => {
    const variants = Math.max(1, Math.ceil(group.words.length / Math.max(1, targetCount)));
    return Array.from({ length: variants }, (_, variant) => {
      const targetPool = rotate(group.words.map((word) => word.text), variant * targetCount);
      const targets = takeCompatible(targetPool, [], targetCount);
      if (targets.length < minimumTargets) return null;
      const otherGroups = groups.filter((entry) =>
        entry.id !== group.id &&
        entry.words.length > 0 &&
        canShareSoundChoices(group.phonemeId, entry.phonemeId),
      );
      const distractorPool = rotate(
        otherGroups.flatMap((entry) => entry.words.map((word) => word.text)),
        groupIndex + variant,
      );
      const distractors = takeCompatible(distractorPool, targets, distractorCount);
      if (distractors.length < distractorCount) return null;
      return {
        id: `${group.id}:set-${variant}`,
        targetLetter: group.phonemeId,
        targetWords: targets,
        distractorWords: distractors,
      };
    }).filter((round): round is SoundPictureCandidate => round !== null);
  });
}

export function findSoundGroup(
  groups: ResolvedSoundGroup[],
  phonemeId: string,
): ResolvedSoundGroup | undefined {
  return groups.find((group) => group.phonemeId === phonemeId);
}
