/** 주식 용어 사전. 화면의 ⓘ 툴팁과 용어 사전 화면에서 함께 쓴다. */

export type TermId =
  | 'market_order'
  | 'limit_order'
  | 'pending_order'
  | 'tick_size'
  | 'price_limit'
  | 'prev_close'
  | 'ohlc'
  | 'avg_price'
  | 'unrealized_pnl'
  | 'realized_pnl'
  | 'return_rate'
  | 'fee'
  | 'sell_tax'
  | 'dividend'
  | 'dividend_yield'
  | 'ex_dividend'
  | 'dividend_tax'
  | 'market_index'
  | 'sector'
  | 'diversification'
  | 'orderable_cash'
  | 'news_impact';

export type Term = {
  id: TermId;
  term: string;
  /** 툴팁에 보여줄 한두 문장 요약 */
  summary: string;
  /** 용어 사전에 보여줄 자세한 설명 (게임 속 규칙 포함) */
  detail: string;
};

export const GLOSSARY: Term[] = [
  {
    id: 'market_order',
    term: '시장가 주문',
    summary: '가격을 정하지 않고 지금 거래되는 가격(현재가)으로 바로 사고파는 주문입니다.',
    detail: '빨리 체결되는 대신 가격을 고를 수 없습니다. 이 게임에서는 주문하는 순간의 현재가로 즉시 체결됩니다.',
  },
  {
    id: 'limit_order',
    term: '지정가 주문',
    summary: '원하는 가격을 정해 두고, 그 가격 이하(매수)나 이상(매도)이 되면 체결되는 주문입니다.',
    detail:
      '원하는 가격에 거래할 수 있지만 가격이 오지 않으면 체결되지 않습니다. 이 게임에서는 조건이 맞는 순간의 현재가로 체결되고, 당일 장이 끝나면 미체결 주문은 자동 취소됩니다.',
  },
  {
    id: 'pending_order',
    term: '미체결 주문',
    summary: '넣어 두었지만 아직 거래가 이뤄지지 않은 지정가 주문입니다.',
    detail:
      '미체결 매수 주문 금액(수수료 포함)은 현금이 묶여 다른 주문에 쓸 수 없고, 미체결 매도 주문 수량도 묶입니다. 언제든 취소할 수 있습니다.',
  },
  {
    id: 'tick_size',
    term: '호가 단위',
    summary: '주문할 수 있는 가격의 최소 간격입니다. 가격대가 높을수록 커집니다.',
    detail:
      '2천 원 미만 1원, 5천 원 미만 5원, 2만 원 미만 10원, 5만 원 미만 50원, 20만 원 미만 100원, 50만 원 미만 500원, 그 이상 1,000원 단위입니다.',
  },
  {
    id: 'price_limit',
    term: '상한가 · 하한가',
    summary: '하루에 오르거나 내릴 수 있는 한계 가격입니다. 전일 종가의 ±30%입니다.',
    detail: '한국 주식시장의 가격제한폭 제도입니다. 상한가에 도달한 종목은 그날 더 오를 수 없고, 하한가도 마찬가지입니다.',
  },
  {
    id: 'prev_close',
    term: '전일 종가',
    summary: '어제 장이 끝날 때의 마지막 가격입니다. 오늘 등락률과 상하한가의 기준이 됩니다.',
    detail: '배당락이 있는 날에는 전일 종가에서 배당금만큼 낮춘 가격이 기준가가 됩니다.',
  },
  {
    id: 'ohlc',
    term: '시가 · 고가 · 저가',
    summary: '시가는 오늘 첫 가격, 고가는 오늘 가장 높았던 가격, 저가는 가장 낮았던 가격입니다.',
    detail: '여기에 종가(마지막 가격)를 더한 네 가지 가격으로 하루 주가 흐름을 요약합니다.',
  },
  {
    id: 'avg_price',
    term: '평균 매입가',
    summary: '지금 보유한 주식을 평균 얼마에 샀는지 나타냅니다.',
    detail:
      '여러 번 나눠 사면 산 금액을 수량으로 평균 냅니다. 팔아도 평균 매입가는 바뀌지 않습니다. 이 게임에서는 수수료를 포함하지 않습니다.',
  },
  {
    id: 'unrealized_pnl',
    term: '평가손익',
    summary: '아직 팔지 않은 주식의 (현재가 − 평균 매입가) × 수량입니다.',
    detail: '팔기 전까지는 확정되지 않은 장부상의 손익입니다. 수수료와 세금은 빠져 있습니다.',
  },
  {
    id: 'realized_pnl',
    term: '실현손익',
    summary: '주식을 팔아서 확정된 손익입니다.',
    detail: '매도 금액에서 수수료와 세금을 빼고, 평균 매입가 × 매도 수량을 뺀 값입니다.',
  },
  {
    id: 'return_rate',
    term: '수익률',
    summary: '처음 자금 대비 얼마나 늘었거나 줄었는지를 비율로 나타냅니다.',
    detail: '총자산 수익률 = (현재 총자산 ÷ 시작 자금) − 1. 총자산은 현금과 보유 주식 평가금액의 합입니다.',
  },
  {
    id: 'fee',
    term: '매매 수수료',
    summary: '주식을 사고팔 때마다 증권사에 내는 비용입니다. 이 게임에서는 거래 금액의 0.015%입니다.',
    detail: '매수와 매도 모두 부과되며 원 단위 미만은 버립니다. 자주 사고팔수록 수수료가 쌓입니다.',
  },
  {
    id: 'sell_tax',
    term: '증권거래세',
    summary: '주식을 팔 때만 내는 세금입니다. 이 게임에서는 매도 금액의 0.18%입니다.',
    detail: '이익이 났는지와 상관없이 매도 금액에 부과됩니다. 원 단위 미만은 버립니다.',
  },
  {
    id: 'dividend',
    term: '배당',
    summary: '회사가 번 돈의 일부를 주주에게 나눠 주는 것입니다.',
    detail: '이 게임에서는 배당 종목이 분기(62거래일)마다 배당일 장 마감 시점 보유자에게 배당금을 지급합니다.',
  },
  {
    id: 'dividend_yield',
    term: '배당수익률',
    summary: '주가 대비 1년 동안 받는 배당금의 비율입니다.',
    detail: '예: 주가 1만 원, 연 배당 500원이면 배당수익률 5%. 이 게임은 연 배당수익률의 1/4씩 분기마다 지급합니다.',
  },
  {
    id: 'ex_dividend',
    term: '배당락',
    summary: '배당 기준일이 지나 배당 받을 권리가 사라지면서 주가 기준이 배당금만큼 낮아지는 것입니다.',
    detail: '배당을 받은 다음 날 기준가가 배당금만큼 내려가므로, 배당만 노린 단기 매매로는 이득을 보기 어렵습니다.',
  },
  {
    id: 'dividend_tax',
    term: '배당소득세',
    summary: '배당금에 붙는 세금입니다. 15.4%를 떼고 나머지가 입금됩니다.',
    detail: '배당소득세 14%와 지방소득세 1.4%를 합한 세율입니다.',
  },
  {
    id: 'market_index',
    term: '종합지수',
    summary: '시장 전체 주가 흐름을 하나의 숫자로 나타낸 지표입니다.',
    detail: '이 게임의 가상 종합지수는 모든 종목의 기준가 대비 등락을 평균 낸 값입니다(기준 1,000).',
  },
  {
    id: 'sector',
    term: '업종',
    summary: '비슷한 사업을 하는 회사들의 묶음입니다. 같은 업종 주가는 함께 움직이는 경향이 있습니다.',
    detail: '이 게임에는 IT·반도체, 바이오, 금융, 에너지, 소비재, 엔터 6개 업종이 있고, 업종 뉴스는 해당 업종 전체에 영향을 줍니다.',
  },
  {
    id: 'diversification',
    term: '분산투자',
    summary: '여러 종목·업종에 나눠 투자해 한 종목의 악재에 크게 흔들리지 않게 하는 방법입니다.',
    detail: '"계란을 한 바구니에 담지 말라"는 격언으로 유명합니다. 대신 한 종목이 크게 오를 때의 이득도 나눠집니다.',
  },
  {
    id: 'orderable_cash',
    term: '주문 가능 현금',
    summary: '현금 중 미체결 매수 주문에 묶이지 않아 지금 주문에 쓸 수 있는 금액입니다.',
    detail: '매수할 때는 주문 금액에 수수료까지 더한 금액이 필요합니다.',
  },
  {
    id: 'news_impact',
    term: '뉴스와 주가',
    summary: '호재는 주가를 올리고 악재는 내립니다. 뉴스 직후 바로 움직이고, 며칠간 같은 방향으로 이어지기도 합니다.',
    detail:
      '종목 뉴스는 그 종목에, 업종 뉴스는 업종 전체에, 시장 뉴스는 모든 종목에 영향을 줍니다. 드물게 폭락장이나 버블 같은 대형 이벤트도 일어납니다.',
  },
];

export const TERM_BY_ID = Object.fromEntries(GLOSSARY.map((t) => [t.id, t])) as Record<TermId, Term>;

/** 용어 사전 검색 (용어명·요약에서 공백 무시하고 찾는다). */
export function searchGlossary(query: string): Term[] {
  const q = query.replace(/\s+/g, '').toLowerCase();
  if (!q) return GLOSSARY;
  return GLOSSARY.filter((t) => `${t.term}${t.summary}`.replace(/\s+/g, '').toLowerCase().includes(q));
}
