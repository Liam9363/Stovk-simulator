import { create } from 'zustand';

import { type Difficulty, type GameSpeed } from '@/engine/config';
import { createGame, type GameState, placeMarketOrder, tickGame } from '@/engine/game';
import { type OrderResult, type TradeSide } from '@/engine/portfolio';
import { randomSeed } from '@/engine/rng';

import { loadGame, saveGame } from './storage';

type GameStore = {
  /** 저장된 게임을 불러왔는지 여부 */
  hydrated: boolean;
  game: GameState | null;
  speed: GameSpeed;
  paused: boolean;

  hydrate: () => Promise<void>;
  startNewGame: (difficulty: Difficulty) => void;
  abandonGame: () => void;
  tick: () => void;
  order: (stockId: string, side: TradeSide, quantity: number) => OrderResult;
  setSpeed: (speed: GameSpeed) => void;
  setPaused: (paused: boolean) => void;
  save: () => void;
};

export const useGameStore = create<GameStore>((set, get) => ({
  hydrated: false,
  game: null,
  speed: 1,
  paused: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const game = await loadGame();
    set({ game, hydrated: true });
  },

  startNewGame: (difficulty) => {
    const game = createGame(randomSeed(), difficulty);
    set({ game, paused: false, speed: 1 });
    void saveGame(game);
  },

  abandonGame: () => {
    set({ game: null });
    void saveGame(null);
  },

  tick: () => {
    const { game } = get();
    if (!game) return;
    const { game: next, dayClosed } = tickGame(game);
    set({ game: next });
    if (dayClosed) void saveGame(next);
  },

  order: (stockId, side, quantity) => {
    const { game } = get();
    if (!game) throw new Error('No game in progress');
    const { game: next, result } = placeMarketOrder(game, stockId, side, quantity);
    if (result.ok) {
      set({ game: next });
      void saveGame(next);
    }
    return result;
  },

  setSpeed: (speed) => set({ speed, paused: false }),
  setPaused: (paused) => set({ paused }),
  save: () => void saveGame(get().game),
}));
