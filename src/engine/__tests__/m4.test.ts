import { TICKS_PER_DAY } from '../config';
import { createGame, type GameState, submitOrder, tickGame } from '../game';
import { GLOSSARY, searchGlossary, TERM_BY_ID } from '../glossary';
import { advanceTutorial, TUTORIAL_MESSAGES, TUTORIAL_STEPS } from '../tutorial';

describe('glossary', () => {
  it('has unique ids and non-empty text', () => {
    expect(new Set(GLOSSARY.map((t) => t.id)).size).toBe(GLOSSARY.length);
    for (const term of GLOSSARY) {
      expect(term.term.length).toBeGreaterThan(0);
      expect(term.summary.length).toBeGreaterThan(0);
      expect(term.detail.length).toBeGreaterThan(0);
      expect(TERM_BY_ID[term.id]).toBe(term);
    }
  });

  it('searches ignoring spaces and case', () => {
    expect(searchGlossary('').length).toBe(GLOSSARY.length);
    expect(searchGlossary('지정 가').map((t) => t.id)).toContain('limit_order');
    expect(searchGlossary('배당').map((t) => t.id)).toEqual(
      expect.arrayContaining(['dividend', 'ex_dividend', 'dividend_tax']),
    );
    expect(searchGlossary('없는용어xyz')).toEqual([]);
  });
});

describe('tutorial', () => {
  const base = createGame(11, 'easy', { type: 'endless' }, 0);
  const buy = (game: GameState) =>
    submitOrder(game, { stockId: 'HNEL', side: 'buy', type: 'market', quantity: 1 }).game;
  const sell = (game: GameState) =>
    submitOrder(game, { stockId: 'HNEL', side: 'sell', type: 'market', quantity: 1 }).game;
  const nextDay = (game: GameState) => {
    let next = game;
    for (let i = 0; i < TICKS_PER_DAY; i++) next = tickGame(next).game;
    return next;
  };

  it('has a message for every step', () => {
    for (const step of TUTORIAL_STEPS) expect(TUTORIAL_MESSAGES[step].title).toBeTruthy();
  });

  it('walks through the steps as the player acts', () => {
    let step = advanceTutorial('pick_stock', { pathname: '/market', game: base });
    expect(step).toBe('pick_stock');
    step = advanceTutorial(step, { pathname: '/stock/HNEL', game: base });
    expect(step).toBe('open_order');
    step = advanceTutorial(step, { pathname: '/order', game: base });
    expect(step).toBe('place_buy');

    const bought = buy(base);
    step = advanceTutorial(step, { pathname: '/stock/HNEL', game: bought });
    expect(step).toBe('advance_time');

    const later = nextDay(bought);
    step = advanceTutorial(step, { pathname: '/market', game: later });
    expect(step).toBe('sell');

    step = advanceTutorial(step, { pathname: '/stock/HNEL', game: sell(later) });
    expect(step).toBe('done');
    expect(advanceTutorial('done', { pathname: '/', game: base })).toBe('done');
  });

  it('skips ahead when the player already bought', () => {
    const bought = buy(base);
    expect(advanceTutorial('pick_stock', { pathname: '/market', game: bought })).toBe('advance_time');
    expect(advanceTutorial('open_order', { pathname: '/market', game: nextDay(bought) })).toBe('sell');
  });

  it('waits without a game', () => {
    expect(advanceTutorial('pick_stock', { pathname: '/stock/HNEL', game: null })).toBe('pick_stock');
  });
});
