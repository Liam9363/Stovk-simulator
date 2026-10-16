import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from '@/store/game-store';

/** 1x 배속에서 틱 간격 (ms). TICKS_PER_DAY와 함께 "1분 = 1거래일"을 만든다. */
const BASE_TICK_MS = 1000;

/**
 * 게임 시계. `enabled`이고 앱이 포그라운드이며 일시정지가 아닐 때만 시간이 흐른다.
 * 앱이 백그라운드로 가면 즉시 저장한다.
 */
export function useGameClock(enabled: boolean) {
  const hasGame = useGameStore((s) => s.game !== null);
  const paused = useGameStore((s) => s.paused);
  const speed = useGameStore((s) => s.speed);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setAppActive(active);
      if (!active) useGameStore.getState().save();
    });
    return () => subscription.remove();
  }, []);

  const running = enabled && hasGame && !paused && appActive;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => useGameStore.getState().tick(), BASE_TICK_MS / speed);
    return () => clearInterval(id);
  }, [running, speed]);

  return running;
}
