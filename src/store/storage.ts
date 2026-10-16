import AsyncStorage from '@react-native-async-storage/async-storage';

import { type GameState, migrateGame } from '@/engine/game';
import { type GameRecord } from '@/engine/records';
import { type TutorialStep } from '@/engine/tutorial';

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

const PROFILE_KEY = 'stock-sim/profile';

/** 게임 간에 누적되는 데이터: 지난 게임 기록과 업적. */
export type Profile = {
  records: GameRecord[];
  /** 업적 id → 달성 시각과 달성한 게임 id */
  achievements: Record<string, { at: number; gameId: number }>;
  /** 진행 중인 튜토리얼 단계 (없으면 null) */
  tutorial: TutorialStep | null;
  /** 튜토리얼을 끝냈거나 건너뛰었는지 */
  tutorialDone: boolean;
};

export const EMPTY_PROFILE: Profile = { records: [], achievements: {}, tutorial: null, tutorialDone: false };

export async function loadProfile(): Promise<Profile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const profile = JSON.parse(raw) as Partial<Profile>;
    return {
      records: profile.records ?? [],
      achievements: profile.achievements ?? {},
      tutorial: profile.tutorial ?? null,
      tutorialDone: profile.tutorialDone ?? false,
    };
  } catch (error) {
    console.warn('Failed to load profile', error);
    return EMPTY_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('Failed to save profile', error);
  }
}

/** 기록과 업적을 모두 지운다 (설정 > 전체 초기화). */
export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SAVE_KEY, PROFILE_KEY]);
  } catch (error) {
    console.warn('Failed to clear data', error);
  }
}
