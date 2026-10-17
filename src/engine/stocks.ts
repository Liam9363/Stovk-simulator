/** 가상 종목 목록. 실제 기업과 무관한 가상의 회사들이다. */

export type SectorId = 'tech' | 'bio' | 'finance' | 'energy' | 'consumer' | 'entertainment';

export const SECTORS: Record<SectorId, string> = {
  tech: 'IT·반도체',
  bio: '바이오',
  finance: '금융',
  energy: '에너지',
  consumer: '소비재',
  entertainment: '엔터',
};

export type StockDef = {
  id: string;
  name: string;
  sector: SectorId;
  /** 게임 시작 전(워밍업 이전) 기준가 */
  basePrice: number;
  /** 시장 요인 민감도 */
  beta: number;
  /** 기대 성장률 (연율) */
  drift: number;
  /** 개별 변동성 (연율) */
  volatility: number;
  /** 연간 배당수익률 (0이면 무배당) */
  dividendYield: number;
  description: string;
};

export const STOCKS: StockDef[] = [
  { id: 'HNEL', name: '하늘전자', sector: 'tech', basePrice: 72_000, beta: 1.1, drift: 0.08, volatility: 0.28, dividendYield: 0.02, description: '메모리 반도체와 스마트폰을 만드는 대형 전자 기업.' },
  { id: 'BTSF', name: '빛소프트', sector: 'tech', basePrice: 185_000, beta: 1.3, drift: 0.12, volatility: 0.42, dividendYield: 0.005, description: '클라우드와 AI 플랫폼을 운영하는 소프트웨어 회사.' },
  { id: 'NRCH', name: '누리칩스', sector: 'tech', basePrice: 9_800, beta: 1.5, drift: 0.1, volatility: 0.6, dividendYield: 0, description: '시스템 반도체 설계 스타트업. 성장성이 높지만 변동이 크다.' },
  { id: 'SMBO', name: '새미바이오', sector: 'bio', basePrice: 54_000, beta: 0.8, drift: 0.1, volatility: 0.55, dividendYield: 0, description: '항암 신약 후보물질을 개발 중인 바이오 기업.' },
  { id: 'HMPH', name: '한마음제약', sector: 'bio', basePrice: 31_500, beta: 0.6, drift: 0.05, volatility: 0.3, dividendYield: 0.025, description: '복제약과 일반의약품을 판매하는 안정적인 제약사.' },
  { id: 'GNGN', name: '진젠', sector: 'bio', basePrice: 4_150, beta: 1.0, drift: 0.04, volatility: 0.75, dividendYield: 0, description: '유전자 치료제 연구소에서 출발한 소형 바이오 벤처.' },
  { id: 'DHFG', name: '든든금융지주', sector: 'finance', basePrice: 48_500, beta: 0.9, drift: 0.05, volatility: 0.22, dividendYield: 0.05, description: '은행·카드·보험을 거느린 금융지주회사.' },
  { id: 'BRSC', name: '바른증권', sector: 'finance', basePrice: 12_300, beta: 1.3, drift: 0.06, volatility: 0.35, dividendYield: 0.04, description: '시장 거래대금에 실적이 좌우되는 증권사.' },
  { id: 'HSIN', name: '해솔보험', sector: 'finance', basePrice: 236_000, beta: 0.7, drift: 0.04, volatility: 0.2, dividendYield: 0.045, description: '생명·손해보험을 함께 운영하는 보험사.' },
  { id: 'BDEN', name: '바다에너지', sector: 'energy', basePrice: 128_000, beta: 0.9, drift: 0.04, volatility: 0.3, dividendYield: 0.035, description: '정유와 석유화학 사업을 하는 에너지 기업.' },
  { id: 'HSRE', name: '햇살태양광', sector: 'energy', basePrice: 27_400, beta: 1.2, drift: 0.09, volatility: 0.5, dividendYield: 0, description: '태양광 패널과 발전소를 운영하는 신재생 에너지 기업.' },
  { id: 'PRNG', name: '푸른가스', sector: 'energy', basePrice: 38_900, beta: 0.5, drift: 0.03, volatility: 0.18, dividendYield: 0.055, description: '도시가스를 공급하는 공공 성격의 유틸리티 기업.' },
  { id: 'MSFD', name: '맛나식품', sector: 'consumer', basePrice: 342_000, beta: 0.5, drift: 0.05, volatility: 0.2, dividendYield: 0.015, description: '라면과 과자로 유명한 국민 식품 기업.' },
  { id: 'DLMT', name: '달빛마트', sector: 'consumer', basePrice: 86_400, beta: 0.7, drift: 0.03, volatility: 0.26, dividendYield: 0.03, description: '전국에 매장을 둔 대형 유통 체인.' },
  { id: 'BMCO', name: '봄코스메틱', sector: 'consumer', basePrice: 15_600, beta: 1.0, drift: 0.07, volatility: 0.4, dividendYield: 0.01, description: '해외 수출 비중이 높은 화장품 브랜드.' },
  { id: 'SPRK', name: '반짝엔터', sector: 'entertainment', basePrice: 64_700, beta: 1.2, drift: 0.09, volatility: 0.45, dividendYield: 0.008, description: '인기 아이돌 그룹을 보유한 연예기획사.' },
  { id: 'DLGM', name: '다람게임즈', sector: 'entertainment', basePrice: 21_950, beta: 1.3, drift: 0.08, volatility: 0.52, dividendYield: 0, description: '모바일 게임 개발사. 신작 흥행에 따라 주가가 출렁인다.' },
  { id: 'NOLA', name: '놀아웹툰', sector: 'entertainment', basePrice: 1_870, beta: 1.4, drift: 0.06, volatility: 0.7, dividendYield: 0, description: '웹툰·웹소설 플랫폼을 운영하는 소형 콘텐츠 기업.' },
];

export const STOCK_BY_ID: Record<string, StockDef> = Object.fromEntries(
  STOCKS.map((stock) => [stock.id, stock]),
);
