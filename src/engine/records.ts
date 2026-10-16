/** 끝난 게임의 기록. 게임 간에 누적 보관된다. */
import type { Difficulty } from './config';
import type { GameResult, GameState } from './game';
import type { GameMode } from './modes';
import { tradingTotals } from './portfolio';

export type GameRecord = GameResult & {
  id: number;
  mode: GameMode;
  difficulty: Difficulty;
  startCash: number;
  startedAt: number;
  tradeCount: number;
  dividendsNet: number;
  /** 가장 많이 번 종목 (실현 + 마감 시 평가손익) */
  bestStock: { stockId: string; pnl: number } | null;
};

/** 보관하는 최대 기록 수 (오래된 것부터 버림). */
export const MAX_RECORDS = 50;

export function buildRecord(game: GameState): GameRecord {
  if (!game.result) throw new Error('Game has not ended');
  const pnlByStock: Record<string, number> = {};
  for (const trade of game.portfolio.trades) {
    if (trade.realizedPnl !== undefined) {
      pnlByStock[trade.stockId] = (pnlByStock[trade.stockId] ?? 0) + trade.realizedPnl;
    }
  }
  for (const [stockId, holding] of Object.entries(game.portfolio.holdings)) {
    const unrealized = (game.market.stocks[stockId].price - holding.avgPrice) * holding.quantity;
    pnlByStock[stockId] = (pnlByStock[stockId] ?? 0) + unrealized;
  }
  const best = Object.entries(pnlByStock).sort((a, b) => b[1] - a[1])[0];

  return {
    ...game.result,
    id: game.startedAt,
    mode: game.mode,
    difficulty: game.difficulty,
    startCash: game.startCash,
    startedAt: game.startedAt,
    tradeCount: game.portfolio.trades.length,
    dividendsNet: tradingTotals(game.portfolio).dividendsNet,
    bestStock: best && best[1] > 0 ? { stockId: best[0], pnl: best[1] } : null,
  };
}

/** 최신 기록을 앞에 추가한다. 같은 게임 기록이 이미 있으면 교체한다. */
export function addRecord(records: GameRecord[], record: GameRecord): GameRecord[] {
  return [record, ...records.filter((r) => r.id !== record.id)].slice(0, MAX_RECORDS);
}

/** 모드 종류별 최고 수익률 기록. */
export function bestRecords(records: GameRecord[]): Partial<Record<GameMode['type'], GameRecord>> {
  const best: Partial<Record<GameMode['type'], GameRecord>> = {};
  for (const record of records) {
    const current = best[record.mode.type];
    if (!current || record.returnRate > current.returnRate) best[record.mode.type] = record;
  }
  return best;
}
