import { createGame, placeMarketOrder, tickGame, totalAssets } from '../game';
import { TICKS_PER_DAY } from '../config';
import { buyMarket, createPortfolio, maxBuyQuantity, sellMarket } from '../portfolio';

describe('buyMarket', () => {
  it('deducts cash and averages the purchase price', () => {
    const first = buyMarket(createPortfolio(1_000_000), 'HNEL', 10, 50_000, 1);
    if (!first.ok) throw new Error(first.error);
    expect(first.portfolio.cash).toBe(500_000);

    const second = buyMarket(first.portfolio, 'HNEL', 10, 40_000, 2);
    if (!second.ok) throw new Error(second.error);
    expect(second.portfolio.cash).toBe(100_000);
    expect(second.portfolio.holdings.HNEL).toEqual({ quantity: 20, avgPrice: 45_000 });
    expect(second.portfolio.trades.map((t) => t.id)).toEqual([1, 2]);
  });

  it('rejects orders larger than available cash', () => {
    const result = buyMarket(createPortfolio(100_000), 'HNEL', 3, 50_000, 1);
    expect(result).toEqual({ ok: false, error: 'insufficient_cash' });
  });

  it.each([0, -1, 1.5, NaN])('rejects invalid quantity %p', (quantity) => {
    const result = buyMarket(createPortfolio(100_000), 'HNEL', quantity, 1_000, 1);
    expect(result).toEqual({ ok: false, error: 'invalid_quantity' });
  });
});

describe('sellMarket', () => {
  const bought = buyMarket(createPortfolio(1_000_000), 'HNEL', 10, 50_000, 1);
  if (!bought.ok) throw new Error('setup failed');

  it('adds proceeds and records realized PnL', () => {
    const result = sellMarket(bought.portfolio, 'HNEL', 4, 60_000, 2);
    if (!result.ok) throw new Error(result.error);
    expect(result.portfolio.cash).toBe(500_000 + 240_000);
    expect(result.portfolio.holdings.HNEL).toEqual({ quantity: 6, avgPrice: 50_000 });
    expect(result.trade.realizedPnl).toBe(40_000);
  });

  it('removes the holding when fully sold', () => {
    const result = sellMarket(bought.portfolio, 'HNEL', 10, 45_000, 2);
    if (!result.ok) throw new Error(result.error);
    expect(result.portfolio.holdings.HNEL).toBeUndefined();
    expect(result.trade.realizedPnl).toBe(-50_000);
  });

  it('rejects selling more than held', () => {
    expect(sellMarket(bought.portfolio, 'HNEL', 11, 50_000, 2)).toEqual({
      ok: false,
      error: 'insufficient_shares',
    });
    expect(sellMarket(bought.portfolio, 'BTSF', 1, 50_000, 2)).toEqual({
      ok: false,
      error: 'insufficient_shares',
    });
  });
});

describe('maxBuyQuantity', () => {
  it('floors to whole shares', () => {
    expect(maxBuyQuantity(1_000_000, 72_000)).toBe(13);
    expect(maxBuyQuantity(0, 72_000)).toBe(0);
  });
});

describe('game flow', () => {
  it('fills market orders at the current price and tracks assets per day', () => {
    let game = createGame(123, 'normal', 0);
    const price = game.market.stocks.HSIN.price;
    const { game: afterBuy, result } = placeMarketOrder(game, 'HSIN', 'buy', 5);
    expect(result.ok).toBe(true);
    expect(afterBuy.portfolio.cash).toBe(game.startCash - price * 5);
    expect(totalAssets(afterBuy)).toBe(game.startCash);

    game = afterBuy;
    let closed = 0;
    for (let i = 0; i < TICKS_PER_DAY * 2; i++) {
      const step = tickGame(game);
      game = step.game;
      if (step.dayClosed) closed += 1;
    }
    expect(closed).toBe(2);
    expect(game.assetHistory).toHaveLength(2);
    expect(game.assetHistory[1]).toBe(totalAssets(game));
  });

  it('leaves the game unchanged when an order fails', () => {
    const game = createGame(1, 'hard', 0);
    const { game: after, result } = placeMarketOrder(game, 'MSFD', 'buy', 1_000);
    expect(result.ok).toBe(false);
    expect(after).toBe(game);
  });
});
