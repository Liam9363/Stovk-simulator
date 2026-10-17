/**
 * 계좌·주문 체결 로직.
 *
 * - 시장가: 현재가로 즉시 체결
 * - 지정가: 매수는 현재가 ≤ 지정가, 매도는 현재가 ≥ 지정가가 되면 그 시점 현재가로 체결.
 *   미체결 주문은 당일 장 마감 때 자동 취소된다.
 *   주문 중인 금액(매수)과 수량(매도)은 묶여서 다른 주문에 쓸 수 없다.
 * - 수수료는 매수·매도 모두, 증권거래세는 매도에만 부과 (원 미만 버림).
 * - 평균 매입가에는 수수료를 포함하지 않는다. 실현손익 = 매도 정산금(수수료·세금 차감) − 평균 매입가 × 수량.
 */
import { DIVIDEND_TAX_RATE, FEE_RATE, SELL_TAX_RATE } from './config';
import { isOnTick, priceLimits } from './krx';
import type { MarketState } from './market';

export type Holding = {
  quantity: number;
  /** 평균 매입가 (수수료 제외) */
  avgPrice: number;
};

export type TradeSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

export type Trade = {
  id: number;
  day: number;
  stockId: string;
  side: TradeSide;
  orderType: OrderType;
  quantity: number;
  price: number;
  fee: number;
  tax: number;
  /** 매도 시 실현손익 */
  realizedPnl?: number;
};

export type PendingOrder = {
  id: number;
  day: number;
  stockId: string;
  side: TradeSide;
  quantity: number;
  limitPrice: number;
};

export type DividendRecord = {
  id: number;
  day: number;
  stockId: string;
  quantity: number;
  perShare: number;
  /** 세전 배당금 */
  gross: number;
  tax: number;
};

export type Portfolio = {
  cash: number;
  holdings: Record<string, Holding>;
  trades: Trade[];
  orders: PendingOrder[];
  dividends: DividendRecord[];
  /** 거래·주문·배당 기록 공용 일련번호 */
  nextId: number;
};

export type OrderError =
  | 'invalid_quantity'
  | 'insufficient_cash'
  | 'insufficient_shares'
  | 'invalid_tick'
  | 'out_of_range'
  | 'order_not_found';

export type OrderRequest = {
  stockId: string;
  side: TradeSide;
  type: OrderType;
  quantity: number;
  /** 지정가 주문 가격 */
  limitPrice?: number;
};

export type OrderResult =
  | { ok: true; portfolio: Portfolio; trade?: Trade; order?: PendingOrder }
  | { ok: false; error: OrderError };

export const ORDER_ERROR_MESSAGES: Record<OrderError, string> = {
  invalid_quantity: '수량을 1주 이상 입력하세요.',
  insufficient_cash: '주문 가능 현금이 부족합니다.',
  insufficient_shares: '주문 가능 수량보다 많이 팔 수 없습니다.',
  invalid_tick: '호가 단위에 맞지 않는 가격입니다.',
  out_of_range: '상한가·하한가 범위를 벗어난 가격입니다.',
  order_not_found: '주문을 찾을 수 없습니다.',
};

export function createPortfolio(cash: number): Portfolio {
  return { cash, holdings: {}, trades: [], orders: [], dividends: [], nextId: 1 };
}

export function calcFee(amount: number): number {
  return Math.floor(amount * FEE_RATE);
}

export function calcSellTax(amount: number): number {
  return Math.floor(amount * SELL_TAX_RATE);
}

/** 매수에 필요한 총액 (주문금액 + 수수료). */
export function buyCost(price: number, quantity: number): number {
  const amount = price * quantity;
  return amount + calcFee(amount);
}

/** 매도 정산금 (주문금액 − 수수료 − 세금). */
export function sellProceeds(price: number, quantity: number): number {
  const amount = price * quantity;
  return amount - calcFee(amount) - calcSellTax(amount);
}

/** 미체결 매수 주문에 묶인 현금. */
export function reservedCash(portfolio: Portfolio): number {
  return portfolio.orders
    .filter((o) => o.side === 'buy')
    .reduce((sum, o) => sum + buyCost(o.limitPrice, o.quantity), 0);
}

export function availableCash(portfolio: Portfolio): number {
  return portfolio.cash - reservedCash(portfolio);
}

/** 미체결 매도 주문을 제외한 매도 가능 수량. */
export function availableShares(portfolio: Portfolio, stockId: string): number {
  const held = portfolio.holdings[stockId]?.quantity ?? 0;
  const reserved = portfolio.orders
    .filter((o) => o.side === 'sell' && o.stockId === stockId)
    .reduce((sum, o) => sum + o.quantity, 0);
  return held - reserved;
}

/** 현금으로 살 수 있는 최대 수량 (수수료 포함). */
export function maxBuyQuantity(cash: number, price: number): number {
  if (price <= 0 || cash <= 0) return 0;
  let quantity = Math.floor(cash / (price * (1 + FEE_RATE)));
  while (quantity > 0 && buyCost(price, quantity) > cash) quantity -= 1;
  while (buyCost(price, quantity + 1) <= cash) quantity += 1;
  return quantity;
}

/** 주문을 넣는다. 시장가이거나 바로 체결 가능한 지정가는 현재가로 즉시 체결된다. */
export function placeOrder(
  portfolio: Portfolio,
  request: OrderRequest,
  currentPrice: number,
  prevClose: number,
  day: number,
): OrderResult {
  const { stockId, side, type, quantity } = request;
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, error: 'invalid_quantity' };

  if (type === 'market') {
    return fill(portfolio, stockId, side, 'market', quantity, currentPrice, day);
  }

  const limitPrice = request.limitPrice ?? 0;
  if (!isOnTick(limitPrice)) return { ok: false, error: 'invalid_tick' };
  const { upper, lower } = priceLimits(prevClose);
  if (limitPrice > upper || limitPrice < lower) return { ok: false, error: 'out_of_range' };

  // 매수는 지정가 기준으로 자금을 확인한다 (체결가는 지정가 이하).
  if (side === 'buy' && buyCost(limitPrice, quantity) > availableCash(portfolio)) {
    return { ok: false, error: 'insufficient_cash' };
  }
  if (side === 'sell' && quantity > availableShares(portfolio, stockId)) {
    return { ok: false, error: 'insufficient_shares' };
  }

  if (isMarketable(side, limitPrice, currentPrice)) {
    return fill(portfolio, stockId, side, 'limit', quantity, currentPrice, day);
  }

  const order: PendingOrder = { id: portfolio.nextId, day, stockId, side, quantity, limitPrice };
  return {
    ok: true,
    order,
    portfolio: { ...portfolio, orders: [...portfolio.orders, order], nextId: portfolio.nextId + 1 },
  };
}

export function cancelOrder(portfolio: Portfolio, orderId: number): OrderResult {
  if (!portfolio.orders.some((o) => o.id === orderId)) return { ok: false, error: 'order_not_found' };
  return { ok: true, portfolio: { ...portfolio, orders: portfolio.orders.filter((o) => o.id !== orderId) } };
}

function isMarketable(side: TradeSide, limitPrice: number, price: number): boolean {
  return side === 'buy' ? price <= limitPrice : price >= limitPrice;
}

/** 현재가를 기준으로 체결 가능한 지정가 주문을 체결한다. */
export function processLimitOrders(
  portfolio: Portfolio,
  priceOf: (stockId: string) => number,
  day: number,
): { portfolio: Portfolio; filled: Trade[] } {
  let next = portfolio;
  const filled: Trade[] = [];
  for (const order of portfolio.orders) {
    const price = priceOf(order.stockId);
    if (!isMarketable(order.side, order.limitPrice, price)) continue;
    // 주문을 먼저 빼서 묶여 있던 현금·수량을 풀고 체결한다.
    const released = { ...next, orders: next.orders.filter((o) => o.id !== order.id) };
    const result = fill(released, order.stockId, order.side, 'limit', order.quantity, price, day);
    if (result.ok && result.trade) {
      next = result.portfolio;
      filled.push(result.trade);
    }
  }
  return { portfolio: next, filled };
}

/** 장 마감 시 미체결 주문을 모두 취소한다. */
export function expireOrders(portfolio: Portfolio): { portfolio: Portfolio; expired: PendingOrder[] } {
  if (portfolio.orders.length === 0) return { portfolio, expired: [] };
  return { portfolio: { ...portfolio, orders: [] }, expired: portfolio.orders };
}

function fill(
  portfolio: Portfolio,
  stockId: string,
  side: TradeSide,
  orderType: OrderType,
  quantity: number,
  price: number,
  day: number,
): OrderResult {
  const amount = price * quantity;
  const fee = calcFee(amount);
  const id = portfolio.nextId;

  if (side === 'buy') {
    const cost = amount + fee;
    if (cost > availableCash(portfolio)) return { ok: false, error: 'insufficient_cash' };
    const prev = portfolio.holdings[stockId];
    const prevQty = prev?.quantity ?? 0;
    const newQty = prevQty + quantity;
    const avgPrice = ((prev?.avgPrice ?? 0) * prevQty + amount) / newQty;
    const trade: Trade = { id, day, stockId, side, orderType, quantity, price, fee, tax: 0 };
    return {
      ok: true,
      trade,
      portfolio: {
        ...portfolio,
        cash: portfolio.cash - cost,
        holdings: { ...portfolio.holdings, [stockId]: { quantity: newQty, avgPrice } },
        trades: [...portfolio.trades, trade],
        nextId: id + 1,
      },
    };
  }

  if (quantity > availableShares(portfolio, stockId)) return { ok: false, error: 'insufficient_shares' };
  const holding = portfolio.holdings[stockId];
  const tax = calcSellTax(amount);
  const proceeds = amount - fee - tax;
  const realizedPnl = proceeds - holding.avgPrice * quantity;
  const holdings = { ...portfolio.holdings };
  const remaining = holding.quantity - quantity;
  if (remaining === 0) {
    delete holdings[stockId];
  } else {
    holdings[stockId] = { ...holding, quantity: remaining };
  }
  const trade: Trade = { id, day, stockId, side, orderType, quantity, price, fee, tax, realizedPnl };
  return {
    ok: true,
    trade,
    portfolio: {
      ...portfolio,
      cash: portfolio.cash + proceeds,
      holdings,
      trades: [...portfolio.trades, trade],
      nextId: id + 1,
    },
  };
}

/** 배당 지급: 보유 수량 × 주당 배당금에서 배당소득세를 떼고 현금으로 넣는다. */
export function payDividends(
  portfolio: Portfolio,
  perShareOf: (stockId: string) => number,
  day: number,
): { portfolio: Portfolio; paid: DividendRecord[] } {
  const paid: DividendRecord[] = [];
  let nextId = portfolio.nextId;
  let cash = portfolio.cash;
  for (const [stockId, holding] of Object.entries(portfolio.holdings)) {
    const perShare = perShareOf(stockId);
    if (perShare <= 0) continue;
    const gross = perShare * holding.quantity;
    const tax = Math.floor(gross * DIVIDEND_TAX_RATE);
    paid.push({ id: nextId++, day, stockId, quantity: holding.quantity, perShare, gross, tax });
    cash += gross - tax;
  }
  if (paid.length === 0) return { portfolio, paid };
  return {
    portfolio: { ...portfolio, cash, dividends: [...portfolio.dividends, ...paid], nextId },
    paid,
  };
}

export type PositionSummary = {
  stockId: string;
  quantity: number;
  avgPrice: number;
  price: number;
  value: number;
  cost: number;
  pnl: number;
  returnRate: number;
};

export type PortfolioSummary = {
  cash: number;
  stockValue: number;
  totalAssets: number;
  positions: PositionSummary[];
};

export function summarizePortfolio(portfolio: Portfolio, market: MarketState): PortfolioSummary {
  const positions: PositionSummary[] = Object.entries(portfolio.holdings).map(([stockId, holding]) => {
    const price = market.stocks[stockId].price;
    const value = price * holding.quantity;
    const cost = holding.avgPrice * holding.quantity;
    return {
      stockId,
      quantity: holding.quantity,
      avgPrice: holding.avgPrice,
      price,
      value,
      cost,
      pnl: value - cost,
      returnRate: cost > 0 ? value / cost - 1 : 0,
    };
  });
  positions.sort((a, b) => b.value - a.value);
  const stockValue = positions.reduce((sum, p) => sum + p.value, 0);
  return { cash: portfolio.cash, stockValue, totalAssets: portfolio.cash + stockValue, positions };
}

export type TradingTotals = {
  fees: number;
  taxes: number;
  dividendsNet: number;
  realizedPnl: number;
};

export function tradingTotals(portfolio: Portfolio): TradingTotals {
  const totals: TradingTotals = { fees: 0, taxes: 0, dividendsNet: 0, realizedPnl: 0 };
  for (const t of portfolio.trades) {
    totals.fees += t.fee;
    totals.taxes += t.tax;
    totals.realizedPnl += t.realizedPnl ?? 0;
  }
  for (const d of portfolio.dividends) {
    totals.dividendsNet += d.gross - d.tax;
    totals.taxes += d.tax;
  }
  return totals;
}

export type LedgerEntry =
  | { kind: 'trade'; id: number; day: number; trade: Trade }
  | { kind: 'dividend'; id: number; day: number; dividend: DividendRecord };

/** 체결과 배당을 합친 계좌 내역 (최신순). */
export function buildLedger(portfolio: Portfolio): LedgerEntry[] {
  const entries: LedgerEntry[] = [
    ...portfolio.trades.map((trade) => ({ kind: 'trade' as const, id: trade.id, day: trade.day, trade })),
    ...portfolio.dividends.map((dividend) => ({
      kind: 'dividend' as const,
      id: dividend.id,
      day: dividend.day,
      dividend,
    })),
  ];
  return entries.sort((a, b) => b.id - a.id);
}
