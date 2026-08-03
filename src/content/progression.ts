import type { ContentPackId, ContentWord } from './types';

export const CORE_FOUNDATION_PHONEMES = ['s', 'a', 't', 'p', 'i', 'n', 'e', 'l'] as const;
export const ALPHABET_PHONEMES = 'abcdefghijklmnopqrstuvwxyz'.split('');

export function getPracticedPhonemes(
  enabledPackIds: readonly ContentPackId[],
  taughtPhonemes: readonly string[],
): Set<string> {
  const allowed = new Set<string>(CORE_FOUNDATION_PHONEMES);
  if (enabledPackIds.includes('alphabet-adventure')) {
    for (const phoneme of taughtPhonemes) allowed.add(phoneme);
  }
  return allowed;
}

export function isWordDecodable(word: ContentWord, allowedPhonemes: ReadonlySet<string>): boolean {
  return word.units.every((unit) => allowedPhonemes.has(unit.phonemeId));
}
