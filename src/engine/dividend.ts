/**
 * 배당 규칙.
 * 분기마다(DIVIDEND_INTERVAL_DAYS 거래일) 장 마감 시점 보유자에게 배당을 지급하고,
 * 다음 거래일 기준가를 주당 배당금만큼 낮춘다 (배당락).
 */
import { DIVIDEND_INTERVAL_DAYS } from './config';
import type { StockDef } from './stocks';

export function isDividendDay(day: number): boolean {
  return day > 0 && day % DIVIDEND_INTERVAL_DAYS === 0;
}

/** `day` 이후(당일 포함) 가장 가까운 배당일. */
export function nextDividendDay(day: number): number {
  const from = Math.max(day, 1);
  return Math.ceil(from / DIVIDEND_INTERVAL_DAYS) * DIVIDEND_INTERVAL_DAYS;
}

/** 배당일 종가 기준 주당 배당금 (연 배당수익률의 1/4). 무배당 종목은 0. */
export function dividendPerShare(def: StockDef, closePrice: number): number {
  if (def.dividendYield <= 0) return 0;
  return Math.max(1, Math.round((closePrice * def.dividendYield) / 4));
}
