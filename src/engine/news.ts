/**
 * 뉴스·시장 이벤트.
 *
 * 매 틱 일정 확률로 종목·업종·시장 단위 뉴스가 발생한다. 뉴스는
 * 1) 발생 즉시 적정가를 한 번 움직이고(shock),
 * 2) 며칠 동안 하루 단위 추세(drift)를 더한다.
 * 난이도가 높을수록 악재 비율과 충격 크기가 커진다.
 */
import { DIFFICULTIES, TICKS_PER_DAY } from './config';
import type { Rng } from './rng';
import { SECTORS, type SectorId, STOCKS, type StockDef } from './stocks';

export type NewsScope = 'stock' | 'sector' | 'market';
export type Sentiment = 'good' | 'bad';

export type NewsItem = {
  id: number;
  day: number;
  tick: number;
  scope: NewsScope;
  /** 종목 id 또는 업종 id (시장 뉴스는 null) */
  targetId: string | null;
  sentiment: Sentiment;
  headline: string;
  /** 폭락장·버블 같은 대형 이벤트 */
  major: boolean;
};

export type MarketEffect = {
  scope: NewsScope;
  targetId: string | null;
  /** 하루 동안 더해지는 로그 수익률 */
  dailyDrift: number;
  remainingDays: number;
};

type Range = readonly [number, number];

type Template = {
  headline: string;
  /** 즉시 충격 (로그 수익률 크기) */
  shock: Range;
  /** 하루 추세 크기 */
  drift: Range;
  days: Range;
};

type TemplateSet = Record<Sentiment, Template[]>;

const t = (headline: string, shock: Range, drift: Range, days: Range): Template => ({
  headline,
  shock,
  drift,
  days,
});

/** 모든 종목에 쓰는 일반 뉴스. {name} = 종목명 */
const STOCK_NEWS: TemplateSet = {
  good: [
    t('{name}, 분기 실적 시장 예상치 크게 상회', [0.04, 0.09], [0.003, 0.008], [2, 4]),
    t('{name}, 대규모 공급 계약 체결', [0.05, 0.12], [0.002, 0.006], [2, 3]),
    t('{name}, 신제품 출시 첫 주 판매 호조', [0.03, 0.07], [0.003, 0.006], [2, 4]),
    t('{name}, 자사주 매입·소각 결정', [0.02, 0.05], [0.002, 0.004], [2, 3]),
    t('{name}, 해외 시장 진출 본격화', [0.03, 0.06], [0.002, 0.005], [3, 5]),
    t('증권가 "{name} 목표주가 상향"', [0.02, 0.05], [0.002, 0.004], [1, 3]),
  ],
  bad: [
    t('{name}, 실적 쇼크… 영업이익 급감', [0.05, 0.11], [0.003, 0.008], [2, 4]),
    t('{name}, 경영진 횡령 혐의로 압수수색', [0.07, 0.15], [0.004, 0.009], [2, 4]),
    t('{name}, 주력 제품 대규모 리콜 결정', [0.05, 0.1], [0.003, 0.006], [2, 3]),
    t('{name}, 대규모 유상증자 발표… 주주가치 희석 우려', [0.04, 0.09], [0.002, 0.005], [2, 3]),
    t('{name}, 핵심 거래처와 계약 해지', [0.04, 0.08], [0.002, 0.006], [2, 4]),
    t('증권가 "{name} 목표주가 하향"', [0.02, 0.05], [0.002, 0.004], [1, 3]),
  ],
};

/** 업종별 특화 종목 뉴스. */
const SECTOR_STOCK_NEWS: Partial<Record<SectorId, TemplateSet>> = {
  bio: {
    good: [
      t('{name}, 신약 임상 3상 성공', [0.12, 0.25], [0.005, 0.012], [2, 4]),
      t('{name}, 글로벌 제약사에 기술수출 계약', [0.08, 0.18], [0.004, 0.008], [2, 3]),
    ],
    bad: [
      t('{name}, 임상 시험 중단… 부작용 보고', [0.12, 0.25], [0.005, 0.012], [2, 4]),
      t('{name}, 신약 허가 신청 반려', [0.08, 0.16], [0.004, 0.008], [2, 3]),
    ],
  },
  tech: {
    good: [t('{name}, 차세대 AI 칩 개발 성공', [0.06, 0.13], [0.004, 0.008], [2, 4])],
    bad: [t('{name}, 생산 공장 화재로 가동 중단', [0.06, 0.12], [0.003, 0.007], [2, 3])],
  },
  entertainment: {
    good: [t('{name}, 신작 글로벌 차트 1위', [0.07, 0.15], [0.004, 0.009], [2, 4])],
    bad: [t('{name}, 핵심 아티스트 전속계약 분쟁', [0.07, 0.14], [0.004, 0.008], [2, 4])],
  },
  energy: {
    good: [t('{name}, 대형 발전 프로젝트 수주', [0.04, 0.09], [0.002, 0.006], [2, 4])],
    bad: [t('{name}, 환경 규제 위반으로 과징금 부과', [0.04, 0.08], [0.002, 0.005], [2, 3])],
  },
};

/** 업종 뉴스. {sector} = 업종명 */
const SECTOR_NEWS: TemplateSet = {
  good: [
    t('정부, {sector} 산업 육성에 대규모 지원 발표', [0.02, 0.05], [0.002, 0.005], [3, 5]),
    t('{sector} 업황 회복 기대감… 기관 매수세 유입', [0.015, 0.04], [0.002, 0.004], [2, 4]),
    t('해외 {sector} 대장주 급등에 국내 관련주 동반 강세', [0.02, 0.04], [0.002, 0.004], [1, 3]),
  ],
  bad: [
    t('{sector} 업종 규제 강화 법안 발의', [0.02, 0.05], [0.002, 0.005], [3, 5]),
    t('{sector} 업황 둔화 우려 확산', [0.015, 0.04], [0.002, 0.004], [2, 4]),
    t('해외 {sector} 기업 실적 부진에 투자심리 위축', [0.02, 0.04], [0.002, 0.004], [1, 3]),
  ],
};

const MARKET_NEWS: TemplateSet = {
  good: [
    t('한국은행, 기준금리 인하 단행', [0.01, 0.025], [0.001, 0.003], [3, 6]),
    t('외국인 투자자 대규모 순매수 지속', [0.008, 0.02], [0.001, 0.003], [2, 4]),
    t('수출 실적 역대 최대… 경기 회복 기대', [0.01, 0.02], [0.001, 0.003], [3, 5]),
  ],
  bad: [
    t('한국은행, 기준금리 인상 단행', [0.01, 0.025], [0.001, 0.003], [3, 6]),
    t('글로벌 경기 침체 우려에 외국인 매도세', [0.01, 0.025], [0.001, 0.003], [2, 4]),
    t('환율 급등… 금융시장 불안 확대', [0.008, 0.02], [0.001, 0.003], [2, 4]),
  ],
};

const MAJOR_EVENTS: TemplateSet = {
  good: [t('[속보] AI 혁명 기대감 폭발… 증시 과열 양상', [0.05, 0.08], [0.006, 0.01], [4, 7])],
  bad: [t('[속보] 글로벌 금융위기 공포 확산… 증시 폭락', [0.07, 0.12], [0.008, 0.012], [3, 6])],
};

/** 하루 평균 발생 건수. */
const DAILY_RATES = {
  stock: 0.5,
  sector: 0.15,
  market: 0.06,
  major: 1 / 150,
} as const;

/** 뉴스 피드에 보관하는 최대 건수. */
export const MAX_NEWS = 150;

export type NewsState = {
  news: NewsItem[];
  effects: MarketEffect[];
  nextNewsId: number;
};

export type GeneratedNews = {
  item: NewsItem;
  effect: MarketEffect;
  /** 대상 종목별 즉시 충격 (로그 수익률) */
  shocks: Record<string, number>;
};

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng.float() * items.length)];
}

function between(rng: Rng, [min, max]: Range): number {
  return rng.range(min, max);
}

/** 효과가 해당 종목에 주는 영향 배수 (시장 뉴스는 베타만큼). 0이면 무관. */
export function effectWeight(effect: Pick<MarketEffect, 'scope' | 'targetId'>, def: StockDef): number {
  if (effect.scope === 'market') return def.beta;
  if (effect.scope === 'sector') return effect.targetId === def.sector ? 1 : 0;
  return effect.targetId === def.id ? 1 : 0;
}

/** 이번 틱에 발생한 뉴스를 만든다. 대부분의 틱에서는 빈 배열이다. */
export function generateNews(
  rng: Rng,
  difficulty: keyof typeof DIFFICULTIES,
  day: number,
  tick: number,
  firstId: number,
): GeneratedNews[] {
  const config = DIFFICULTIES[difficulty];
  const generated: GeneratedNews[] = [];

  const roll = (scope: keyof typeof DAILY_RATES) => rng.float() < DAILY_RATES[scope] / TICKS_PER_DAY;
  const sentiment = (): Sentiment => (rng.float() < config.badNewsRatio ? 'bad' : 'good');

  const create = (
    scope: NewsScope,
    targetId: string | null,
    mood: Sentiment,
    template: Template,
    headline: string,
    major: boolean,
  ) => {
    const sign = mood === 'good' ? 1 : -1;
    const shock = sign * between(rng, template.shock) * config.newsImpact;
    const dailyDrift = sign * between(rng, template.drift) * config.newsImpact;
    const remainingDays = Math.round(between(rng, template.days));
    const effect: MarketEffect = { scope, targetId, dailyDrift, remainingDays };
    const shocks: Record<string, number> = {};
    for (const def of STOCKS) {
      const weight = effectWeight(effect, def);
      if (weight !== 0) shocks[def.id] = shock * weight;
    }
    const item: NewsItem = {
      id: firstId + generated.length,
      day,
      tick,
      scope,
      targetId,
      sentiment: mood,
      headline,
      major,
    };
    generated.push({ item, effect, shocks });
  };

  if (roll('major')) {
    const mood = sentiment();
    const template = pick(rng, MAJOR_EVENTS[mood]);
    create('market', null, mood, template, template.headline, true);
  }
  if (roll('market')) {
    const mood = sentiment();
    const template = pick(rng, MARKET_NEWS[mood]);
    create('market', null, mood, template, template.headline, false);
  }
  if (roll('sector')) {
    const mood = sentiment();
    const sector = pick(rng, Object.keys(SECTORS) as SectorId[]);
    const template = pick(rng, SECTOR_NEWS[mood]);
    create('sector', sector, mood, template, template.headline.replace('{sector}', SECTORS[sector]), false);
  }
  if (roll('stock')) {
    const mood = sentiment();
    const def = pick(rng, STOCKS);
    const special = SECTOR_STOCK_NEWS[def.sector]?.[mood] ?? [];
    const template = pick(rng, [...STOCK_NEWS[mood], ...special]);
    create('stock', def.id, mood, template, template.headline.replace('{name}', def.name), false);
  }
  return generated;
}

/** 하루가 지나면 효과의 남은 일수를 줄이고 끝난 효과를 지운다. */
export function ageEffects(effects: MarketEffect[]): MarketEffect[] {
  return effects
    .map((effect) => ({ ...effect, remainingDays: effect.remainingDays - 1 }))
    .filter((effect) => effect.remainingDays > 0);
}

/** 뉴스가 해당 종목과 관련 있는지 (종목·소속 업종·시장 전체). */
export function isNewsRelated(item: NewsItem, def: StockDef): boolean {
  return effectWeight(item, def) !== 0;
}
