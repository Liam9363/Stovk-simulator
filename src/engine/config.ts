/** 게임 밸런스 설정값. 조정이 필요하면 이 파일만 수정한다. */

export type Difficulty = 'easy' | 'normal' | 'hard';

export type DifficultyConfig = {
  label: string;
  startCash: number;
  /** 전체 변동성 배수 */
  volatility: number;
  description: string;
};

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: '쉬움',
    startCash: 30_000_000,
    volatility: 0.7,
    description: '넉넉한 자금, 잔잔한 시장',
  },
  normal: {
    label: '보통',
    startCash: 10_000_000,
    volatility: 1,
    description: '표준 자금과 변동성',
  },
  hard: {
    label: '어려움',
    startCash: 3_000_000,
    volatility: 1.4,
    description: '적은 자금, 거친 시장',
  },
};

/** 1거래일을 구성하는 가격 틱 수. 1x 배속에서 1초에 1틱 → 1일 = 60초. */
export const TICKS_PER_DAY = 60;

/** 연간 거래일 수 (연율 파라미터 환산용). */
export const TRADING_DAYS_PER_YEAR = 250;

/** 게임 시작 전에 미리 만들어 두는 과거 시세 일수 (차트가 비지 않도록). */
export const WARMUP_DAYS = 60;

/** 시장 전체 요인 (연율). */
export const MARKET_DRIFT = 0.06;
export const MARKET_VOLATILITY = 0.16;

/** 업종 요인 변동성 (연율). */
export const SECTOR_VOLATILITY = 0.12;

/** 시장 지수 기준값. */
export const INDEX_BASE = 1_000;

export const GAME_SPEEDS = [1, 2, 4] as const;
export type GameSpeed = (typeof GAME_SPEEDS)[number];
