/** 한 판의 게임 상태와 진행. UI·저장소와 무관한 순수 함수로 구성한다. */
import { DIFFICULTIES, type Difficulty } from './config';
import { dividendPerShare, isDividendDay } from './dividend';
import { advanceTick, createMarket, getStockDef, type MarketState } from './market';
import {
  cancelOrder,
  createPortfolio,
  type DividendRecord,
  expireOrders,
  type OrderRequest,
  type OrderResult,
  type PendingOrder,
  type Portfolio,
  payDividends,
  placeOrder,
  processLimitOrders,
  summarizePortfolio,
  type Trade,
} from './portfolio';

export const SAVE_VERSION = 2;

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

export type GameEvent =
  | { type: 'filled'; trade: Trade }
  | { type: 'expired'; orders: PendingOrder[] }
  | { type: 'dividend'; records: DividendRecord[] };

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

export type TickResult = { game: GameState; dayClosed: boolean; events: GameEvent[] };

/**
 * 한 틱 진행. 순서: 시세 갱신 → 지정가 체결 → (장 마감 시) 미체결 취소 → 배당 지급 → 총자산 기록.
 */
export function tickGame(game: GameState): TickResult {
  const closedDay = game.market.day;
  const market = advanceTick(game.market);
  const dayClosed = market.day !== closedDay;
  const events: GameEvent[] = [];

  // 장이 마감됐다면 배당락 전 종가로 체결 여부를 판단한다.
  const priceOf = (id: string) =>
    dayClosed ? market.stocks[id].history[market.stocks[id].history.length - 1].close : market.stocks[id].price;

  let portfolio = game.portfolio;
  if (portfolio.orders.length > 0) {
    const result = processLimitOrders(portfolio, priceOf, closedDay);
    portfolio = result.portfolio;
    for (const trade of result.filled) events.push({ type: 'filled', trade });
  }

  if (dayClosed) {
    const expired = expireOrders(portfolio);
    portfolio = expired.portfolio;
    if (expired.expired.length > 0) events.push({ type: 'expired', orders: expired.expired });

    if (isDividendDay(closedDay)) {
      const dividends = payDividends(
        portfolio,
        (id) => dividendPerShare(getStockDef(id), priceOf(id)),
        closedDay,
      );
      portfolio = dividends.portfolio;
      if (dividends.paid.length > 0) events.push({ type: 'dividend', records: dividends.paid });
    }
  }

  const next: GameState = { ...game, market, portfolio };
  if (dayClosed) {
    next.assetHistory = [...game.assetHistory, totalAssets(next)];
  }
  return { game: next, dayClosed, events };
}

export function submitOrder(
  game: GameState,
  request: OrderRequest,
): { game: GameState; result: OrderResult } {
  const stock = game.market.stocks[request.stockId];
  const result = placeOrder(game.portfolio, request, stock.price, stock.prevClose, game.market.day);
  return { game: result.ok ? { ...game, portfolio: result.portfolio } : game, result };
}

export function cancelGameOrder(
  game: GameState,
  orderId: number,
): { game: GameState; result: OrderResult } {
  const result = cancelOrder(game.portfolio, orderId);
  return { game: result.ok ? { ...game, portfolio: result.portfolio } : game, result };
}

export function totalAssets(game: GameState): number {
  return summarizePortfolio(game.portfolio, game.market).totalAssets;
}

export function totalReturnRate(game: GameState): number {
  return totalAssets(game) / game.startCash - 1;
}

type LegacyTrade = Omit<Trade, 'orderType' | 'fee' | 'tax'> & Partial<Trade>;

/** 이전 버전 세이브를 현재 형식으로 바꾼다. 지원하지 않는 버전이면 null. */
export function migrateGame(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const game = raw as GameState;
  if (game.version === SAVE_VERSION) return game;
  if (game.version === 1) {
    const legacy = game.portfolio as Portfolio & { trades: LegacyTrade[] };
    const trades: Trade[] = legacy.trades.map((t) => ({
      ...t,
      orderType: t.orderType ?? 'market',
      fee: t.fee ?? 0,
      tax: t.tax ?? 0,
    }));
    const lastId = trades.length > 0 ? trades[trades.length - 1].id : 0;
    return {
      ...game,
      version: SAVE_VERSION,
      portfolio: { ...legacy, trades, orders: [], dividends: [], nextId: lastId + 1 },
    };
  }
  return null;
}
