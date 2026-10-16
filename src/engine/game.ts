/** 한 판의 게임 상태와 진행. UI·저장소와 무관한 순수 함수로 구성한다. */
import { DIFFICULTIES, type Difficulty } from './config';
import { advanceTick, createMarket, type MarketState } from './market';
import {
  buyMarket,
  createPortfolio,
  type OrderResult,
  type Portfolio,
  sellMarket,
  summarizePortfolio,
  type TradeSide,
} from './portfolio';

export const SAVE_VERSION = 1;

export type GameState = {
  version: number;
  seed: number;
  difficulty: Difficulty;
  startCash: number;
  market: MarketState;
  portfolio: Portfolio;
  /** 거래일 마감 시점의 총자산 기록 (1일차 마감부터) */
  assetHistory: number[];
  startedAt: number;
};

export function createGame(seed: number, difficulty: Difficulty, now = Date.now()): GameState {
  const startCash = DIFFICULTIES[difficulty].startCash;
  return {
    version: SAVE_VERSION,
    seed,
    difficulty,
    startCash,
    market: createMarket(seed, difficulty),
    portfolio: createPortfolio(startCash),
    assetHistory: [],
    startedAt: now,
  };
}

export type TickResult = { game: GameState; dayClosed: boolean };

/** 한 틱 진행. 장이 마감되면 총자산을 기록한다. */
export function tickGame(game: GameState): TickResult {
  const market = advanceTick(game.market);
  const dayClosed = market.day !== game.market.day;
  const next = { ...game, market };
  if (dayClosed) {
    next.assetHistory = [...game.assetHistory, totalAssets(next)];
  }
  return { game: next, dayClosed };
}

export function placeMarketOrder(
  game: GameState,
  stockId: string,
  side: TradeSide,
  quantity: number,
): { game: GameState; result: OrderResult } {
  const price = game.market.stocks[stockId].price;
  const order = side === 'buy' ? buyMarket : sellMarket;
  const result = order(game.portfolio, stockId, quantity, price, game.market.day);
  return { game: result.ok ? { ...game, portfolio: result.portfolio } : game, result };
}

export function totalAssets(game: GameState): number {
  return summarizePortfolio(game.portfolio, game.market).totalAssets;
}

export function totalReturnRate(game: GameState): number {
  return totalAssets(game) / game.startCash - 1;
}
