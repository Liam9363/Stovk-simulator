/** 한 판의 게임 상태와 진행. UI·저장소와 무관한 순수 함수로 구성한다. */
import { DIFFICULTIES, type Difficulty } from './config';
import { dividendPerShare, isDividendDay } from './dividend';
import { advanceTick, createMarket, getStockDef, type MarketState } from './market';
import {
  calcGrade,
  checkGameEnd,
  type GameMode,
  type GameOutcome,
  type Grade,
} from './modes';
import { type NewsItem } from './news';
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

export const SAVE_VERSION = 3;

export type GameResult = {
  outcome: GameOutcome;
  grade: Grade;
  finalAssets: number;
  returnRate: number;
  /** 마감까지 마친 거래일 수 */
  daysPlayed: number;
  endedAt: number;
};

export type GameFlags = {
  /** 게임 중 폭락장 이벤트가 처음 발생한 날 */
  crashDay: number | null;
  /** 게임 중 가장 낮았던 수익률 (일 마감 기준) */
  lowestReturn: number;
};

export type GameState = {
  version: number;
  seed: number;
  difficulty: Difficulty;
  mode: GameMode;
  startCash: number;
  market: MarketState;
  portfolio: Portfolio;
  /** 거래일 마감 시점의 총자산 기록 (1일차 마감부터) */
  assetHistory: number[];
  flags: GameFlags;
  /** 게임이 끝나면 채워진다. 끝난 게임은 더 진행되지 않는다. */
  result: GameResult | null;
  startedAt: number;
};

export type GameEvent =
  | { type: 'filled'; trade: Trade }
  | { type: 'expired'; orders: PendingOrder[] }
  | { type: 'dividend'; records: DividendRecord[] }
  | { type: 'news'; items: NewsItem[] }
  | { type: 'ended'; result: GameResult };

export function createGame(
  seed: number,
  difficulty: Difficulty,
  mode: GameMode,
  now = Date.now(),
): GameState {
  const startCash = DIFFICULTIES[difficulty].startCash;
  return {
    version: SAVE_VERSION,
    seed,
    difficulty,
    mode,
    startCash,
    market: createMarket(seed, difficulty),
    portfolio: createPortfolio(startCash),
    assetHistory: [],
    flags: { crashDay: null, lowestReturn: 0 },
    result: null,
    startedAt: now,
  };
}

export type TickResult = { game: GameState; dayClosed: boolean; events: GameEvent[] };

/**
 * 한 틱 진행. 순서: 시세 갱신 → 지정가 체결 → (장 마감 시) 미체결 취소 → 배당 지급
 * → 총자산 기록 → 종료 판정. 이미 끝난 게임은 그대로 돌려준다.
 */
export function tickGame(game: GameState, now = Date.now()): TickResult {
  if (game.result) return { game, dayClosed: false, events: [] };

  const closedDay = game.market.day;
  const market = advanceTick(game.market);
  const dayClosed = market.day !== closedDay;
  const events: GameEvent[] = [];

  const freshNews = market.news.filter((item) => item.id >= game.market.nextNewsId);
  if (freshNews.length > 0) events.push({ type: 'news', items: freshNews });

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

  let next: GameState = { ...game, market, portfolio };

  const crash = freshNews.find((item) => item.major && item.sentiment === 'bad');
  if (crash && next.flags.crashDay === null) {
    next.flags = { ...next.flags, crashDay: crash.day };
  }

  const assets = totalAssets(next);
  if (dayClosed) {
    next.assetHistory = [...game.assetHistory, assets];
    const returnRate = assets / game.startCash - 1;
    if (returnRate < next.flags.lowestReturn) {
      next.flags = { ...next.flags, lowestReturn: returnRate };
    }
  }

  const outcome = checkGameEnd(next.mode, assets, next.startCash, dayClosed ? closedDay : null);
  if (outcome) {
    next = endGame(next, outcome, now);
    events.push({ type: 'ended', result: next.result! });
  }
  return { game: next, dayClosed, events };
}

/** 게임을 끝내고 결과를 계산한다. 이미 끝났으면 그대로 돌려준다. */
export function endGame(game: GameState, outcome: GameOutcome, now = Date.now()): GameState {
  if (game.result) return game;
  // 미체결 주문은 정리하고 끝낸다.
  const portfolio = expireOrders(game.portfolio).portfolio;
  const finished = { ...game, portfolio };
  const finalAssets = totalAssets(finished);
  const returnRate = finalAssets / game.startCash - 1;
  const daysPlayed =
    game.mode.type === 'period' && outcome === 'completed' ? game.mode.days : Math.max(0, game.market.day - 1);
  return {
    ...finished,
    result: {
      outcome,
      grade: calcGrade(game.mode, outcome, returnRate, daysPlayed),
      finalAssets,
      returnRate,
      daysPlayed,
      endedAt: now,
    },
  };
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
  let game = raw as GameState;
  if (game.version === 1) {
    const legacy = game.portfolio as Portfolio & { trades: LegacyTrade[] };
    const trades: Trade[] = legacy.trades.map((t) => ({
      ...t,
      orderType: t.orderType ?? 'market',
      fee: t.fee ?? 0,
      tax: t.tax ?? 0,
    }));
    const lastId = trades.length > 0 ? trades[trades.length - 1].id : 0;
    game = {
      ...game,
      version: 2,
      portfolio: { ...legacy, trades, orders: [], dividends: [], nextId: lastId + 1 },
    };
  }
  if (game.version === 2) {
    // v3: 게임 모드·뉴스·결과 추가. 이전 게임은 무한 모드로 이어간다.
    game = {
      ...game,
      version: 3,
      mode: { type: 'endless' },
      flags: { crashDay: null, lowestReturn: 0 },
      result: null,
      market: { ...game.market, news: [], effects: [], nextNewsId: 1 },
    };
  }
  return game.version === SAVE_VERSION ? game : null;
}
