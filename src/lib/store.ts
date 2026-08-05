'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ContentPackId } from '@/content/types';
import { normalizeEnabledPackIds, updateEnabledPackIds } from '@/content/registry';
import { ALPHABET_PHONEMES, CORE_FOUNDATION_PHONEMES } from '@/content/progression';
import { REQUIRED_DIGRAPHS, REQUIRED_HEART_WORDS } from '@/content/learningIntegrity';
import type { ContentHistory } from './roundSelector';

export interface SessionEntry {
  date: string;
  world: number;
  game: string;
  correct: number;
  total: number;
  duration: number;
}

export interface WorldProgress {
  gamesCompleted: string[];
  bossCompleted: boolean;
  stars: number;
}

/** Per-sound attempt tracking — makes World 1 genuinely diagnostic and
 * lets later worlds prioritize shaky sounds. */
export interface SoundStat {
  correct: number;
  wrong: number;
}

interface GameState {
  currentWorld: number;
  worldProgress: Record<number, WorldProgress>;
  coins: number;
  companions: string[];
  costumes: string[];
  passportStamps: number[];
  masteredPhonemes: string[];
  taughtPhonemes: string[];
  masteredWords: string[];
  ownedItems: string[];
  soundStats: Record<string, SoundStat>;
  streakCount: number;
  sessionHistory: SessionEntry[];
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  musicVolume: number;
  freePlay: boolean;
  enabledContentPackIds: ContentPackId[];
  contentSeed: string;
  contentRunCounter: number;
  recentContentByGame: Record<string, ContentHistory>;

  setCurrentWorld: (world: number) => void;
  completeGame: (world: number, gameId: string) => void;
  completeBoss: (world: number) => void;
  addCoins: (amount: number) => void;
  addCompanion: (companion: string) => void;
  addCostume: (costume: string) => void;
  addPassportStamp: (world: number) => void;
  masterPhoneme: (phoneme: string) => void;
  teachPhoneme: (phoneme: string) => void;
  masterWord: (word: string) => void;
  recordSoundAttempt: (sound: string, correct: boolean) => void;
  getShakySounds: () => string[];
  /** Spend coins on a shop item. Returns false (no purchase) if she can't afford it. */
  buyItem: (id: string, price: number) => boolean;
  incrementStreak: () => void;
  resetStreak: () => void;
  addSession: (session: SessionEntry) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleFreePlay: () => void;
  setContentPackEnabled: (packId: ContentPackId, enabled: boolean) => void;
  beginContentRun: () => void;
  recordContentBatch: (gameId: string, targetIds: string[]) => void;
  isWorldUnlocked: (world: number) => boolean;
  isGameUnlocked: (world: number, gameIndex: number) => boolean;
  resetProgress: () => void;
}

const initialWorldProgress: Record<number, WorldProgress> = {
  1: { gamesCompleted: [], bossCompleted: false, stars: 0 },
  2: { gamesCompleted: [], bossCompleted: false, stars: 0 },
  3: { gamesCompleted: [], bossCompleted: false, stars: 0 },
  4: { gamesCompleted: [], bossCompleted: false, stars: 0 },
  5: { gamesCompleted: [], bossCompleted: false, stars: 0 },
  6: { gamesCompleted: [], bossCompleted: false, stars: 0 },
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentWorld: 0,
      worldProgress: { ...initialWorldProgress },
      coins: 0,
      companions: [],
      costumes: [],
      passportStamps: [],
      masteredPhonemes: [],
      taughtPhonemes: [...CORE_FOUNDATION_PHONEMES],
      masteredWords: [],
      ownedItems: [],
      soundStats: {},
      streakCount: 0,
      sessionHistory: [],
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.9,
      musicVolume: 0.08, // music sits well under Leni's voice by default
      freePlay: false,
      enabledContentPackIds: ['alphabet-adventure'],
      contentSeed: 'eleni-v2',
      contentRunCounter: 0,
      recentContentByGame: {},

      setCurrentWorld: (world) => set({ currentWorld: world }),

      completeGame: (world, gameId) =>
        set((state) => {
          const progress = { ...state.worldProgress };
          const wp = { ...progress[world] };
          if (!wp.gamesCompleted.includes(gameId)) {
            wp.gamesCompleted = [...wp.gamesCompleted, gameId];
            wp.stars = wp.stars + 1;
          }
          progress[world] = wp;
          return { worldProgress: progress };
        }),

      completeBoss: (world) =>
        set((state) => {
          const progress = { ...state.worldProgress };
          progress[world] = { ...progress[world], bossCompleted: true };
          return { worldProgress: progress };
        }),

      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),
      addCompanion: (companion) =>
        set((state) => ({
          companions: state.companions.includes(companion)
            ? state.companions
            : [...state.companions, companion],
        })),
      addCostume: (costume) =>
        set((state) => ({
          costumes: state.costumes.includes(costume)
            ? state.costumes
            : [...state.costumes, costume],
        })),
      addPassportStamp: (world) =>
        set((state) => ({
          passportStamps: state.passportStamps.includes(world)
            ? state.passportStamps
            : [...state.passportStamps, world],
        })),
      masterPhoneme: (phoneme) =>
        set((state) => ({
          masteredPhonemes: state.masteredPhonemes.includes(phoneme)
            ? state.masteredPhonemes
            : [...state.masteredPhonemes, phoneme],
        })),
      teachPhoneme: (phoneme) =>
        set((state) => ({
          taughtPhonemes: state.taughtPhonemes.includes(phoneme)
            ? state.taughtPhonemes
            : [...state.taughtPhonemes, phoneme],
        })),
      masterWord: (word) =>
        set((state) => ({
          masteredWords: state.masteredWords.includes(word)
            ? state.masteredWords
            : [...state.masteredWords, word],
        })),
      recordSoundAttempt: (sound, correct) =>
        set((state) => {
          const key = sound.toLowerCase();
          const prev = state.soundStats[key] || { correct: 0, wrong: 0 };
          return {
            soundStats: {
              ...state.soundStats,
              [key]: {
                correct: prev.correct + (correct ? 1 : 0),
                wrong: prev.wrong + (correct ? 0 : 1),
              },
            },
          };
        }),

      buyItem: (id, price) => {
        const { coins, ownedItems } = get();
        if (ownedItems.includes(id) || coins < price) return false;
        set({ coins: coins - price, ownedItems: [...ownedItems, id] });
        return true;
      },

      // Sounds with enough attempts but a low success rate — these get extra practice
      getShakySounds: () => {
        const stats = get().soundStats;
        return Object.entries(stats)
          .filter(([, s]) => {
            const total = s.correct + s.wrong;
            return total >= 3 && s.correct / total < 0.7;
          })
          .map(([sound]) => sound);
      },

      incrementStreak: () =>
        set((state) => ({ streakCount: state.streakCount + 1 })),
      resetStreak: () => set({ streakCount: 0 }),
      addSession: (session) =>
        set((state) => ({
          sessionHistory: [...state.sessionHistory, session],
        })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      // Leni's voice must always sit above the music: music is capped at 60%
      // of the voice volume, and lowering the voice pulls the music down too.
      setVolume: (volume) =>
        set((state) => ({
          volume,
          musicVolume: Math.min(state.musicVolume, volume * 0.6),
        })),
      setMusicVolume: (musicVolume) =>
        set((state) => ({ musicVolume: Math.min(musicVolume, state.volume * 0.6) })),
      toggleFreePlay: () => set((state) => ({ freePlay: !state.freePlay })),
      setContentPackEnabled: (packId, enabled) =>
        set((state) => ({
          enabledContentPackIds: updateEnabledPackIds(state.enabledContentPackIds, packId, enabled),
        })),
      beginContentRun: () =>
        set((state) => ({ contentRunCounter: state.contentRunCounter + 1 })),
      recordContentBatch: (gameId, targetIds) =>
        set((state) => {
          const previous = state.recentContentByGame[gameId] || { targetIds: [] };
          const keepNewest = (previousValues: string[], newValues: string[], limit: number) => [
            ...previousValues.filter((value) => !newValues.includes(value)),
            ...new Set(newValues),
          ].slice(-limit);
          return {
            recentContentByGame: {
              ...state.recentContentByGame,
              [gameId]: {
                targetIds: keepNewest(previous.targetIds, targetIds, 24),
              },
            },
          };
        }),

      isWorldUnlocked: (world) => {
        if (get().freePlay) return true;
        if (world === 1) return true;
        const prev = get().worldProgress[world - 1];
        return prev?.bossCompleted ?? false;
      },

      isGameUnlocked: (world, gameIndex) => {
        if (get().freePlay) return true;
        if (gameIndex === 0) return true;
        const wp = get().worldProgress[world];
        const completedCount = wp?.gamesCompleted.length ?? 0;
        return gameIndex <= completedCount;
      },

      resetProgress: () =>
        set({
          currentWorld: 0,
          worldProgress: { ...initialWorldProgress },
          coins: 0,
          companions: [],
          costumes: [],
          passportStamps: [],
          masteredPhonemes: [],
          taughtPhonemes: [...CORE_FOUNDATION_PHONEMES],
          masteredWords: [],
          ownedItems: [],
          soundStats: {},
          streakCount: 0,
          sessionHistory: [],
          enabledContentPackIds: ['alphabet-adventure'],
          contentRunCounter: 0,
          recentContentByGame: {},
        }),
    }),
    {
      name: 'eleni-sound-safari',
      version: 4,
      migrate: (persistedState, persistedVersion) => {
        const legacy = (persistedState || {}) as Partial<GameState>;
        const advanced = Boolean(
          legacy.worldProgress?.[2]?.gamesCompleted?.length ||
          legacy.worldProgress?.[2]?.bossCompleted ||
          legacy.worldProgress?.[3]?.gamesCompleted?.length ||
          legacy.worldProgress?.[3]?.bossCompleted ||
          legacy.worldProgress?.[4]?.gamesCompleted?.length ||
          (legacy.masteredWords?.length ?? 0) >= 6,
        );
        const previousPacks = legacy.enabledContentPackIds
          ? normalizeEnabledPackIds(legacy.enabledContentPackIds)
          : advanced
            ? (['continuous-bridge', 'cvc-grid', 'longer-words'] as ContentPackId[])
            : [];
        const migratedPacks = persistedVersion < 3
          ? normalizeEnabledPackIds(['alphabet-adventure', ...previousPacks])
          : previousPacks;
        const baseTaughtPhonemes = persistedVersion < 3
          ? advanced
            ? [...ALPHABET_PHONEMES]
            : [...new Set([...CORE_FOUNDATION_PHONEMES, ...(legacy.masteredPhonemes || [])])]
          : legacy.taughtPhonemes || [...CORE_FOUNDATION_PHONEMES];
        const world5Games = legacy.worldProgress?.[5]?.gamesCompleted || [];
        const hasWorld6Progress = Boolean(
          legacy.worldProgress?.[6]?.gamesCompleted?.length || legacy.worldProgress?.[6]?.bossCompleted,
        );
        const hasWorld5Progress = Boolean(world5Games.length || legacy.worldProgress?.[5]?.bossCompleted);
        const completedDigraphTeaching = Boolean(
          world5Games.some((gameId) => ['digraph-discovery', 'ruin-decoder', 'treasure-memory', 'souk-sentences'].includes(gameId)) ||
          legacy.worldProgress?.[5]?.bossCompleted ||
          hasWorld6Progress,
        );
        const completedHeartTeaching = Boolean(
          world5Games.some((gameId) => ['heart-word-map', 'treasure-memory', 'souk-sentences'].includes(gameId)) ||
          legacy.worldProgress?.[5]?.bossCompleted ||
          hasWorld6Progress,
        );
        const taughtPhonemes = persistedVersion < 4
          ? [...new Set([
              ...baseTaughtPhonemes,
              ...(hasWorld5Progress || hasWorld6Progress ? ALPHABET_PHONEMES : []),
              ...(completedDigraphTeaching ? REQUIRED_DIGRAPHS : []),
            ])]
          : baseTaughtPhonemes;
        const masteredWords = persistedVersion < 4 && completedHeartTeaching
          ? [...new Set([...(legacy.masteredWords || []), ...REQUIRED_HEART_WORDS])]
          : legacy.masteredWords || [];
        return {
          ...legacy,
          enabledContentPackIds: migratedPacks,
          taughtPhonemes,
          masteredWords,
          contentSeed: legacy.contentSeed || 'eleni-v2',
          contentRunCounter: legacy.contentRunCounter || 0,
          recentContentByGame: legacy.recentContentByGame || {},
        } as GameState;
      },
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
    }
  )
);
