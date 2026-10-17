import {
  availableCash,
  availableShares,
  buyCost,
  calcFee,
  calcSellTax,
  cancelOrder,
  createPortfolio,
  expireOrders,
  maxBuyQuantity,
  type OrderRequest,
  payDividends,
  placeOrder,
  type Portfolio,
  processLimitOrders,
  sellProceeds,
  tradingTotals,
} from '../portfolio';

const DAY = 1;

function market(stockId: string, side: OrderRequest['side'], quantity: number): OrderRequest {
  return { stockId, side, type: 'market', quantity };
}

function limit(
  stockId: string,
  side: OrderRequest['side'],
  quantity: number,
  limitPrice: number,
): OrderRequest {
  return { stockId, side, type: 'limit', quantity, limitPrice };
}

/** 성공을 기대하는 주문 헬퍼. prevClose는 현재가와 같다고 둔다. */
function place(portfolio: Portfolio, request: OrderRequest, price: number, prevClose = price) {
  const result = placeOrder(portfolio, request, price, prevClose, DAY);
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe('fees and taxes', () => {
  it('floors fee (0.015%) and sell tax (0.18%) to whole won', () => {
    expect(calcFee(500_000)).toBe(75);
    expect(calcFee(6_000)).toBe(0);
    expect(calcSellTax(500_000)).toBe(900);
    expect(buyCost(50_000, 10)).toBe(500_075);
    expect(sellProceeds(50_000, 10)).toBe(500_000 - 75 - 900);
  });

  it('maxBuyQuantity accounts for the fee', () => {
    // 10주 = 500,075원 → 500,074원으로는 9주만 가능
    expect(maxBuyQuantity(500_074, 50_000)).toBe(9);
    expect(maxBuyQuantity(500_075, 50_000)).toBe(10);
    expect(maxBuyQuantity(0, 50_000)).toBe(0);
  });
});

describe('market orders', () => {
  it('buys with fee and averages the purchase price excluding fees', () => {
    const first = place(createPortfolio(1_000_000), market('HNEL', 'buy', 10), 50_000);
    expect(first.portfolio.cash).toBe(1_000_000 - 500_075);
    expect(first.trade).toMatchObject({ orderType: 'market', fee: 75, tax: 0 });

    const second = place(first.portfolio, market('HNEL', 'buy', 10), 40_000);
    expect(second.portfolio.holdings.HNEL).toEqual({ quantity: 20, avgPrice: 45_000 });
    expect(second.portfolio.trades.map((t) => t.id)).toEqual([1, 2]);
  });

  it('sells with fee and tax and records realized PnL net of costs', () => {
    const bought = place(createPortfolio(1_000_000), market('HNEL', 'buy', 10), 50_000);
    const sold = place(bought.portfolio, market('HNEL', 'sell', 4), 60_000);
    // 240,000 − 수수료 36 − 세금 432 = 239,532, 원가 200,000
    expect(sold.trade).toMatchObject({ fee: 36, tax: 432, realizedPnl: 39_532 });
    expect(sold.portfolio.cash).toBe(bought.portfolio.cash + 239_532);
    expect(sold.portfolio.holdings.HNEL).toEqual({ quantity: 6, avgPrice: 50_000 });
  });

  it('removes the holding when fully sold', () => {
    const bought = place(createPortfolio(1_000_000), market('HNEL', 'buy', 10), 50_000);
    const sold = place(bought.portfolio, market('HNEL', 'sell', 10), 45_000);
    expect(sold.portfolio.holdings.HNEL).toBeUndefined();
  });

  it('rejects orders beyond cash or shares', () => {
    const portfolio = createPortfolio(500_074);
    expect(placeOrder(portfolio, market('HNEL', 'buy', 10), 50_000, 50_000, DAY)).toEqual({
      ok: false,
      error: 'insufficient_cash',
    });
    expect(placeOrder(portfolio, market('HNEL', 'sell', 1), 50_000, 50_000, DAY)).toEqual({
      ok: false,
      error: 'insufficient_shares',
    });
  });

  it.each([0, -1, 1.5, NaN])('rejects invalid quantity %p', (quantity) => {
    const result = placeOrder(createPortfolio(100_000), market('HNEL', 'buy', quantity), 1_000, 1_000, DAY);
    expect(result).toEqual({ ok: false, error: 'invalid_quantity' });
  });
});

describe('limit orders', () => {
  it('validates tick size and daily price limits', () => {
    const portfolio = createPortfolio(10_000_000);
    expect(placeOrder(portfolio, limit('HNEL', 'buy', 1, 49_930), 50_000, 50_000, DAY)).toEqual({
      ok: false,
      error: 'invalid_tick',
    });
    expect(placeOrder(portfolio, limit('HNEL', 'buy', 1, 30_000), 50_000, 50_000, DAY)).toEqual({
      ok: false,
      error: 'out_of_range',
    });
  });

  it('fills immediately at the current price when marketable', () => {
    const result = place(createPortfolio(1_000_000), limit('HNEL', 'buy', 10, 52_000), 50_000);
    expect(result.trade).toMatchObject({ orderType: 'limit', price: 50_000 });
    expect(result.portfolio.orders).toHaveLength(0);
  });

  it('reserves cash for pending buys and shares for pending sells', () => {
    const start = createPortfolio(1_000_000);
    const pendingBuy = place(start, limit('HNEL', 'buy', 10, 48_000), 50_000);
    expect(pendingBuy.order).toBeDefined();
    expect(pendingBuy.portfolio.cash).toBe(1_000_000);
    expect(availableCash(pendingBuy.portfolio)).toBe(1_000_000 - buyCost(48_000, 10));

    // 남은 현금으로는 같은 주문을 하나 더 넣을 수 없다.
    expect(placeOrder(pendingBuy.portfolio, limit('HNEL', 'buy', 11, 48_000), 50_000, 50_000, DAY)).toEqual({
      ok: false,
      error: 'insufficient_cash',
    });

    const bought = place(start, market('BTSF', 'buy', 5), 100_000);
    const pendingSell = place(bought.portfolio, limit('BTSF', 'sell', 3, 110_000), 100_000);
    expect(availableShares(pendingSell.portfolio, 'BTSF')).toBe(2);
    expect(placeOrder(pendingSell.portfolio, market('BTSF', 'sell', 3), 100_000, 100_000, DAY)).toEqual({
      ok: false,
      error: 'insufficient_shares',
    });
  });

  it('fills pending orders once the price crosses the limit', () => {
    const pending = place(createPortfolio(1_000_000), limit('HNEL', 'buy', 10, 48_000), 50_000);

    const notYet = processLimitOrders(pending.portfolio, () => 48_500, DAY);
    expect(notYet.filled).toHaveLength(0);
    expect(notYet.portfolio).toBe(pending.portfolio);

    const crossed = processLimitOrders(pending.portfolio, () => 47_900, DAY);
    expect(crossed.filled).toHaveLength(1);
    expect(crossed.filled[0]).toMatchObject({ price: 47_900, orderType: 'limit' });
    expect(crossed.portfolio.orders).toHaveLength(0);
    expect(crossed.portfolio.cash).toBe(1_000_000 - buyCost(47_900, 10));
    expect(availableCash(crossed.portfolio)).toBe(crossed.portfolio.cash);
  });

  it('cancels and expires pending orders, releasing reservations', () => {
    const pending = place(createPortfolio(1_000_000), limit('HNEL', 'buy', 10, 48_000), 50_000);
    const orderId = pending.order!.id;

    const cancelled = cancelOrder(pending.portfolio, orderId);
    if (!cancelled.ok) throw new Error(cancelled.error);
    expect(availableCash(cancelled.portfolio)).toBe(1_000_000);
    expect(cancelOrder(cancelled.portfolio, orderId)).toEqual({ ok: false, error: 'order_not_found' });

    const expired = expireOrders(pending.portfolio);
    expect(expired.expired).toHaveLength(1);
    expect(expired.portfolio.orders).toHaveLength(0);
  });
});

describe('dividends', () => {
  it('pays per-share dividends net of tax to current holders', () => {
    let portfolio = place(createPortfolio(10_000_000), market('DHFG', 'buy', 100), 50_000).portfolio;
    portfolio = place(portfolio, market('NRCH', 'buy', 10), 10_000).portfolio;
    const before = portfolio.cash;

    const { portfolio: after, paid } = payDividends(portfolio, (id) => (id === 'DHFG' ? 625 : 0), 62);
    // 62,500원 − 배당소득세 15.4% (9,625원)
    expect(paid).toEqual([
      { id: expect.any(Number), day: 62, stockId: 'DHFG', quantity: 100, perShare: 625, gross: 62_500, tax: 9_625 },
    ]);
    expect(after.cash).toBe(before + 52_875);
    expect(tradingTotals(after).dividendsNet).toBe(52_875);
  });
});
