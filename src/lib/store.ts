'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

  setCurrentWorld: (world: number) => void;
  completeGame: (world: number, gameId: string) => void;
  completeBoss: (world: number) => void;
  addCoins: (amount: number) => void;
  addCompanion: (companion: string) => void;
  addCostume: (costume: string) => void;
  addPassportStamp: (world: number) => void;
  masterPhoneme: (phoneme: string) => void;
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
          masteredWords: [],
          ownedItems: [],
          soundStats: {},
          streakCount: 0,
          sessionHistory: [],
        }),
    }),
    {
      name: 'eleni-sound-safari',
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
