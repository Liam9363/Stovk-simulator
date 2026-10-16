import AsyncStorage from '@react-native-async-storage/async-storage';

import { type GameState, SAVE_VERSION } from '@/engine/game';

const SAVE_KEY = 'stock-sim/current-game';

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const game = JSON.parse(raw) as GameState;
    // 저장 형식이 바뀌면 이전 세이브는 버린다 (추후 마이그레이션 추가).
    return game.version === SAVE_VERSION ? game : null;
  } catch (error) {
    console.warn('Failed to load game', error);
    return null;
  }
}

export async function saveGame(game: GameState | null): Promise<void> {
  try {
    if (game) {
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } else {
      await AsyncStorage.removeItem(SAVE_KEY);
    }
  } catch (error) {
    console.warn('Failed to save game', error);
  }
}
