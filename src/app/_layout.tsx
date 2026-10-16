import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NoticeToast } from '@/components/notice-toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameClock } from '@/hooks/use-game-clock';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

SplashScreen.preventAutoHideAsync();

/** 메뉴 화면에서는 시간이 흐르지 않는다. */
const MENU_PATHS = new Set(['/', '/new-game', '/result', '/records', '/achievements']);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const hydrated = useGameStore((s) => s.hydrated);
  const pathname = usePathname();

  const finishedRecordId = useGameStore((s) => s.finishedRecordId);

  useGameClock(hydrated && !MENU_PATHS.has(pathname));

  // 게임이 끝나면 쌓인 화면을 정리하고 결과 화면으로 보낸다.
  useEffect(() => {
    if (finishedRecordId === null) return;
    router.dismissTo('/');
    router.push({ pathname: '/result', params: { id: String(finishedRecordId), fresh: '1' } });
    useGameStore.getState().clearFinished();
  }, [finishedRecordId]);

  useEffect(() => {
    useGameStore
      .getState()
      .hydrate()
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (!hydrated) return null;

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.background, card: theme.background },
      }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="new-game" options={{ title: '새 게임' }} />
        <Stack.Screen name="(game)" options={{ headerShown: false }} />
        <Stack.Screen name="stock/[id]" options={{ title: '' }} />
        <Stack.Screen name="order" options={{ presentation: 'modal', title: '주문' }} />
        <Stack.Screen name="history" options={{ title: '거래 내역' }} />
        <Stack.Screen name="result" options={{ title: '게임 결과' }} />
        <Stack.Screen name="records" options={{ title: '지난 기록' }} />
        <Stack.Screen name="achievements" options={{ title: '업적' }} />
      </Stack>
      <NoticeToast />
    </ThemeProvider>
  );
}
