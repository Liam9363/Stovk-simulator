import { create } from 'zustand';

import { type Difficulty, type GameSpeed } from '@/engine/config';
import { formatNumber, formatWon } from '@/engine/format';
import {
  cancelGameOrder,
  createGame,
  type GameEvent,
  type GameState,
  submitOrder,
  tickGame,
} from '@/engine/game';
import { getStockDef } from '@/engine/market';
import { type OrderRequest, type OrderResult } from '@/engine/portfolio';
import { randomSeed } from '@/engine/rng';

import { loadGame, saveGame } from './storage';

export type Notice = { id: number; message: string };

type GameStore = {
  /** 저장된 게임을 불러왔는지 여부 */
  hydrated: boolean;
  game: GameState | null;
  speed: GameSpeed;
  paused: boolean;
  /** 화면 상단에 잠깐 띄우는 알림 (지정가 체결, 배당 등) */
  notice: Notice | null;

  hydrate: () => Promise<void>;
  startNewGame: (difficulty: Difficulty) => void;
  abandonGame: () => void;
  tick: () => void;
  order: (request: OrderRequest) => OrderResult;
  cancelOrder: (orderId: number) => void;
  setSpeed: (speed: GameSpeed) => void;
  setPaused: (paused: boolean) => void;
  dismissNotice: () => void;
  save: () => void;
};

let noticeId = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  hydrated: false,
  game: null,
  speed: 1,
  paused: false,
  notice: null,

  hydrate: async () => {
    if (get().hydrated) return;
    const game = await loadGame();
    set({ game, hydrated: true });
  },

  startNewGame: (difficulty) => {
    const game = createGame(randomSeed(), difficulty);
    set({ game, paused: false, speed: 1, notice: null });
    void saveGame(game);
  },

  abandonGame: () => {
    set({ game: null, notice: null });
    void saveGame(null);
  },

  tick: () => {
    const { game } = get();
    if (!game) return;
    const { game: next, dayClosed, events } = tickGame(game);
    const message = describeEvents(events);
    set(message ? { game: next, notice: { id: ++noticeId, message } } : { game: next });
    if (dayClosed || events.length > 0) void saveGame(next);
  },

  order: (request) => {
    const { game } = get();
    if (!game) throw new Error('No game in progress');
    const { game: next, result } = submitOrder(game, request);
    if (result.ok) {
      set({ game: next });
      void saveGame(next);
    }
    return result;
  },

  cancelOrder: (orderId) => {
    const { game } = get();
    if (!game) return;
    const { game: next, result } = cancelGameOrder(game, orderId);
    if (result.ok) {
      set({ game: next });
      void saveGame(next);
    }
  },

  setSpeed: (speed) => set({ speed, paused: false }),
  setPaused: (paused) => set({ paused }),
  dismissNotice: () => set({ notice: null }),
  save: () => void saveGame(get().game),
}));

/** 이번 틱의 이벤트를 한 줄 알림 문구로 만든다. 알릴 것이 없으면 null. */
function describeEvents(events: GameEvent[]): string | null {
  const lines: string[] = [];
  for (const event of events) {
    if (event.type === 'filled') {
      const { trade } = event;
      lines.push(
        `${getStockDef(trade.stockId).name} ${formatNumber(trade.quantity)}주 ` +
          `${trade.side === 'buy' ? '매수' : '매도'} 체결 (${formatWon(trade.price)})`,
      );
    } else if (event.type === 'expired') {
      lines.push(`장 마감으로 미체결 주문 ${event.orders.length}건이 취소됐어요.`);
    } else {
      const net = event.records.reduce((sum, r) => sum + r.gross - r.tax, 0);
      lines.push(`배당금 ${formatWon(net)}이 입금됐어요. (세후)`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : null;
}
