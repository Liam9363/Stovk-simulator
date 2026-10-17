/** 게임 모드와 종료 판정, 등급 계산. */
import { TRADING_DAYS_PER_YEAR } from './config';

export const PERIOD_OPTIONS = [
  { days: 62, label: '3개월' },
  { days: 125, label: '6개월' },
  { days: 250, label: '1년' },
] as const;

export type PeriodDays = (typeof PERIOD_OPTIONS)[number]['days'];

export type GameMode =
  | { type: 'period'; days: PeriodDays }
  | { type: 'target'; targetMultiple: number; floorMultiple: number }
  | { type: 'endless' };

export const TARGET_MODE = { type: 'target', targetMultiple: 2, floorMultiple: 0.5 } as const satisfies GameMode;

export type GameOutcome =
  /** 기간제: 기간 만료 */
  | 'completed'
  /** 목표 달성형: 목표 자산 도달 */
  | 'cleared'
  /** 목표 달성형: 파산선 이하 */
  | 'gameover'
  /** 플레이어가 직접 끝냄 */
  | 'quit';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export function modeLabel(mode: GameMode): string {
  switch (mode.type) {
    case 'period':
      return `기간제 · ${PERIOD_OPTIONS.find((o) => o.days === mode.days)?.label ?? `${mode.days}일`}`;
    case 'target':
      return `목표 달성 · ${mode.targetMultiple}배`;
    case 'endless':
      return '무한 모드';
  }
}

export const OUTCOME_LABELS: Record<GameOutcome, string> = {
  completed: '기간 종료',
  cleared: '목표 달성!',
  gameover: '게임 오버',
  quit: '직접 종료',
};

/**
 * 장 마감(또는 틱) 시점에 게임이 끝났는지 판정한다.
 * @param closedDay 방금 마감한 거래일 (장중이면 null)
 */
export function checkGameEnd(
  mode: GameMode,
  assets: number,
  startCash: number,
  closedDay: number | null,
): GameOutcome | null {
  if (mode.type === 'target') {
    if (assets >= startCash * mode.targetMultiple) return 'cleared';
    if (assets <= startCash * mode.floorMultiple) return 'gameover';
    return null;
  }
  if (mode.type === 'period' && closedDay !== null && closedDay >= mode.days) return 'completed';
  return null;
}

/** 연간 기준 등급 기준선 (수익률). 짧은 기간은 비례해서 낮춘다. */
const ANNUAL_THRESHOLDS: [Grade, number][] = [
  ['S', 0.5],
  ['A', 0.25],
  ['B', 0.1],
  ['C', 0],
  ['D', -0.15],
];

/** 최소 기준 기간 (너무 짧게 하고 끝내면 기준선이 0에 가까워지지 않도록). */
const MIN_GRADING_DAYS = 20;

export function calcGrade(
  mode: GameMode,
  outcome: GameOutcome,
  returnRate: number,
  daysPlayed: number,
): Grade {
  if (outcome === 'gameover') return 'F';
  if (outcome === 'cleared') return daysPlayed <= TRADING_DAYS_PER_YEAR / 2 ? 'S' : 'A';
  const scale = Math.min(1, Math.max(daysPlayed, MIN_GRADING_DAYS) / TRADING_DAYS_PER_YEAR);
  for (const [grade, threshold] of ANNUAL_THRESHOLDS) {
    if (returnRate >= threshold * scale) return grade;
  }
  return 'F';
}

/** HUD에 표시할 모드 진행 상황. */
export function modeProgress(
  mode: GameMode,
  day: number,
  assets: number,
  startCash: number,
): { label: string; ratio: number } | null {
  if (mode.type === 'period') {
    return { label: `${Math.min(day, mode.days)} / ${mode.days}일`, ratio: Math.min(1, (day - 1) / mode.days) };
  }
  if (mode.type === 'target') {
    const floor = startCash * mode.floorMultiple;
    const target = startCash * mode.targetMultiple;
    const ratio = Math.min(1, Math.max(0, (assets - floor) / (target - floor)));
    return { label: `목표 ${mode.targetMultiple}배까지 ${(Math.max(0, target / assets - 1) * 100).toFixed(1)}%`, ratio };
  }
  return null;
}
