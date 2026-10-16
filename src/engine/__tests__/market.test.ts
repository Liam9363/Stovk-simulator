import { TICKS_PER_DAY, WARMUP_DAYS } from '../config';
import { isOnTick, priceLimits } from '../krx';
import { advanceTick, createMarket, marketIndex, type MarketState } from '../market';
import { STOCKS } from '../stocks';

function advanceDays(market: MarketState, days: number): MarketState {
  let next = market;
  for (let i = 0; i < days * TICKS_PER_DAY; i++) next = advanceTick(next);
  return next;
}

describe('createMarket', () => {
  it('starts on day 1 with warmup history for every stock', () => {
    const market = createMarket(42, 'normal');
    expect(market.day).toBe(1);
    expect(market.tick).toBe(0);
    expect(market.indexHistory).toHaveLength(WARMUP_DAYS);
    for (const def of STOCKS) {
      expect(market.stocks[def.id].history).toHaveLength(WARMUP_DAYS);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = advanceDays(createMarket(7, 'hard'), 3);
    const b = advanceDays(createMarket(7, 'hard'), 3);
    expect(a).toEqual(b);
  });

  it('differs between seeds', () => {
    const a = createMarket(1, 'normal');
    const b = createMarket(2, 'normal');
    expect(a.stocks.HNEL.price).not.toBe(b.stocks.HNEL.price);
  });
});

describe('advanceTick', () => {
  it('does not mutate the previous state', () => {
    const market = createMarket(3, 'normal');
    const snapshot = JSON.stringify(market);
    advanceDays(market, 2);
    expect(JSON.stringify(market)).toBe(snapshot);
  });

  it('closes the day after TICKS_PER_DAY ticks', () => {
    const market = createMarket(5, 'normal');
    const next = advanceDays(market, 1);
    expect(next.day).toBe(2);
    expect(next.tick).toBe(0);
    expect(next.stocks.HNEL.history).toHaveLength(WARMUP_DAYS + 1);
    expect(next.stocks.HNEL.prevClose).toBe(next.stocks.HNEL.history.at(-1)!.close);
  });

  it('keeps prices on ticks and within daily limits', () => {
    let market = createMarket(11, 'hard');
    for (let i = 0; i < 30 * TICKS_PER_DAY; i++) {
      market = advanceTick(market);
      for (const def of STOCKS) {
        const stock = market.stocks[def.id];
        const { upper, lower } = priceLimits(stock.prevClose);
        expect(isOnTick(stock.price)).toBe(true);
        expect(stock.price).toBeLessThanOrEqual(upper);
        expect(stock.price).toBeGreaterThanOrEqual(lower);
      }
    }
  });

  it('records intraday prices for the current day', () => {
    let market = createMarket(9, 'easy');
    for (let i = 0; i < 10; i++) market = advanceTick(market);
    expect(market.stocks.BTSF.intraday).toHaveLength(11);
    expect(market.stocks.BTSF.intraday.at(-1)).toBe(market.stocks.BTSF.price);
    expect(market.indexIntraday).toHaveLength(11);
    expect(market.indexIntraday.at(-1)).toBeCloseTo(marketIndex(market));
  });

  it('resets intraday series at the close', () => {
    const next = advanceDays(createMarket(9, 'easy'), 1);
    expect(next.stocks.BTSF.intraday).toEqual([next.stocks.BTSF.price]);
    expect(next.indexIntraday).toEqual([next.indexHistory.at(-1)]);
  });
});
