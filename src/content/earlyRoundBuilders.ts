import type { ResolvedSoundGroup } from './registry';
import type { RhymeFamily } from './types';
import { canShareSoundChoices } from './phonemeConflicts';

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

const cycle = <T>(items: T[], start: number, count: number): T[] => {
  if (items.length === 0) return [];
  return Array.from({ length: Math.min(count, items.length) }, (_, index) => items[(start + index) % items.length]);
};

export function buildRhymeCandidates(families: RhymeFamily[]): RhymeCandidate[] {
  return families.flatMap((family, familyIndex) => family.words.map((target, wordIndex) => {
    const match = family.words[(wordIndex + 1) % family.words.length];
    const otherFamilies = families.filter((entry) => entry.id !== family.id);
    const distractors = cycle(otherFamilies, familyIndex + wordIndex, 2)
      .map((entry, index) => entry.words[(wordIndex + index) % entry.words.length]);
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
      const targets = cycle(group.words, variant * targetCount, targetCount).map((word) => word.text);
      const otherGroups = groups.filter((entry) =>
        entry.id !== group.id &&
        entry.words.length > 0 &&
        canShareSoundChoices(group.phonemeId, entry.phonemeId),
      );
      const distractors = cycle(otherGroups, groupIndex + variant, distractorCount)
        .map((entry, index) => entry.words[(groupIndex + variant + index) % entry.words.length].text);
      return {
        id: `${group.id}:set-${variant}`,
        targetLetter: group.phonemeId,
        targetWords: targets,
        distractorWords: distractors,
      };
    });
  });
}

export function findSoundGroup(
  groups: ResolvedSoundGroup[],
  phonemeId: string,
): ResolvedSoundGroup | undefined {
  return groups.find((group) => group.phonemeId === phonemeId);
}
