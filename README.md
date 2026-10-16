# 모의 주식투자 게임 (Stock Simulator)

가상의 한국 주식시장에서 가상 자금으로 투자하는 싱글 플레이 모바일 게임입니다.
기획 문서는 [docs/PRD.md](docs/PRD.md)를 참고하세요.

## 실행

```bash
npm install
npx expo start      # QR 코드를 Expo Go 앱으로 스캔하면 폰에서 실행
npm run web         # 브라우저에서 실행
```

## 개발

```bash
npm test            # 엔진 단위 테스트 (Jest)
npm run typecheck   # 타입 체크
npm run lint        # ESLint
```

## 구조

```
src/
  engine/       게임 로직 (순수 TypeScript, UI 의존성 없음)
    config.ts     밸런스 설정값 (난이도, 틱 수, 변동성 등)
    rng.ts        시드 기반 난수 (게임 재현용)
    krx.ts        호가 단위, 상하한가
    stocks.ts     가상 종목·업종 정의
    market.ts     시세 엔진
    portfolio.ts  계좌·주문 체결 (시장가·지정가, 수수료·세금, 배당 지급)
    dividend.ts   배당 일정·주당 배당금
    news.ts       뉴스·시장 이벤트 (즉시 충격 + 며칠간 추세)
    modes.ts      게임 모드, 종료 판정, 등급
    records.ts    지난 게임 기록
    achievements.ts 업적
    glossary.ts   용어 사전 데이터
    tutorial.ts   튜토리얼 단계 진행 규칙
    game.ts       게임 상태와 진행
  store/        Zustand 스토어, AsyncStorage 저장 (진행 중 게임 / 기록·업적)
  hooks/        게임 시계, 테마
  components/   공용 UI (HUD, 차트 등)
  app/          화면 (Expo Router)
```

## 진행 상황

- [x] M1 — 코어: 시세 엔진, 마켓/종목 상세, 시장가 매매, 포트폴리오, 자동저장
- [x] M2 — 거래 확장: 지정가, 수수료·세금, 배당, 거래 내역
- [x] M3 — 게임화: 게임 모드, 뉴스·이벤트, 결과·기록, 업적
- [x] M4 — 온보딩: 튜토리얼, 용어 사전
