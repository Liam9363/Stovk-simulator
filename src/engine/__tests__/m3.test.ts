import { ACHIEVEMENTS, newlyUnlocked } from '../achievements';
import { TICKS_PER_DAY, WARMUP_DAYS } from '../config';
import { createGame, endGame, type GameState, submitOrder, tickGame } from '../game';
import { createMarket } from '../market';
import { calcGrade, checkGameEnd, type GameMode, modeProgress, TARGET_MODE } from '../modes';
import { ageEffects, effectWeight, generateNews } from '../news';
import { addRecord, bestRecords, buildRecord, MAX_RECORDS } from '../records';
import { Rng } from '../rng';
import { STOCK_BY_ID } from '../stocks';

const ENDLESS: GameMode = { type: 'endless' };

function runDays(game: GameState, days: number) {
  let next = game;
  const ended = [];
  for (let i = 0; i < days * TICKS_PER_DAY; i++) {
    const step = tickGame(next, 0);
    next = step.game;
    ended.push(...step.events.filter((e) => e.type === 'ended'));
  }
  return { game: next, ended };
}

describe('news', () => {
  it('generates roughly the configured amount of news', () => {
    const rng = new Rng(1);
    let count = 0;
    const days = 400;
    for (let day = 1; day <= days; day++) {
      for (let tick = 1; tick <= TICKS_PER_DAY; tick++) {
        count += generateNews(rng, 'normal', day, tick, count + 1).length;
      }
    }
    // 하루 평균 약 0.72건 (종목 0.5 + 업종 0.15 + 시장 0.06 + 대형 1/150)
    expect(count / days).toBeGreaterThan(0.5);
    expect(count / days).toBeLessThan(0.95);
  });

  it('skews toward bad news on hard difficulty', () => {
    const rng = new Rng(2);
    const tally = { easy: [0, 0], hard: [0, 0] };
    for (const difficulty of ['easy', 'hard'] as const) {
      for (let i = 0; i < 200_000; i++) {
        for (const g of generateNews(rng, difficulty, 1, 1, 1)) {
          tally[difficulty][g.item.sentiment === 'bad' ? 1 : 0] += 1;
        }
      }
    }
    const badRatio = (t: number[]) => t[1] / (t[0] + t[1]);
    expect(badRatio(tally.hard)).toBeGreaterThan(badRatio(tally.easy));
  });

  it('applies effects to the right stocks', () => {
    const hnel = STOCK_BY_ID.HNEL;
    expect(effectWeight({ scope: 'stock', targetId: 'HNEL' }, hnel)).toBe(1);
    expect(effectWeight({ scope: 'stock', targetId: 'BTSF' }, hnel)).toBe(0);
    expect(effectWeight({ scope: 'sector', targetId: 'tech' }, hnel)).toBe(1);
    expect(effectWeight({ scope: 'sector', targetId: 'bio' }, hnel)).toBe(0);
    expect(effectWeight({ scope: 'market', targetId: null }, hnel)).toBe(hnel.beta);
  });

  it('ages effects by one day and drops expired ones', () => {
    const effects = [
      { scope: 'market' as const, targetId: null, dailyDrift: 0.01, remainingDays: 1 },
      { scope: 'market' as const, targetId: null, dailyDrift: 0.01, remainingDays: 3 },
    ];
    expect(ageEffects(effects)).toEqual([{ ...effects[1], remainingDays: 2 }]);
  });

  it('records news in the market and bounds the feed', () => {
    const market = createMarket(3, 'normal');
    expect(market.news.length).toBeGreaterThan(0);
    expect(market.news.length).toBeLessThanOrEqual(150);
    expect(market.news.every((n) => n.day <= 0 && n.day > -WARMUP_DAYS)).toBe(true);
    expect(market.nextNewsId).toBeGreaterThan(market.news.at(-1)!.id);
  });
});

describe('modes', () => {
  it('ends period games after the last day', () => {
    const mode: GameMode = { type: 'period', days: 62 };
    expect(checkGameEnd(mode, 1, 1, null)).toBeNull();
    expect(checkGameEnd(mode, 1, 1, 61)).toBeNull();
    expect(checkGameEnd(mode, 1, 1, 62)).toBe('completed');
  });

  it('clears or fails target games on asset thresholds', () => {
    expect(checkGameEnd(TARGET_MODE, 2_000, 1_000, null)).toBe('cleared');
    expect(checkGameEnd(TARGET_MODE, 500, 1_000, null)).toBe('gameover');
    expect(checkGameEnd(TARGET_MODE, 1_200, 1_000, 5)).toBeNull();
  });

  it('never ends endless games by itself', () => {
    expect(checkGameEnd(ENDLESS, 0, 1_000, 999)).toBeNull();
  });

  it('scales grade thresholds by period length', () => {
    const year: GameMode = { type: 'period', days: 250 };
    const quarter: GameMode = { type: 'period', days: 62 };
    expect(calcGrade(year, 'completed', 0.5, 250)).toBe('S');
    expect(calcGrade(year, 'completed', 0.2, 250)).toBe('B');
    expect(calcGrade(quarter, 'completed', 0.2, 62)).toBe('S');
    expect(calcGrade(quarter, 'completed', -0.01, 62)).toBe('D');
    expect(calcGrade(year, 'completed', -0.3, 250)).toBe('F');
    expect(calcGrade(TARGET_MODE, 'gameover', 0, 10)).toBe('F');
    expect(calcGrade(TARGET_MODE, 'cleared', 1, 100)).toBe('S');
    expect(calcGrade(TARGET_MODE, 'cleared', 1, 200)).toBe('A');
  });

  it('reports progress for the HUD', () => {
    expect(modeProgress({ type: 'period', days: 62 }, 32, 1, 1)?.label).toBe('32 / 62일');
    expect(modeProgress(TARGET_MODE, 1, 1_250, 1_000)?.ratio).toBeCloseTo(0.5);
    expect(modeProgress(ENDLESS, 1, 1, 1)).toBeNull();
  });
});

describe('game end', () => {
  it('finishes a period game, stops ticking and grades it', () => {
    const game = createGame(10, 'normal', { type: 'period', days: 62 }, 0);
    const { game: done, ended } = runDays(game, 63);
    expect(ended).toHaveLength(1);
    expect(done.result).toMatchObject({ outcome: 'completed', daysPlayed: 62 });
    expect(done.market.day).toBe(63);
    // 끝난 게임은 더 진행되지 않는다.
    expect(tickGame(done).game).toBe(done);
  });

  it('quits a game manually and cancels pending orders', () => {
    let game = createGame(4, 'easy', ENDLESS, 0);
    const price = game.market.stocks.HNEL.prevClose;
    game = submitOrder(game, {
      stockId: 'HNEL',
      side: 'buy',
      type: 'limit',
      quantity: 1,
      limitPrice: Math.ceil((price * 0.75) / 100) * 100,
    }).game;
    expect(game.portfolio.orders).toHaveLength(1);
    const quit = endGame(game, 'quit', 5);
    expect(quit.portfolio.orders).toHaveLength(0);
    expect(quit.result).toMatchObject({ outcome: 'quit', returnRate: 0, daysPlayed: 0, endedAt: 5 });
    expect(endGame(quit, 'quit')).toBe(quit);
  });
});

describe('records', () => {
  it('builds a record with the best performing stock', () => {
    let game = createGame(8, 'normal', ENDLESS, 100);
    game = submitOrder(game, { stockId: 'MSFD', side: 'buy', type: 'market', quantity: 3 }).game;
    game = runDays(game, 2).game;
    const record = buildRecord(endGame(game, 'quit', 200));
    expect(record).toMatchObject({ id: 100, difficulty: 'normal', tradeCount: 1, endedAt: 200 });
    expect(() => buildRecord(game)).toThrow();
  });

  it('keeps newest first, replaces duplicates and caps the list', () => {
    const base = buildRecord(endGame(createGame(1, 'easy', ENDLESS, 1), 'quit', 1));
    let records = [base];
    for (let i = 2; i <= MAX_RECORDS + 5; i++) records = addRecord(records, { ...base, id: i, returnRate: i / 100 });
    expect(records).toHaveLength(MAX_RECORDS);
    expect(records[0].id).toBe(MAX_RECORDS + 5);
    expect(addRecord(records, { ...records[3], returnRate: 9 })[0].returnRate).toBe(9);
    expect(bestRecords(records).endless?.id).toBe(MAX_RECORDS + 5);
  });
});

describe('achievements', () => {
  it('unlocks first buy and skips already unlocked ones', () => {
    let game = createGame(6, 'normal', ENDLESS, 0);
    expect(newlyUnlocked(game, {})).toEqual([]);
    game = submitOrder(game, { stockId: 'HNEL', side: 'buy', type: 'market', quantity: 1 }).game;
    expect(newlyUnlocked(game, {}).map((a) => a.id)).toContain('first_buy');
    expect(newlyUnlocked(game, { first_buy: 1 }).map((a) => a.id)).not.toContain('first_buy');
  });

  it('has unique ids', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });

  it('unlocks the target clear achievement when the target game ends cleared', () => {
    const game = createGame(6, 'normal', TARGET_MODE, 0);
    const cleared = { ...game, result: { ...endGame(game, 'quit').result!, outcome: 'cleared' as const } };
    expect(newlyUnlocked(cleared, {}).map((a) => a.id)).toContain('target_clear');
  });
});
