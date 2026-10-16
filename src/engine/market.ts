/**
 * 가상 시장 시세 엔진.
 *
 * 각 틱의 로그 수익률 = beta × 시장 요인 + 업종 요인 + 개별 요인 (+ 기대 성장률).
 * 내부적으로 연속값인 `fair`(적정가)를 따라가고, 화면에 보이는 `price`는
 * 상하한가 안에서 호가 단위로 반올림한 값이다.
 */
import {
  DIFFICULTIES,
  type Difficulty,
  INDEX_BASE,
  MARKET_DRIFT,
  MARKET_VOLATILITY,
  SECTOR_VOLATILITY,
  TICKS_PER_DAY,
  TRADING_DAYS_PER_YEAR,
  WARMUP_DAYS,
} from './config';
import { dividendPerShare, isDividendDay } from './dividend';
import { priceLimits, roundToTick } from './krx';
import { ageEffects, effectWeight, generateNews, MAX_NEWS, type NewsState } from './news';
import { Rng, type RngState } from './rng';
import { SECTORS, type SectorId, STOCKS, STOCK_BY_ID } from './stocks';

export type Candle = { open: number; high: number; low: number; close: number };

export type StockState = {
  /** 연속 적정가 (내부용) */
  fair: number;
  /** 현재가 (호가 단위) */
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  /** 오늘 장중 틱별 가격 */
  intraday: number[];
  /** 지난 거래일 일봉 (워밍업 포함, 오래된 순) */
  history: Candle[];
};

export type MarketState = NewsState & {
  /** 현재 거래일 (1일차부터 시작, 워밍업 기간은 0 이하) */
  day: number;
  /** 오늘 진행된 틱 수 (0 ~ TICKS_PER_DAY) */
  tick: number;
  rng: RngState;
  difficulty: Difficulty;
  stocks: Record<string, StockState>;
  /** 시장 지수 일별 종가 */
  indexHistory: number[];
  /** 오늘 장중 지수 */
  indexIntraday: number[];
};

const TICK_DT = 1 / (TRADING_DAYS_PER_YEAR * TICKS_PER_DAY);
const SQRT_DT = Math.sqrt(TICK_DT);

function newStockState(fair: number, prevClose: number): StockState {
  const price = clampToLimits(fair, prevClose);
  return {
    fair,
    price,
    prevClose,
    open: price,
    high: price,
    low: price,
    intraday: [price],
    history: [],
  };
}

function clampToLimits(fair: number, prevClose: number): number {
  const { upper, lower } = priceLimits(prevClose);
  return Math.min(upper, Math.max(lower, roundToTick(fair)));
}

/** 시장 지수: 종목별 기준가 대비 등락의 평균. */
export function marketIndex(market: MarketState): number {
  let sum = 0;
  for (const stock of STOCKS) {
    sum += market.stocks[stock.id].price / stock.basePrice;
  }
  return (INDEX_BASE * sum) / STOCKS.length;
}

/** 지수의 전일 종가. */
export function previousIndex(market: MarketState): number {
  const history = market.indexHistory;
  return history.length > 0 ? history[history.length - 1] : INDEX_BASE;
}

/** 시장 상태를 한 틱 전진시킨다. 입력 상태는 변경하지 않는다. */
export function advanceTick(market: MarketState): MarketState {
  const next = cloneForTick(market);
  const rng = new Rng(next.rng);
  const volMult = DIFFICULTIES[next.difficulty].volatility;

  const marketShock =
    (MARKET_DRIFT - 0.5 * MARKET_VOLATILITY ** 2) * TICK_DT +
    MARKET_VOLATILITY * volMult * SQRT_DT * rng.normal();
  const sectorShocks = {} as Record<SectorId, number>;
  for (const sector of Object.keys(SECTORS) as SectorId[]) {
    sectorShocks[sector] = SECTOR_VOLATILITY * volMult * SQRT_DT * rng.normal();
  }

  // 뉴스 발생: 즉시 충격은 이번 틱 수익률에 더하고, 추세 효과는 목록에 추가한다.
  const newsShocks: Record<string, number> = {};
  const generated = generateNews(rng, next.difficulty, next.day, next.tick + 1, next.nextNewsId);
  if (generated.length > 0) {
    next.news = [...next.news, ...generated.map((g) => g.item)].slice(-MAX_NEWS);
    next.effects = [...next.effects, ...generated.map((g) => g.effect)];
    next.nextNewsId += generated.length;
    for (const g of generated) {
      for (const [id, shock] of Object.entries(g.shocks)) {
        newsShocks[id] = (newsShocks[id] ?? 0) + shock;
      }
    }
  }

  for (const def of STOCKS) {
    const stock = next.stocks[def.id];
    const sigma = def.volatility * volMult;
    const idio = (def.drift - 0.5 * sigma ** 2) * TICK_DT + sigma * SQRT_DT * rng.normal();
    let effectDrift = 0;
    for (const effect of next.effects) {
      effectDrift += (effect.dailyDrift * effectWeight(effect, def)) / TICKS_PER_DAY;
    }
    const logReturn =
      def.beta * marketShock + sectorShocks[def.sector] + idio + effectDrift + (newsShocks[def.id] ?? 0);

    // 적정가도 가격제한폭 밖으로는 나가지 않게 묶어 둔다 (상한가 이후 급락 방지).
    const { upper, lower } = priceLimits(stock.prevClose);
    stock.fair = Math.min(upper, Math.max(lower, stock.fair * Math.exp(logReturn)));
    stock.price = clampToLimits(stock.fair, stock.prevClose);
    stock.high = Math.max(stock.high, stock.price);
    stock.low = Math.min(stock.low, stock.price);
    stock.intraday.push(stock.price);
  }

  next.rng = rng.state;
  next.tick += 1;
  next.indexIntraday = [...market.indexIntraday, marketIndex(next)];
  if (next.tick >= TICKS_PER_DAY) {
    closeDay(next);
  }
  return next;
}

/** 장 마감: 일봉을 기록하고(배당락 반영) 다음 거래일을 연다. `market`을 직접 변경한다. */
function closeDay(market: MarketState) {
  const closingIndex = marketIndex(market);
  market.indexHistory = [...market.indexHistory, closingIndex];
  market.indexIntraday = [closingIndex];
  for (const def of STOCKS) {
    const stock = market.stocks[def.id];
    const close = stock.price;
    const candle = { open: stock.open, high: stock.high, low: stock.low, close };
    stock.history = [...stock.history, candle];

    // 배당락: 다음 거래일 기준가를 주당 배당금만큼 낮춘다.
    let base = close;
    if (isDividendDay(market.day)) {
      const dps = dividendPerShare(def, close);
      if (dps > 0) {
        base = Math.max(1, roundToTick(close - dps));
        stock.fair *= base / close;
      }
    }
    stock.prevClose = base;
    stock.price = base;
    stock.open = base;
    stock.high = base;
    stock.low = base;
    stock.intraday = [base];
  }
  market.effects = ageEffects(market.effects);
  market.day += 1;
  market.tick = 0;
}

/** 틱 진행 시 바뀌는 부분만 복사한다. 일봉·지수 배열은 closeDay에서 새 배열로 교체된다. */
function cloneForTick(market: MarketState): MarketState {
  const stocks: Record<string, StockState> = {};
  for (const [id, stock] of Object.entries(market.stocks)) {
    stocks[id] = { ...stock, intraday: [...stock.intraday] };
  }
  return { ...market, stocks };
}

/** 새 시장을 만들고 워밍업 기간의 과거 시세를 생성한다. 반환 시점은 1일차 장 시작. */
export function createMarket(seed: number, difficulty: Difficulty): MarketState {
  const rng = new Rng(seed);
  const stocks: Record<string, StockState> = {};
  for (const def of STOCKS) {
    // 종목마다 시작가를 조금씩 흔들어 매 게임 다른 출발점을 만든다.
    const start = roundToTick(def.basePrice * rng.range(0.85, 1.15));
    stocks[def.id] = newStockState(start, start);
  }

  let market: MarketState = {
    day: 1 - WARMUP_DAYS,
    tick: 0,
    rng: rng.state,
    difficulty,
    stocks,
    indexHistory: [],
    indexIntraday: [],
    news: [],
    effects: [],
    nextNewsId: 1,
  };
  market.indexIntraday = [marketIndex(market)];
  for (let i = 0; i < WARMUP_DAYS * TICKS_PER_DAY; i++) {
    market = advanceTick(market);
  }
  return market;
}

/** 전일 대비 등락률. */
export function changeRate(stock: StockState): number {
  return stock.price / stock.prevClose - 1;
}

export function getStockDef(id: string) {
  const def = STOCK_BY_ID[id];
  if (!def) throw new Error(`Unknown stock: ${id}`);
  return def;
}
