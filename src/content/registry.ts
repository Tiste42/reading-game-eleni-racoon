import { CORE_PACK } from './packs/core';
import { ALPHABET_ADVENTURE_PACK } from './packs/alphabet';
import { CONTINUOUS_BRIDGE_PACK, CVC_GRID_PACK, LONGER_WORDS_PACK } from './packs/v2';
import type {
  ContentActivity,
  ContentPack,
  ContentPackId,
  ContentWord,
  InitialSoundGroup,
  LetterExample,
  PostcardRound,
  RhymeFamily,
  StoryRound,
  SyllableWord,
  WordChain,
} from './types';

export const CONTENT_PACKS: ContentPack[] = [
  CORE_PACK,
  ALPHABET_ADVENTURE_PACK,
  CONTINUOUS_BRIDGE_PACK,
  CVC_GRID_PACK,
  LONGER_WORDS_PACK,
];

export const OPTIONAL_CONTENT_PACKS = CONTENT_PACKS.filter((pack) => pack.optional);
export const OPTIONAL_CONTENT_PACK_IDS = OPTIONAL_CONTENT_PACKS.map((pack) => pack.id);

const allWords = CONTENT_PACKS.flatMap((pack) => pack.words);
const wordById = new Map(allWords.map((word) => [word.id, word]));

export function normalizeEnabledPackIds(ids: readonly string[]): ContentPackId[] {
  const valid = new Set<ContentPackId>(OPTIONAL_CONTENT_PACK_IDS);
  const selected = new Set(ids.filter((id): id is ContentPackId => valid.has(id as ContentPackId)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const pack of OPTIONAL_CONTENT_PACKS) {
      if (!selected.has(pack.id)) continue;
      for (const required of pack.requiredPackIds) {
        if (required !== 'core' && !selected.has(required)) {
          selected.add(required);
          changed = true;
        }
      }
    }
  }
  return OPTIONAL_CONTENT_PACK_IDS.filter((id) => selected.has(id));
}

export function updateEnabledPackIds(
  ids: string[],
  packId: ContentPackId,
  enabled: boolean,
): ContentPackId[] {
  const selected = new Set(normalizeEnabledPackIds(ids));
  if (enabled) {
    selected.add(packId);
    return normalizeEnabledPackIds([...selected]);
  }

  selected.delete(packId);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pack of OPTIONAL_CONTENT_PACKS) {
      if (selected.has(pack.id) && pack.requiredPackIds.some((required) => required !== 'core' && !selected.has(required))) {
        selected.delete(pack.id);
        changed = true;
      }
    }
  }
  return OPTIONAL_CONTENT_PACK_IDS.filter((id) => selected.has(id));
}

export function getEnabledPacks(optionalIds: readonly string[]): ContentPack[] {
  const selected = new Set(normalizeEnabledPackIds(optionalIds));
  return CONTENT_PACKS.filter((pack) => !pack.optional || selected.has(pack.id));
}

export function getWord(id: string): ContentWord {
  const entry = wordById.get(id);
  if (!entry) throw new Error(`Unknown content word: ${id}`);
  return entry;
}

export function getWordsForActivity(
  optionalIds: readonly string[],
  activity: ContentActivity,
  allowedPhonemes?: ReadonlySet<string>,
): ContentWord[] {
  const byText = new Map<string, ContentWord>();
  for (const pack of getEnabledPacks(optionalIds)) {
    for (const entry of pack.words) {
      if (
        entry.activities.includes(activity) &&
        (!allowedPhonemes || entry.units.every((unit) => allowedPhonemes.has(unit.phonemeId)))
      ) byText.set(entry.text, entry);
    }
  }
  return [...byText.values()];
}

export interface ResolvedSoundGroup extends Omit<InitialSoundGroup, 'wordIds'> {
  words: ContentWord[];
}

export function getInitialSoundGroups(
  optionalIds: readonly string[],
  allowedPhonemes?: ReadonlySet<string>,
): ResolvedSoundGroup[] {
  return getEnabledPacks(optionalIds).flatMap((pack) =>
    pack.initialSoundGroups.filter((group) => !allowedPhonemes || allowedPhonemes.has(group.phonemeId)).map((group) => ({
      ...group,
      words: group.wordIds.map(getWord),
    })),
  );
}

export function getLetterExamples(optionalIds: readonly string[]): LetterExample[] {
  const byLetter = new Map<string, LetterExample>();
  for (const pack of getEnabledPacks(optionalIds)) {
    for (const example of pack.letterExamples) byLetter.set(example.letter, example);
  }
  return [...byLetter.values()];
}

export function getRhymeFamilies(optionalIds: readonly string[]): RhymeFamily[] {
  return getEnabledPacks(optionalIds).flatMap((pack) => pack.rhymeFamilies);
}

export function getSyllableWords(optionalIds: readonly string[]): SyllableWord[] {
  const byWord = new Map<string, SyllableWord>();
  for (const pack of getEnabledPacks(optionalIds)) {
    for (const entry of pack.syllableWords) byWord.set(entry.word, entry);
  }
  return [...byWord.values()];
}

export interface ResolvedWordChain extends Omit<WordChain, 'fromWordId' | 'toWordId'> {
  from: ContentWord;
  to: ContentWord;
}

export function getWordChains(optionalIds: readonly string[]): ResolvedWordChain[] {
  return getEnabledPacks(optionalIds).flatMap((pack) =>
    pack.wordChains.map((chain) => ({
      ...chain,
      from: getWord(chain.fromWordId),
      to: getWord(chain.toWordId),
    })),
  );
}

export function getStories(optionalIds: readonly string[]): StoryRound[] {
  return getEnabledPacks(optionalIds).flatMap((pack) => pack.stories);
}

export function getPostcards(optionalIds: readonly string[]): PostcardRound[] {
  return getEnabledPacks(optionalIds).flatMap((pack) => pack.postcards);
}

const earlyPictureWords = CONTENT_PACKS.flatMap((pack) => [
  ...pack.letterExamples.map((entry) => entry.word),
  ...pack.rhymeFamilies.flatMap((family) => family.words),
  ...pack.syllableWords.map((entry) => entry.word),
]);

export const CONTENT_AUDIO_WORDS = [...new Set([
  ...allWords.map((entry) => entry.text),
  ...earlyPictureWords,
])];

export const CONTENT_SYLLABLE_CLIPS = CONTENT_PACKS.flatMap((pack) => pack.syllableWords);

export const CONTENT_NARRATION_PHRASES = [...new Set(CONTENT_PACKS.flatMap((pack) => [
  ...pack.stories.flatMap((story) => [story.question, ...story.options.filter((option) => option.trim().includes(' '))]),
  ...pack.postcards.map((postcard) => postcard.spoken),
]))];

const narrationSlug = (text: string) => text.toLowerCase().trim()
  .replace(/[^a-z0-9 ]/g, '')
  .replace(/\s+/g, '-');

export const CONTENT_NARRATION_SLUGS = CONTENT_NARRATION_PHRASES.map(narrationSlug);
