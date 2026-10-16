import { create } from 'zustand';

import { newlyUnlocked } from '@/engine/achievements';
import { type Difficulty, type GameSpeed } from '@/engine/config';
import { formatNumber, formatWon } from '@/engine/format';
import {
  cancelGameOrder,
  createGame,
  endGame,
  type GameEvent,
  type GameState,
  submitOrder,
  tickGame,
} from '@/engine/game';
import { getStockDef } from '@/engine/market';
import { type GameMode } from '@/engine/modes';
import { effectWeight, type NewsItem } from '@/engine/news';
import { type OrderRequest, type OrderResult } from '@/engine/portfolio';
import { addRecord, buildRecord } from '@/engine/records';
import { randomSeed } from '@/engine/rng';
import { type TutorialStep } from '@/engine/tutorial';

import { clearAll, EMPTY_PROFILE, loadGame, loadProfile, type Profile, saveGame, saveProfile } from './storage';

export type Notice = { id: number; message: string };

type GameStore = {
  /** 저장된 데이터를 불러왔는지 여부 */
  hydrated: boolean;
  game: GameState | null;
  profile: Profile;
  speed: GameSpeed;
  paused: boolean;
  /** 화면 하단에 잠깐 띄우는 알림 (지정가 체결, 배당, 뉴스, 업적 등) */
  notice: Notice | null;
  /** 방금 끝난 게임의 기록 id. 결과 화면으로 이동한 뒤 비운다. */
  finishedRecordId: number | null;

  hydrate: () => Promise<void>;
  /** 새 게임 시작. `withTutorial`이면 시간을 멈추고 튜토리얼을 처음부터 진행한다. */
  startNewGame: (difficulty: Difficulty, mode: GameMode, withTutorial?: boolean) => void;
  /** 진행 중인 게임을 직접 끝내고 기록을 남긴다. */
  quitGame: () => void;
  tick: () => void;
  order: (request: OrderRequest) => OrderResult;
  cancelOrder: (orderId: number) => void;
  setSpeed: (speed: GameSpeed) => void;
  setPaused: (paused: boolean) => void;
  dismissNotice: () => void;
  clearFinished: () => void;
  setTutorialStep: (step: TutorialStep) => void;
  /** 튜토리얼 종료 (완료 또는 건너뛰기) */
  endTutorial: () => void;
  resetAll: () => Promise<void>;
  save: () => void;
};

let noticeId = 0;

export const useGameStore = create<GameStore>((set, get) => {
  /** 업적 확인 → 게임 종료 처리 → 상태·저장 반영을 한곳에서 한다. */
  const commit = (game: GameState, messages: string[], persist: boolean) => {
    let profile = get().profile;

    const unlocked = newlyUnlocked(game, profile.achievements);
    if (unlocked.length > 0) {
      const achievements = { ...profile.achievements };
      for (const a of unlocked) achievements[a.id] = { at: Date.now(), gameId: game.startedAt };
      profile = { ...profile, achievements };
      messages.push(...unlocked.map((a) => `🏆 업적 달성: ${a.title}`));
    }

    const notice = messages.length > 0 ? { id: ++noticeId, message: messages.join('\n') } : get().notice;

    if (game.result) {
      profile = { ...profile, records: addRecord(profile.records, buildRecord(game)) };
      set({ game: null, profile, notice, finishedRecordId: game.startedAt, paused: false });
      void saveGame(null);
      void saveProfile(profile);
      return;
    }

    set({ game, profile, notice });
    if (persist) void saveGame(game);
    if (unlocked.length > 0) void saveProfile(profile);
  };

  return {
    hydrated: false,
    game: null,
    profile: EMPTY_PROFILE,
    speed: 1,
    paused: false,
    notice: null,
    finishedRecordId: null,

    hydrate: async () => {
      if (get().hydrated) return;
      const [game, profile] = await Promise.all([loadGame(), loadProfile()]);
      set({ game, profile, hydrated: true });
    },

    startNewGame: (difficulty, mode, withTutorial = false) => {
      const game = createGame(randomSeed(), difficulty, mode);
      const profile: Profile = { ...get().profile, tutorial: withTutorial ? 'pick_stock' : null };
      set({ game, profile, paused: withTutorial, speed: 1, notice: null, finishedRecordId: null });
      void saveGame(game);
      void saveProfile(profile);
    },

    quitGame: () => {
      const { game } = get();
      if (!game) return;
      commit(endGame(game, 'quit'), [], true);
    },

    tick: () => {
      const { game } = get();
      if (!game) return;
      const { game: next, dayClosed, events } = tickGame(game);
      if (events.length === 0 && !dayClosed) {
        set({ game: next });
        return;
      }
      // 업적 판정은 비용이 있어 장 마감·이벤트가 있을 때만 한다.
      commit(next, describeEvents(events, next), dayClosed || events.some((e) => e.type !== 'news'));
    },

    order: (request) => {
      const { game } = get();
      if (!game) throw new Error('No game in progress');
      const { game: next, result } = submitOrder(game, request);
      if (result.ok) commit(next, result.trade ? [] : ['지정가 주문이 접수됐어요.'], true);
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
    clearFinished: () => set({ finishedRecordId: null }),

    setTutorialStep: (step) => {
      const profile = { ...get().profile, tutorial: step };
      set({ profile });
      void saveProfile(profile);
    },

    endTutorial: () => {
      const profile = { ...get().profile, tutorial: null, tutorialDone: true };
      set({ profile });
      void saveProfile(profile);
    },

    resetAll: async () => {
      await clearAll();
      set({ game: null, profile: EMPTY_PROFILE, notice: null, finishedRecordId: null });
    },

    save: () => {
      // 게임이 없을 때 빈 상태로 덮어쓰지 않는다 (삭제는 quit/reset에서만).
      const { game } = get();
      if (game) void saveGame(game);
    },
  };
});

/** 알림을 띄울 만한 뉴스: 대형 이벤트, 또는 보유 종목·업종에 관한 뉴스. */
function isNotableNews(item: NewsItem, game: GameState): boolean {
  if (item.major) return true;
  if (item.scope === 'market') return false;
  return Object.keys(game.portfolio.holdings).some((id) => effectWeight(item, getStockDef(id)) !== 0);
}

/** 이번 틱의 이벤트를 알림 문구 목록으로 만든다. */
function describeEvents(events: GameEvent[], game: GameState): string[] {
  const lines: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'filled': {
        const { trade } = event;
        lines.push(
          `${getStockDef(trade.stockId).name} ${formatNumber(trade.quantity)}주 ` +
            `${trade.side === 'buy' ? '매수' : '매도'} 체결 (${formatWon(trade.price)})`,
        );
        break;
      }
      case 'expired':
        lines.push(`장 마감으로 미체결 주문 ${event.orders.length}건이 취소됐어요.`);
        break;
      case 'dividend': {
        const net = event.records.reduce((sum, r) => sum + r.gross - r.tax, 0);
        lines.push(`배당금 ${formatWon(net)}이 입금됐어요. (세후)`);
        break;
      }
      case 'news':
        for (const item of event.items) {
          if (isNotableNews(item, game)) lines.push(`📰 ${item.headline}`);
        }
        break;
      case 'ended':
        break;
    }
  }
  return lines;
}
