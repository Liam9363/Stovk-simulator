/** 한국 주식시장 규칙: 호가 단위와 가격제한폭. */

export const PRICE_LIMIT_RATE = 0.3;

/** 가격대별 호가 단위 (2023년 이후 KRX 기준). */
export function tickSize(price: number): number {
  if (price < 2_000) return 1;
  if (price < 5_000) return 5;
  if (price < 20_000) return 10;
  if (price < 50_000) return 50;
  if (price < 200_000) return 100;
  if (price < 500_000) return 500;
  return 1_000;
}

/** 가장 가까운 호가로 반올림한다. 최소 1원. */
export function roundToTick(price: number): number {
  const tick = tickSize(price);
  return Math.max(1, Math.round(price / tick) * tick);
}

export function isOnTick(price: number): boolean {
  return Number.isInteger(price) && price > 0 && price % tickSize(price) === 0;
}

/** 전일 종가 기준 상한가/하한가. 상한가는 내림, 하한가는 올림으로 호가에 맞춘다. */
export function priceLimits(prevClose: number): { upper: number; lower: number } {
  const rawUpper = prevClose * (1 + PRICE_LIMIT_RATE);
  const rawLower = prevClose * (1 - PRICE_LIMIT_RATE);
  const upper = Math.floor(rawUpper / tickSize(rawUpper)) * tickSize(rawUpper);
  const lowerTick = tickSize(rawLower);
  const lower = Math.max(1, Math.ceil(rawLower / lowerTick) * lowerTick);
  return { upper, lower };
}

/** 호가 한 단계 위/아래 가격. 아래로 갈 때는 낮은 가격대의 호가 단위를 쓴다. */
export function stepPrice(price: number, direction: 1 | -1): number {
  if (direction === 1) return roundToTick(price) + tickSize(price);
  const lower = roundToTick(price) - tickSize(price - 1);
  return Math.max(1, lower);
}
