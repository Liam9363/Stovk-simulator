/** 업적. 게임 간에 누적되며 한 번 달성하면 영구히 유지된다. */
import { totalAssets, type GameState } from './game';
import { priceLimits } from './krx';
import { STOCK_BY_ID } from './stocks';
import { tradingTotals } from './portfolio';

export type AchievementDef = {
  id: string;
  title: string;
  description: string;
  /** 진행 중 상태만으로 판정 가능하면 true를 돌려준다. 끝난 게임이면 game.result가 있다. */
  check: (game: GameState) => boolean;
};

const returnRate = (game: GameState) => totalAssets(game) / game.startCash - 1;

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_buy',
    title: '첫 발걸음',
    description: '처음으로 주식을 매수했다.',
    check: (game) => game.portfolio.trades.some((t) => t.side === 'buy'),
  },
  {
    id: 'first_profit',
    title: '수익 실현',
    description: '주식을 팔아 처음으로 이익을 냈다.',
    check: (game) => game.portfolio.trades.some((t) => (t.realizedPnl ?? 0) > 0),
  },
  {
    id: 'limit_trader',
    title: '기다림의 미학',
    description: '한 게임에서 지정가 주문을 5번 체결했다.',
    check: (game) => game.portfolio.trades.filter((t) => t.orderType === 'limit').length >= 5,
  },
  {
    id: 'diversified',
    title: '계란은 여러 바구니에',
    description: '5개 이상 업종의 주식을 동시에 보유했다.',
    check: (game) =>
      new Set(Object.keys(game.portfolio.holdings).map((id) => STOCK_BY_ID[id].sector)).size >= 5,
  },
  {
    id: 'limit_up',
    title: '상한가 따라잡기',
    description: '상한가에 도달한 종목을 보유했다.',
    check: (game) =>
      Object.keys(game.portfolio.holdings).some((id) => {
        const stock = game.market.stocks[id];
        return stock.price >= priceLimits(stock.prevClose).upper;
      }),
  },
  {
    id: 'return_10',
    title: '두 자릿수 수익',
    description: '총 수익률 +10%를 달성했다.',
    check: (game) => returnRate(game) >= 0.1,
  },
  {
    id: 'return_50',
    title: '고수의 길',
    description: '총 수익률 +50%를 달성했다.',
    check: (game) => returnRate(game) >= 0.5,
  },
  {
    id: 'return_100',
    title: '더블',
    description: '총자산을 2배로 불렸다.',
    check: (game) => returnRate(game) >= 1,
  },
  {
    id: 'dividend_collector',
    title: '배당 생활자',
    description: '한 게임에서 세후 배당금 50만 원을 받았다.',
    check: (game) => tradingTotals(game.portfolio).dividendsNet >= 500_000,
  },
  {
    id: 'comeback',
    title: '기사회생',
    description: '수익률 -20% 아래로 떨어졌다가 수익으로 게임을 마쳤다.',
    check: (game) => !!game.result && game.flags.lowestReturn <= -0.2 && game.result.returnRate > 0,
  },
  {
    id: 'crash_survivor',
    title: '폭락장 생존자',
    description: '폭락장을 겪은 게임을 수익으로 마쳤다.',
    check: (game) => !!game.result && game.flags.crashDay !== null && game.result.returnRate > 0,
  },
  {
    id: 'period_clear',
    title: '완주',
    description: '기간제 게임을 수익으로 끝까지 마쳤다.',
    check: (game) => game.result?.outcome === 'completed' && game.result.returnRate > 0,
  },
  {
    id: 'target_clear',
    title: '목표 달성',
    description: '목표 달성형 게임을 클리어했다.',
    check: (game) => game.result?.outcome === 'cleared',
  },
  {
    id: 'grade_s',
    title: 'S등급',
    description: '게임을 S등급으로 마쳤다.',
    check: (game) => game.result?.grade === 'S',
  },
  {
    id: 'hard_winner',
    title: '역경을 이겨내고',
    description: '어려움 난이도 게임을 수익으로 마쳤다.',
    check: (game) => game.difficulty === 'hard' && !!game.result && game.result.returnRate > 0,
  },
  {
    id: 'endless_100',
    title: '장기 투자자',
    description: '무한 모드에서 100거래일을 보냈다.',
    check: (game) => game.mode.type === 'endless' && game.market.day > 100,
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/** 아직 달성하지 않은 업적 중 지금 조건을 만족하는 것들. */
export function newlyUnlocked(game: GameState, unlocked: Record<string, unknown>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !(a.id in unlocked) && a.check(game));
}
