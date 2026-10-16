/**
 * 첫 게임 튜토리얼 단계. 플레이어의 행동(화면 이동, 매수, 시간 진행, 매도)을 보고
 * 다음 단계로 넘어간다. 단계는 앞으로만 진행한다.
 */
import type { GameState } from './game';

export type TutorialStep = 'pick_stock' | 'open_order' | 'place_buy' | 'advance_time' | 'sell' | 'done';

export const TUTORIAL_STEPS: TutorialStep[] = [
  'pick_stock',
  'open_order',
  'place_buy',
  'advance_time',
  'sell',
  'done',
];

export const TUTORIAL_MESSAGES: Record<TutorialStep, { title: string; body: string }> = {
  pick_stock: {
    title: '종목 고르기',
    body: '시간은 잠시 멈춰 두었어요. 마켓 목록에서 마음에 드는 종목을 하나 눌러 보세요.',
  },
  open_order: {
    title: '주문 열기',
    body: '차트와 시세를 살펴보고, 아래쪽 빨간 [매수] 버튼을 눌러 보세요.',
  },
  place_buy: {
    title: '매수하기',
    body: '수량을 입력하거나 10%·25% 버튼을 누른 뒤 매수 버튼을 눌러 보세요. 수수료(0.015%)가 함께 붙어요.',
  },
  advance_time: {
    title: '시간 흘려보내기',
    body: '위쪽 ▶ 또는 2x·4x 버튼으로 시간을 흘려보내세요. 하루(1배속 1분)가 지나면 다음 단계로 넘어가요.',
  },
  sell: {
    title: '매도하기',
    body: '하루가 지났어요! 산 종목에 들어가 [매도]로 팔아 보세요. 팔 때는 거래세(0.18%)도 붙어요.',
  },
  done: {
    title: '튜토리얼 완료 🎉',
    body: '기본기는 끝! 지정가 주문, 뉴스, 배당도 활용해 보세요. 모르는 용어는 ⓘ를 누르면 설명이 나와요.',
  },
};

export type TutorialContext = {
  pathname: string;
  game: GameState | null;
};

/** 현재 단계와 상황을 보고 넘어갈 단계를 돌려준다 (변화 없으면 그대로). */
export function advanceTutorial(step: TutorialStep, { pathname, game }: TutorialContext): TutorialStep {
  if (!game) return step;
  const trades = game.portfolio.trades;
  const firstBuy = trades.find((t) => t.side === 'buy');

  switch (step) {
    case 'pick_stock':
      if (firstBuy) return advanceTutorial('advance_time', { pathname, game });
      return pathname.startsWith('/stock/') ? 'open_order' : step;
    case 'open_order':
      if (firstBuy) return advanceTutorial('advance_time', { pathname, game });
      return pathname === '/order' ? 'place_buy' : step;
    case 'place_buy':
      return firstBuy ? advanceTutorial('advance_time', { pathname, game }) : step;
    case 'advance_time':
      return firstBuy && game.market.day > firstBuy.day ? advanceTutorial('sell', { pathname, game }) : step;
    case 'sell':
      return trades.some((t) => t.side === 'sell') ? 'done' : step;
    case 'done':
      return step;
  }
}
