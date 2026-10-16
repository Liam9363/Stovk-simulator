import AsyncStorage from '@react-native-async-storage/async-storage';

import { type GameState, migrateGame } from '@/engine/game';

const SAVE_KEY = 'stock-sim/current-game';

export async function loadGame(): Promise<GameState | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    // 이전 버전 세이브는 현재 형식으로 변환하고, 알 수 없는 형식이면 버린다.
    return migrateGame(JSON.parse(raw));
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
