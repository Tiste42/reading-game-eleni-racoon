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

interface GameState {
  currentWorld: number;
  worldProgress: Record<number, WorldProgress>;
  coins: number;
  companions: string[];
  costumes: string[];
  passportStamps: number[];
  masteredPhonemes: string[];
  masteredWords: string[];
  streakCount: number;
  sessionHistory: SessionEntry[];
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
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
  incrementStreak: () => void;
  resetStreak: () => void;
  addSession: (session: SessionEntry) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
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
      currentWorld: 1,
      worldProgress: { ...initialWorldProgress },
      coins: 0,
      companions: [],
      costumes: [],
      passportStamps: [],
      masteredPhonemes: [],
      masteredWords: [],
      streakCount: 0,
      sessionHistory: [],
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.8,
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
      incrementStreak: () =>
        set((state) => ({ streakCount: state.streakCount + 1 })),
      resetStreak: () => set({ streakCount: 0 }),
      addSession: (session) =>
        set((state) => ({
          sessionHistory: [...state.sessionHistory, session],
        })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      setVolume: (volume) => set({ volume }),
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
          currentWorld: 1,
          worldProgress: { ...initialWorldProgress },
          coins: 0,
          companions: [],
          costumes: [],
          passportStamps: [],
          masteredPhonemes: [],
          masteredWords: [],
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
