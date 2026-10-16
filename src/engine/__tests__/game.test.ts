import { DIVIDEND_INTERVAL_DAYS, TICKS_PER_DAY } from '../config';
import { dividendPerShare, isDividendDay, nextDividendDay } from '../dividend';
import { createGame, type GameEvent, type GameState, migrateGame, submitOrder, tickGame, totalAssets } from '../game';
import { type GameMode } from '../modes';
import { buyCost } from '../portfolio';
import { STOCK_BY_ID } from '../stocks';

const ENDLESS: GameMode = { type: 'endless' };

function advance(game: GameState, ticks: number) {
  const events: GameEvent[] = [];
  let next = game;
  for (let i = 0; i < ticks; i++) {
    const step = tickGame(next);
    next = step.game;
    events.push(...step.events);
  }
  return { game: next, events };
}

/** 게임을 특정 거래일 장 시작 시점까지 빠르게 진행한다. */
function advanceToDay(game: GameState, day: number) {
  return advance(game, (day - game.market.day) * TICKS_PER_DAY - game.market.tick);
}

describe('dividend schedule', () => {
  it('pays every quarter', () => {
    expect(isDividendDay(0)).toBe(false);
    expect(isDividendDay(DIVIDEND_INTERVAL_DAYS)).toBe(true);
    expect(isDividendDay(DIVIDEND_INTERVAL_DAYS + 1)).toBe(false);
    expect(nextDividendDay(1)).toBe(DIVIDEND_INTERVAL_DAYS);
    expect(nextDividendDay(DIVIDEND_INTERVAL_DAYS)).toBe(DIVIDEND_INTERVAL_DAYS);
    expect(nextDividendDay(DIVIDEND_INTERVAL_DAYS + 1)).toBe(DIVIDEND_INTERVAL_DAYS * 2);
  });

  it('computes a quarter of the annual yield', () => {
    expect(dividendPerShare(STOCK_BY_ID.DHFG, 50_000)).toBe(625);
    expect(dividendPerShare(STOCK_BY_ID.NRCH, 10_000)).toBe(0);
  });
});

describe('tickGame', () => {
  it('fills market orders at the current price and records assets per day', () => {
    const game = createGame(123, 'normal', ENDLESS, 0);
    const price = game.market.stocks.HSIN.price;
    const { game: afterBuy, result } = submitOrder(game, {
      stockId: 'HSIN',
      side: 'buy',
      type: 'market',
      quantity: 5,
    });
    expect(result.ok).toBe(true);
    expect(afterBuy.portfolio.cash).toBe(game.startCash - buyCost(price, 5));

    const { game: later } = advance(afterBuy, TICKS_PER_DAY * 2);
    expect(later.assetHistory).toHaveLength(2);
    expect(later.assetHistory[1]).toBe(totalAssets(later));
  });

  it('fills a pending limit order during the day or cancels it at the close', () => {
    let game = createGame(77, 'hard', ENDLESS, 0);
    const stock = game.market.stocks.NRCH;
    // 현재가보다 한참 낮은 매수 주문은 대개 체결되지 않고 장 마감에 취소된다.
    const lowPrice = Math.ceil((stock.prevClose * 0.71) / 10) * 10;
    game = submitOrder(game, { stockId: 'NRCH', side: 'buy', type: 'limit', quantity: 1, limitPrice: lowPrice }).game;
    expect(game.portfolio.orders).toHaveLength(1);

    const { game: afterClose, events } = advance(game, TICKS_PER_DAY);
    expect(afterClose.portfolio.orders).toHaveLength(0);
    const filled = events.some((e) => e.type === 'filled');
    const expired = events.some((e) => e.type === 'expired');
    expect(filled !== expired).toBe(true);
  });

  it('pays dividends and applies the ex-dividend price on the dividend day', () => {
    let game = createGame(5, 'easy', ENDLESS, 0);
    game = advanceToDay(game, DIVIDEND_INTERVAL_DAYS).game;
    game = submitOrder(game, { stockId: 'PRNG', side: 'buy', type: 'market', quantity: 10 }).game;

    const { game: after, events } = advance(game, TICKS_PER_DAY);
    const close = after.market.stocks.PRNG.history.at(-1)!.close;
    const dps = dividendPerShare(STOCK_BY_ID.PRNG, close);
    expect(dps).toBeGreaterThan(0);

    const dividend = events.find((e) => e.type === 'dividend');
    expect(dividend).toBeDefined();
    expect(after.portfolio.dividends).toEqual([
      expect.objectContaining({ stockId: 'PRNG', quantity: 10, perShare: dps, gross: dps * 10 }),
    ]);
    // 배당락: 다음 날 기준가가 종가보다 대략 배당금만큼 낮다.
    expect(after.market.stocks.PRNG.prevClose).toBeLessThan(close);
    expect(Math.abs(close - dps - after.market.stocks.PRNG.prevClose)).toBeLessThanOrEqual(50);
  });
});

describe('migrateGame', () => {
  it('upgrades v1 saves through v2 to the current version', () => {
    const current = createGame(1, 'normal', ENDLESS, 0);
    const v1 = {
      ...current,
      version: 1,
      portfolio: {
        cash: 1_000,
        holdings: {},
        trades: [{ id: 3, day: 1, stockId: 'HNEL', side: 'buy', quantity: 1, price: 100 }],
      },
    };
    const migrated = migrateGame(JSON.parse(JSON.stringify(v1)))!;
    expect(migrated.version).toBe(current.version);
    expect(migrated.portfolio.orders).toEqual([]);
    expect(migrated.portfolio.dividends).toEqual([]);
    expect(migrated.portfolio.nextId).toBe(4);
    expect(migrated.portfolio.trades[0]).toMatchObject({ orderType: 'market', fee: 0, tax: 0 });
    expect(migrated.mode).toEqual({ type: 'endless' });
    expect(migrated.result).toBeNull();
    expect(migrated.market.news).toEqual([]);
  });

  it('rejects unknown saves', () => {
    expect(migrateGame({ version: 99 })).toBeNull();
    expect(migrateGame(null)).toBeNull();
  });
});
