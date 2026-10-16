/** 계좌·주문 체결 로직 (M1: 시장가 매수/매도). */
import type { MarketState } from './market';

export type Holding = {
  quantity: number;
  /** 평균 매입가 */
  avgPrice: number;
};

export type TradeSide = 'buy' | 'sell';

export type Trade = {
  id: number;
  day: number;
  stockId: string;
  side: TradeSide;
  quantity: number;
  price: number;
  /** 매도 시 실현손익 */
  realizedPnl?: number;
};

export type Portfolio = {
  cash: number;
  holdings: Record<string, Holding>;
  trades: Trade[];
};

export type OrderError = 'invalid_quantity' | 'insufficient_cash' | 'insufficient_shares';

export type OrderResult = { ok: true; portfolio: Portfolio; trade: Trade } | { ok: false; error: OrderError };

export const ORDER_ERROR_MESSAGES: Record<OrderError, string> = {
  invalid_quantity: '수량을 1주 이상 입력하세요.',
  insufficient_cash: '현금이 부족합니다.',
  insufficient_shares: '보유 수량보다 많이 팔 수 없습니다.',
};

export function createPortfolio(cash: number): Portfolio {
  return { cash, holdings: {}, trades: [] };
}

/** 현금으로 살 수 있는 최대 수량. */
export function maxBuyQuantity(cash: number, price: number): number {
  return price > 0 ? Math.floor(cash / price) : 0;
}

export function buyMarket(
  portfolio: Portfolio,
  stockId: string,
  quantity: number,
  price: number,
  day: number,
): OrderResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, error: 'invalid_quantity' };
  const cost = price * quantity;
  if (cost > portfolio.cash) return { ok: false, error: 'insufficient_cash' };

  const prev = portfolio.holdings[stockId];
  const prevQty = prev?.quantity ?? 0;
  const newQty = prevQty + quantity;
  const avgPrice = ((prev?.avgPrice ?? 0) * prevQty + cost) / newQty;

  const trade: Trade = { id: nextTradeId(portfolio), day, stockId, side: 'buy', quantity, price };
  return {
    ok: true,
    trade,
    portfolio: {
      cash: portfolio.cash - cost,
      holdings: { ...portfolio.holdings, [stockId]: { quantity: newQty, avgPrice } },
      trades: [...portfolio.trades, trade],
    },
  };
}

export function sellMarket(
  portfolio: Portfolio,
  stockId: string,
  quantity: number,
  price: number,
  day: number,
): OrderResult {
  if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, error: 'invalid_quantity' };
  const holding = portfolio.holdings[stockId];
  if (!holding || holding.quantity < quantity) return { ok: false, error: 'insufficient_shares' };

  const proceeds = price * quantity;
  const realizedPnl = (price - holding.avgPrice) * quantity;
  const holdings = { ...portfolio.holdings };
  const remaining = holding.quantity - quantity;
  if (remaining === 0) {
    delete holdings[stockId];
  } else {
    holdings[stockId] = { ...holding, quantity: remaining };
  }

  const trade: Trade = {
    id: nextTradeId(portfolio),
    day,
    stockId,
    side: 'sell',
    quantity,
    price,
    realizedPnl,
  };
  return {
    ok: true,
    trade,
    portfolio: { cash: portfolio.cash + proceeds, holdings, trades: [...portfolio.trades, trade] },
  };
}

function nextTradeId(portfolio: Portfolio): number {
  const last = portfolio.trades[portfolio.trades.length - 1];
  return last ? last.id + 1 : 1;
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
