import { isOnTick, priceLimits, roundToTick, stepPrice, tickSize } from '../krx';

describe('tickSize', () => {
  it.each([
    [1_999, 1],
    [2_000, 5],
    [4_995, 5],
    [5_000, 10],
    [19_990, 10],
    [20_000, 50],
    [50_000, 100],
    [200_000, 500],
    [500_000, 1_000],
  ])('price %d → tick %d', (price, tick) => {
    expect(tickSize(price)).toBe(tick);
  });
});

describe('roundToTick', () => {
  it('rounds to the nearest tick for the price band', () => {
    expect(roundToTick(12_344)).toBe(12_340);
    expect(roundToTick(12_346)).toBe(12_350);
    expect(roundToTick(72_049)).toBe(72_000);
    expect(roundToTick(72_051)).toBe(72_100);
  });

  it('never returns less than 1 won', () => {
    expect(roundToTick(0.2)).toBe(1);
  });
});

describe('priceLimits', () => {
  it('caps the band at ±30% aligned to ticks', () => {
    expect(priceLimits(10_000)).toEqual({ upper: 13_000, lower: 7_000 });
    // 72,000 × 1.3 = 93,600 (100원 단위), × 0.7 = 50,400
    expect(priceLimits(72_000)).toEqual({ upper: 93_600, lower: 50_400 });
  });

  it('keeps limits on valid ticks and inside the band', () => {
    for (let prev = 1_000; prev < 700_000; prev = Math.round(prev * 1.037)) {
      const base = roundToTick(prev);
      const { upper, lower } = priceLimits(base);
      expect(isOnTick(upper)).toBe(true);
      expect(isOnTick(lower)).toBe(true);
      expect(upper).toBeLessThanOrEqual(base * 1.3);
      expect(lower).toBeGreaterThanOrEqual(base * 0.7);
    }
  });
});

describe('stepPrice', () => {
  it('moves one tick across band boundaries', () => {
    expect(stepPrice(19_990, 1)).toBe(20_000);
    expect(stepPrice(20_000, 1)).toBe(20_050);
    expect(stepPrice(20_000, -1)).toBe(19_990);
    expect(stepPrice(1, -1)).toBe(1);
  });
});
